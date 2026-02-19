---

title: "Memory"
weight: 20
---

# Memory

Join provides **memory backends** for local and shared use cases.
Memory segments are built on top of Linux `mmap` and expose a modern **C++ RAII‑based API**.

Memory providers are:

* zero-copy
* NUMA-aware
* hugepage-capable

They are available through two backend policies:

* **LocalMem** — anonymous private memory
* **ShmMem** — POSIX named shared memory

---

## Memory types

### Local anonymous memory

`LocalMem` allocates a private anonymous memory segment visible only to the current process.

```cpp
LocalMem mem(size);
```

### POSIX shared memory

`ShmMem` creates or opens a named shared memory segment accessible across processes.

```cpp
ShmMem mem(size, "/my_segment");
```

---

## Creating memory

### Local memory

```cpp
#include <join/memory.hpp>

using namespace join;

LocalMem mem(4096);
```

The size is automatically rounded up to the next page boundary.
The allocator first attempts to use **hugepages** for better TLB performance, and falls back to standard pages if unavailable.

---

### Shared memory

```cpp
#include <join/memory.hpp>

using namespace join;

ShmMem mem(4096, "/my_segment");
```

If the named segment already exists, it is opened and its size is verified.
If it does not exist, it is created and initialized.

⚠️ The segment must be **explicitly unlinked** when no longer needed — it persists across process restarts otherwise.

---

## Accessing memory

Use `get()` to obtain a pointer to the mapped memory at a given byte offset.

```cpp
void* ptr = mem.get();         // pointer to the start
void* ptr = mem.get(64);       // pointer at offset 64
```

A `const` overload is available for read-only access:

```cpp
const void* ptr = mem.get(0);
```

`get()` throws:

* `std::runtime_error` — if the memory is not mapped
* `std::out_of_range` — if the offset exceeds the segment size

---

## NUMA binding

Memory can be bound to a specific NUMA node to reduce latency on multi-socket systems.

```cpp
if (mem.mbind(0) == -1)
{
    // check join::lastError
}
```

Alternatively, use the standalone function:

```cpp
join::mbind(ptr, size, numaNode);
```

---

## Locking memory in RAM

Prevent the OS from swapping the memory segment to disk.

```cpp
if (mem.mlock() == -1)
{
    // check join::lastError
}
```

Alternatively, use the standalone function:

```cpp
join::mlock(ptr, size);
```

⚠️ Locking large amounts of memory requires appropriate system privileges (`CAP_IPC_LOCK` or a sufficient `RLIMIT_MEMLOCK`).

---

## Unlinking shared memory

When a `ShmMem` segment is no longer needed, unlink it to remove the name from the system.

```cpp
ShmMem::unlink("/my_segment");
```

This is a static method and does not require an existing instance.
If the segment does not exist, the call succeeds silently.

---

## Move semantics

Both `LocalMem` and `ShmMem` are **move-only** — copy construction and copy assignment are deleted.

```cpp
LocalMem a(4096);
LocalMem b = std::move(a);  // a is now empty
```

---

## Sync policy binding

Both backends expose convenience type aliases for building lock-free queues on top of the memory segment:

```cpp
LocalMem::Spsc  // single-producer / single-consumer
LocalMem::Mpsc  // multi-producer  / single-consumer
LocalMem::Mpmc  // multi-producer  / multi-consumer

ShmMem::Spsc
ShmMem::Mpsc
ShmMem::Mpmc
```

---

## Error handling

Functions that return `-1` on failure set `join::lastError` with a `std::error_code`.

```cpp
if (mem.mbind(0) == -1)
{
    std::cerr << join::lastError.message() << "\n";
}
```

Constructors throw `std::system_error` on `mmap` or `shm_open` failure.

---

## Best practices

* Prefer **LocalMem** for single-process, low-latency buffers
* Use **ShmMem** for inter-process communication
* Always call `ShmMem::unlink()` during application teardown
* Use `mbind()` on NUMA systems to pin memory close to the consuming CPU
* Use `mlock()` for latency-critical paths where page faults are unacceptable
* Keep segment sizes **page-aligned** — the API handles rounding automatically

---

## Summary

| Feature                  | LocalMem | ShmMem |
| ------------------------ | :------: | :----: |
| Anonymous mapping        | ✅        | ❌      |
| Named shared mapping     | ❌        | ✅      |
| Hugepage support         | ✅        | ✅      |
| NUMA binding             | ✅        | ✅      |
| Memory locking           | ✅        | ✅      |
| Cross-process access     | ❌        | ✅      |
| Move semantics           | ✅        | ✅      |
| Sync policy binding      | ✅        | ✅      |
