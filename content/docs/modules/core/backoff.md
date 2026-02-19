---

title: "Backoff"
weight: 35
---

# Backoff

Join provides an **adaptive backoff strategy** for busy-wait loops.
The `Backoff` class is used internally by the queue push and pop operations, and can be used directly in any spin-wait context.

The strategy is:

* architecture-aware
* adaptive (spin then yield)
* lightweight with no heap allocation

---

## Strategy overview

`Backoff` implements a two-phase wait strategy:

1. **Spin phase** — executes CPU pause/yield hints for a configurable number of iterations, reducing power consumption and pipeline pressure without releasing the thread.
2. **Yield phase** — once the spin budget is exhausted, calls `std::this_thread::yield()` to allow the OS scheduler to run other threads.

```text
iteration 0 → N-1  :  _mm_pause / yield hint  (spin)
iteration N+       :  std::this_thread::yield  (cooperative)
```

---

## Architecture support

The spin hint is automatically selected at compile time:

| Architecture        | Instruction                  |
| ------------------- | ---------------------------- |
| x86 / x86-64        | `_mm_pause()`                |
| ARM / AArch64       | `yield` (inline assembly)    |
| Other               | no-op (yield phase only)     |

---

## Basic usage

```cpp
#include <join/backoff.hpp>

using namespace join;

Backoff backoff;

while (!condition())
{
    backoff();
}
```

Each call to `operator()` advances the backoff state by one step.

---

## Custom spin budget

The default spin budget is **200 iterations** before switching to `std::this_thread::yield()`.
It can be adjusted at construction time:

```cpp
Backoff backoff(500);   // spin 500 times before yielding
Backoff backoff(0);     // yield immediately on every call
```

A higher spin budget reduces latency when the wait is short, at the cost of higher CPU usage.
A lower spin budget is more CPU-friendly for longer or unpredictable waits.

---

## Resetting the backoff

After a successful operation, reset the backoff to restart the spin phase from scratch:

```cpp
Backoff backoff;

while (true)
{
    if (tryAcquire())
    {
        backoff.reset();  // restart spin phase for next wait
        // ... process ...
    }
    else
    {
        backoff();
    }
}
```

---

## Integration with queues

`Backoff` is used internally by `BasicQueue::push()` and `BasicQueue::pop()` to implement blocking operations:

```cpp
int push(const Type& element) noexcept
{
    Backoff backoff;

    while (tryPush(element) == -1)
    {
        backoff();
    }

    return 0;
}
```

When writing custom producers or consumers that loop on `tryPush` / `tryPop`, it is recommended to use `Backoff` explicitly rather than a bare spin loop.

---

## Best practices

* Use `Backoff` in any busy-wait loop instead of a plain `while` spin
* Tune the spin count to match the expected wait duration — short waits benefit from a higher spin budget
* Always call `reset()` after a successful acquire if the backoff instance is reused across iterations
* Prefer the default spin count of 200 as a safe starting point for most use cases

---

## Summary

| Feature                  | Supported         |
| ------------------------ | :---------------: |
| x86 pause hint           | ✅                 |
| ARM yield hint           | ✅                 |
| Cooperative yield        | ✅                 |
| Configurable spin budget | ✅                 |
| Reset support            | ✅                 |
| Heap allocation          | ❌ (stack only)    |
