---

title: "Timer"
weight: 170
---

# Timer

Join provides **high-resolution timers** integrated with the reactor/event loop.
Timers are built on top of Linux `timerfd` and expose a modern **C++ chrono-based API**.

Timers are:

* non-blocking
* event-driven
* reactor-integrated — registered automatically on construction

They are available through two clock policies:

* **Monotonic** — unaffected by system time changes
* **RealTime** — tracks the wall clock

---

## Timer types

### Monotonic timers

Monotonic timers use `CLOCK_MONOTONIC` and are the recommended choice for delays and intervals.

```cpp
Monotonic::Timer timer;
```

### Real-time timers

Real-time timers use `CLOCK_REALTIME` and follow system clock adjustments.

```cpp
RealTime::Timer timer;
```

---

## Reactor integration

Timers inherit from `EventHandler` and register themselves with the reactor automatically at construction.
By default they use the global `ReactorThread` singleton, but a custom `Reactor*` can be passed:

```cpp
// default: uses ReactorThread::reactor()
Monotonic::Timer timer;

// custom reactor
Reactor myReactor;
Monotonic::Timer timer(&myReactor);
```

The timer unregisters itself from the reactor in its destructor.
Timers are neither copyable nor movable.

---

## One-shot timer

A one-shot timer fires **once** after a given duration.

```cpp
#include <join/timer.hpp>

using namespace join;

Monotonic::Timer timer;

timer.setOneShot(std::chrono::seconds(1), []() {
    // called once after 1 second
});
```

---

## One-shot timer (absolute time)

A one-shot timer can also be armed at an **absolute time point**.

```cpp
RealTime::Timer timer;

auto deadline = std::chrono::system_clock::now() + std::chrono::seconds(5);

timer.setOneShot(deadline, []() {
    // called at the deadline
});
```

⚠️ The clock type **must match** the timer policy — enforced at compile time:

| Policy     | Expected clock                    |
| ---------- | --------------------------------- |
| `Monotonic` | `std::chrono::steady_clock`      |
| `RealTime`  | `std::chrono::system_clock`      |

A mismatch produces a `static_assert` error.

---

## Periodic timer

A periodic timer fires repeatedly at a fixed interval.

```cpp
Monotonic::Timer timer;

timer.setInterval(std::chrono::milliseconds(500), []() {
    // called every 500 ms
});
```

The callback is invoked **once per expiration**. If the reactor is delayed and multiple expirations have accumulated, the callback is called once for each missed expiration.

---

## Cancel a timer

```cpp
timer.cancel();
```

After cancellation the timer is disarmed, the callback is cleared, and no further calls are made.

---

## Timer state inspection

### Check if the timer is armed

```cpp
if (timer.active())
{
    // timer is running
}
```

`active()` queries the kernel via `timerfd_gettime` — it returns `true` if either the initial value or the interval is non-zero.

### Remaining time before next expiration

```cpp
std::chrono::nanoseconds rem = timer.remaining();
```

### Interval of a periodic timer

```cpp
std::chrono::nanoseconds iv = timer.interval();
```

Returns zero for one-shot timers or after cancellation.

### Check if the timer is one-shot

```cpp
bool os = timer.oneShot();
```

### Clock type

```cpp
int clockId = timer.type();  // CLOCK_MONOTONIC or CLOCK_REALTIME
```

---

## Best practices

* Prefer **Monotonic timers** for delays and intervals — immune to NTP or `settimeofday` adjustments
* Use **RealTime timers** only for wall-clock scheduling
* Keep callbacks **short and non-blocking** — they execute on the reactor dispatcher thread
* **Cancel timers explicitly** when no longer needed, before their owning object is destroyed

---

## Summary

| Feature                  | Supported |
| ------------------------ | :-------: |
| One-shot timers          | ✅         |
| Periodic timers          | ✅         |
| Absolute time point      | ✅         |
| Clock/policy type check  | ✅ (static_assert) |
| Reactor integration      | ✅         |
| Custom reactor           | ✅         |
| Nanosecond resolution    | ✅         |
| Missed expiration replay | ✅         |
