---

title: "Queue"
weight: 30
---

# Queue

Join provides **lock-free ring buffer queues** built on top of the memory backends.
Queues are built on atomic operations and expose a modern **C++ template-based API**.

Queues are:

* lock-free
* cache-friendly (cache-line aligned slots)
* NUMA-aware (inherited from the memory backend)

They are available through three synchronization policies:

* **Spsc** — single-producer / single-consumer
* **Mpsc** — multi-producer / single-consumer
* **Mpmc** — multi-producer / multi-consumer

---

## Queue types

### Spsc — single-producer / single-consumer

The fastest policy. No atomic contention on either side. Uses `QueueSlotLight` (no sequence number overhead).

```cpp
LocalMem::Spsc::Queue<MyStruct> queue(capacity);
```

### Mpsc — multi-producer / single-consumer

Multiple threads may push concurrently; only one thread may pop.

```cpp
LocalMem::Mpsc::Queue<MyStruct> queue(capacity);
```

### Mpmc — multi-producer / multi-consumer

Multiple threads may push and pop concurrently.

```cpp
LocalMem::Mpmc::Queue<MyStruct> queue(capacity);
```

---

## Memory backends

Queues are decoupled from the memory backend.
Any memory provider can be combined with any sync policy:

| Backend alias    | Underlying memory        |
| ---------------- | ------------------------ |
| `LocalMem::Spsc` | Anonymous private memory |
| `LocalMem::Mpsc` | Anonymous private memory |
| `LocalMem::Mpmc` | Anonymous private memory |
| `ShmMem::Spsc`   | POSIX shared memory      |
| `ShmMem::Mpsc`   | POSIX shared memory      |
| `ShmMem::Mpmc`   | POSIX shared memory      |

---

## Type constraints

The element type must be:

* **trivially copyable** — elements are copied by value into slots
* **trivially destructible** — no destructor is called on eviction

```cpp
// ✅ Valid
struct Sample { int32_t id; float value; };

// ❌ Invalid — std::string is not trivially copyable
LocalMem::Spsc::Queue<std::string> queue(64);
```

---

## Creating a queue

### Local queue (single process)

```cpp
#include <join/queue.hpp>

using namespace join;

LocalMem::Spsc::Queue<Sample> queue(1024);
```

The capacity is automatically rounded up to the **next power of 2** for fast modulo via bitmask.

### Shared queue (inter-process)

```cpp
ShmMem::Mpmc::Queue<Sample> queue(1024, "/my_queue");
```

The first process to attach initializes the queue. Subsequent processes verify that the capacity matches and wait for initialization to complete.

⚠️ Call `ShmMem::unlink("/my_queue")` during application teardown to remove the segment.

---

## Pushing elements

### Single element — non-blocking

Returns immediately with `-1` if the queue is full (`Errc::TemporaryError`).

```cpp
Sample s{1, 3.14f};

if (queue.tryPush(s) == -1)
{
    // lastError == Errc::TemporaryError → queue full, retry later
}
```

### Single element — blocking

Spins with exponential backoff until a slot is available.

```cpp
if (queue.push(s) == -1)
{
    // fatal error
}
```

### Batch — non-blocking

Pushes as many elements as fit in one call. Returns the number of elements actually written, or `-1` on error.

```cpp
Sample buf[64];
// ... fill buf ...

ssize_t n = queue.tryPush(buf, 64);
if (n == -1)
{
    // lastError == Errc::TemporaryError → queue full
}
else
{
    // n elements pushed (may be < 64 if queue was nearly full)
}
```

### Batch — blocking

Loops until all `size` elements have been pushed, backing off when the queue is temporarily full.

```cpp
if (queue.push(buf, 64) == -1)
{
    // fatal error
}
```

---

## Popping elements

### Single element — non-blocking

Returns immediately with `-1` if the queue is empty (`Errc::TemporaryError`).

