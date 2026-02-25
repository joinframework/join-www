---
title: "Allocator"
weight: 25
---

# Allocator

Join provides a **lock-free slab allocator** built on top of the memory backends.
The arena manages one or more fixed-size pools and dispatches allocations to the
smallest pool that can satisfy each request.

Arenas are:

* lock-free (ABA-safe tagged CAS on each pool's free-list)
* cache-line aligned (all chunk headers are naturally aligned)
* NUMA-aware and hugepage-capable (inherited from the memory backend)
* safe for concurrent use across threads and processes

They are available through two backend policies:

* **LocalMem** — anonymous private memory (single process)
* **ShmMem** — POSIX named shared memory (multi-process)

---

## Concepts

### Chunk

The smallest unit of allocation. Each chunk has a fixed `Size` (must be a power of 2
and a multiple of `alignof(std::max_align_t)`). Chunks are stored in a flat array
inside a pool segment and reused via a lock-free free-list.

### Pool

A `BasicPool<Count, Size>` manages `Count` chunks of `Size` bytes each over a
contiguous region of the backend memory. Allocation and deallocation are O(1) and
lock-free using an ABA-safe tagged index CAS.

### Arena

A `BasicArena<Backend, Count, Sizes...>` owns the memory backend and composes
multiple pools of increasing sizes. On allocation it selects the smallest pool whose
chunk size fits the request. If that pool is exhausted it **promotes** the request to
the next larger pool.

---

## Creating an arena

### Type aliases

Each memory backend exposes a convenient `Allocator` alias:

```cpp
LocalMem::Allocator<Count, Sizes...>
ShmMem::Allocator<Count, Sizes...>
```

These expand to `BasicArena<LocalMem, Count, Sizes...>` and
`BasicArena<ShmMem, Count, Sizes...>` respectively.

### Local arena (single process)

```cpp
#include <join/allocator.hpp>

using namespace join;

// 3 pools: 64 B, 256 B, 1024 B — 128 chunks each
LocalMem::Allocator<128, 64, 256, 1024> arena;
```

Pool sizes must be provided in **ascending order** and each must be a **power of 2**.

---

### Shared arena (multi-process)

```cpp
#include <join/allocator.hpp>

using namespace join;

ShmMem::Allocator<128, 64, 256, 1024> arena("/my_arena");
```

The first process to attach initializes all pools.
Subsequent processes reuse the existing layout — they wait (with exponential backoff)
until initialization is complete before accessing any pool.

⚠️ Call `ShmMem::unlink("/my_arena")` during application teardown.

---

## Allocating memory

### `allocate` — with pool promotion

Returns a chunk from the first pool whose size fits the request.
If that pool is exhausted, the request is promoted to the next larger pool.

```cpp
void* p = arena.allocate(48);   // uses the 64 B pool; falls back to 256 B if full
```

Returns `nullptr` if no pool can satisfy the request (all candidates exhausted).

---

### `tryAllocate` — without pool promotion

Returns a chunk only from the exact pool whose size fits, without promoting.
Returns `nullptr` if the exact pool is full, even if a larger pool has free chunks.

```cpp
void* p = arena.tryAllocate(48);  // uses the 64 B pool only
```

Use this when you need strict control over which pool is used, for example to
avoid unintentional memory pressure on larger pools.

---

## Deallocating memory

```cpp
arena.deallocate(p);
```

The arena walks its pools in order and returns the chunk to whichever pool owns it.
Passing `nullptr` is a no-op. Passing a pointer that does not belong to any pool
is silently ignored (base case of the recursive ownership check).

---

## NUMA binding and memory locking

These methods delegate directly to the underlying memory backend.

```cpp
// bind arena memory to NUMA node 0
if (arena.mbind(0) == -1)
{
    std::cerr << join::lastError.message() << "\n";
}

// lock arena memory in RAM
if (arena.mlock() == -1)
{
    std::cerr << join::lastError.message() << "\n";
}
```

---

## Size requirements

The total memory footprint of an arena is the sum of each pool's footprint:

```
per-pool = sizeof(SegmentHeader) + Count × sizeof(Chunk<Size>)
total    = Σ per-pool across all Sizes
```

The backend size is computed automatically at compile time — you do not need to
calculate or pass it manually.

---

## Constraints

| Constraint | Reason |
|---|---|
| `Size` must be a power of 2 | Enables aligned storage and fast index arithmetic |
| `Size ≥ sizeof(uint64_t)` | Free-list next-index is stored inside the chunk |
| `Size % alignof(std::max_align_t) == 0` | Guarantees safe placement of any type |
| `Sizes...` must be in ascending order | Enables the linear pool-selection scan |
| `Count ≤ UINT32_MAX` | Tagged index uses a 32-bit pool index |
| Element type must fit in `Size` | The caller is responsible for matching sizes to types |

---

## Error handling

`allocate` and `tryAllocate` return `nullptr` on failure — no exception is thrown.
`deallocate` is `noexcept`.

Constructor failures (backend `mmap` / `shm_open`) throw `std::system_error`.

---

## Move semantics

Arenas are **move-only** — copy construction and copy assignment are deleted.

```cpp
LocalMem::Allocator<128, 64, 256> a;
LocalMem::Allocator<128, 64, 256> b = std::move(a);  // a is now empty
```

---

## Complete example

```cpp
#include <join/allocator.hpp>

using namespace join;

struct Sample
{
    int32_t id;
    float   value;
};

static_assert (sizeof (Sample) <= 64);

int main ()
{
    // local arena: 1 pool of 64 B chunks, 256 slots
    LocalMem::Allocator<256, 64> arena;

    // pin to NUMA node 0 and lock in RAM
    arena.mbind (0);
    arena.mlock ();

    // allocate and construct
    void* raw = arena.allocate (sizeof (Sample));
    if (!raw)
    {
        return 1;  // pool exhausted
    }

    auto* s = new (raw) Sample{42, 3.14f};

    // use s ...

    // return to pool (no destructor called — type must be trivially destructible)
    arena.deallocate (s);
}
```

---

## Best practices

* Choose `Size` values that match the actual types you store — oversized chunks waste pool capacity
* Prefer `tryAllocate` in real-time paths to avoid silent promotion to a larger pool
* Use `allocate` when graceful degradation under pressure is acceptable
* On NUMA systems, call `mbind()` immediately after construction and before first use
* Use `mlock()` on latency-critical paths to prevent page faults
* For shared arenas, always call `ShmMem::unlink()` on teardown

---

## Summary

| Feature                    | LocalMem backend | ShmMem backend |
| -------------------------- | :--------------: | :------------: |
| Lock-free allocation       | ✅                | ✅              |
| Pool promotion             | ✅                | ✅              |
| No-promotion allocation    | ✅                | ✅              |
| Multiple pool sizes        | ✅                | ✅              |
| NUMA binding               | ✅                | ✅              |
| Memory locking             | ✅                | ✅              |
| Cross-process access       | ❌                | ✅              |
| Move semantics             | ✅                | ✅              |
| Compile-time size checking | ✅                | ✅              |
