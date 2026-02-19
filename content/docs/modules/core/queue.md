---

title: "Queue"
weight: 30
---

# Queue

Join provides **lock-free ring buffer queues** built on top of the memory backends.
Queues are built on top of atomic operations and expose a modern **C++ template-based API**.

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

The fastest policy. No atomic contention on either side.

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
Any memory provider can be combined with any sync policy via the type aliases defined on the backend:

| Backend alias         | Underlying memory        |
| --------------------- | ------------------------ |
| `LocalMem::Spsc`      | Anonymous private memory |
| `LocalMem::Mpsc`      | Anonymous private memory |
| `LocalMem::Mpmc`      | Anonymous private memory |
| `ShmMem::Spsc`        | POSIX shared memory      |
| `ShmMem::Mpsc`        | POSIX shared memory      |
| `ShmMem::Mpmc`        | POSIX shared memory      |

---

## Type constraints

The element type must satisfy two requirements:

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

---

### Shared queue (inter-process)

```cpp
#include <join/queue.hpp>

using namespace join;

ShmMem::Mpmc::Queue<Sample> queue(1024, "/my_queue");
```

The first process to attach initializes the queue.
Subsequent processes verify that the capacity matches and wait for initialization to complete.

⚠️ Call `ShmMem::unlink("/my_queue")` during application teardown to remove the segment.

---

## Pushing elements

### Non-blocking push

Returns immediately with `-1` if the queue is full.

```cpp
Sample s{1, 3.14f};

if (queue.tryPush(s) == -1)
{
    // check join::lastError — Errc::TemporaryError means full
}
```

### Blocking push

Spins with exponential backoff until a slot is available.

```cpp
if (queue.push(s) == -1)
{
    // fatal error
}
```

---

## Popping elements

### Non-blocking pop

Returns immediately with `-1` if the queue is empty.

```cpp
Sample out;

if (queue.tryPop(out) == -1)
{
    // check join::lastError — Errc::TemporaryError means empty
}
```

### Blocking pop

Spins with exponential backoff until an element is available.

```cpp
Sample out;

if (queue.pop(out) == -1)
{
    // fatal error
}
```

---

## Queue state inspection

### Number of elements pending

```cpp
uint64_t n = queue.pending();
```

### Number of slots available for writing

```cpp
uint64_t n = queue.available();
```

### Check if full or empty

```cpp
if (queue.full())  { /* no room to push */ }
if (queue.empty()) { /* nothing to pop  */ }
```

---

## NUMA binding and memory locking

These methods delegate directly to the underlying memory backend.

```cpp
// bind queue memory to NUMA node 0
queue.mbind(0);

// lock queue memory in RAM
queue.mlock();
```

---

## Error handling

Functions returning `-1` set `join::lastError`:

* `Errc::TemporaryError` — queue is full (push) or empty (pop); retry is safe
* `Errc::InvalidParam` — internal segment pointer is null (should not occur in normal use)

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

* Prefer **Spsc** whenever the producer/consumer pattern allows it — it has zero atomic contention
* Use **Mpsc** when multiple threads feed a single processing thread
* Use **Mpmc** only when both sides need to scale across threads
* Use `tryPush` / `tryPop` in real-time contexts to avoid unbounded spin
* Use `push` / `pop` when latency is not a concern and blocking is acceptable
* Use **ShmMem** backends for inter-process queues; call `ShmMem::unlink()` on teardown

---

## Summary

| Feature                    | Spsc | Mpsc | Mpmc |
| -------------------------- | :--: | :--: | :--: |
| Lock-free                  | ✅    | ✅    | ✅    |
| Multiple producers         | ❌    | ✅    | ✅    |
| Multiple consumers         | ❌    | ❌    | ✅    |
| Lowest overhead            | ✅    | ➖    | ➖    |
| Local memory backend       | ✅    | ✅    | ✅    |
| Shared memory backend      | ✅    | ✅    | ✅    |
| NUMA binding               | ✅    | ✅    | ✅    |
| Memory locking             | ✅    | ✅    | ✅    |
| Blocking push/pop          | ✅    | ✅    | ✅    |
| Non-blocking push/pop      | ✅    | ✅    | ✅    |