```cpp
Sample out;

if (queue.tryPop(out) == -1)
{
    // lastError == Errc::TemporaryError → queue empty, retry later
}
```

### Single element — blocking

Spins with exponential backoff until an element is available.

```cpp
Sample out;

if (queue.pop(out) == -1)
{
    // fatal error
}
```

### Batch — non-blocking

Pops up to `size` elements in one call. Returns the number actually read, or `-1` on error.

```cpp
Sample out[64];

ssize_t n = queue.tryPop(out, 64);
if (n == -1)
{
    // lastError == Errc::TemporaryError → queue empty
}
else
{
    // n elements popped (may be < 64)
}
```

### Batch — blocking

Loops until all `size` elements have been popped.

```cpp
Sample out[64];

if (queue.pop(out, 64) == -1)
{
    // fatal error
}
```

---

## Queue state inspection

```cpp
uint64_t n = queue.pending();    // elements waiting to be consumed
uint64_t n = queue.available();  // slots available for writing

if (queue.full())  { /* no room to push */ }
if (queue.empty()) { /* nothing to pop  */ }
```

---

## NUMA binding and memory locking

```cpp
// bind queue memory to NUMA node 0 (requires JOIN_HAS_NUMA)
queue.mbind(0);

// lock queue memory in RAM (prevent paging)
queue.mlock();
```

---

## Move semantics

`BasicQueue` is **neither copyable nor movable**. Queues must be constructed in-place.

```cpp
// ❌ Does not compile
LocalMem::Spsc::Queue<Sample> a(1024);
LocalMem::Spsc::Queue<Sample> b = std::move(a);

// ✅ Share via pointer
auto queue = std::make_unique<LocalMem::Spsc::Queue<Sample>>(1024);
```

---

## Error handling

Functions returning `-1` set `join::lastError`:

* `Errc::TemporaryError` — queue full (push) or empty (pop); retry is safe
* `Errc::InvalidParam` — null buffer pointer or zero size passed to batch variants

```cpp
if (queue.tryPush(s) == -1)
{
    if (join::lastError == join::Errc::TemporaryError)
    {
        // queue full, try again later
    }
    else
    {
        std::cerr << join::lastError.message() << "\n";
    }
}
```

---

## Best practices

* Prefer **Spsc** whenever the producer/consumer pattern allows it — zero atomic contention
* Use **Mpsc** when multiple threads feed a single processing thread
* Use **Mpmc** only when both sides need to scale across threads
* Use **batch push/pop** (`tryPush(buf, n)` / `tryPop(buf, n)`) to amortize atomic operations in throughput-oriented paths
* Use `tryPush` / `tryPop` in real-time contexts to avoid unbounded spin
* Use `push` / `pop` when blocking is acceptable
* Use **ShmMem** backends for inter-process queues; call `ShmMem::unlink()` on teardown
* Construct queues in-place or wrap in `std::unique_ptr` — they cannot be moved or copied

---

## Summary

| Feature               | Spsc | Mpsc | Mpmc |
| --------------------- | :--: | :--: | :--: |
| Lock-free             | ✅   | ✅   | ✅   |
| Multiple producers    | ❌   | ✅   | ✅   |
| Multiple consumers    | ❌   | ❌   | ✅   |
| Lowest overhead       | ✅   | ➖   | ➖   |
| Single push/pop       | ✅   | ✅   | ✅   |
| Batch push/pop        | ✅   | ✅   | ✅   |
| Blocking push/pop     | ✅   | ✅   | ✅   |
| Non-blocking push/pop | ✅   | ✅   | ✅   |
| Local memory backend  | ✅   | ✅   | ✅   |
| Shared memory backend | ✅   | ✅   | ✅   |
| NUMA binding          | ✅   | ✅   | ✅   |
| Memory locking        | ✅   | ✅   | ✅   |
| Move semantics        | ❌   | ❌   | ❌   |
