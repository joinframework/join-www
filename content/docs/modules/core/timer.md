---

title: "Timer"
weight: 5
---

# Timer

Join provides **high‑resolution timers** integrated with the reactor/event loop.
Timers are built on top of Linux `timerfd` and expose a modern **C++ chrono‑based API**.

Timers are:

* non‑blocking
* event‑driven
* safe to use with the Join reactor

They are available through two clock policies:

* **Monotonic**
* **RealTime**

---

## Timer types

### Monotonic timers

Monotonic timers use `CLOCK_MONOTONIC` and are **not affected by system time changes**.

```cpp
Monotonic::Timer timer;
```

### Real‑time timers

Real‑time timers use `CLOCK_REALTIME` and are affected by system clock adjustments.

```cpp
RealTime::Timer timer;
```

---

## One‑shot timer

A one‑shot timer fires **once** after a given duration.

### Example: fire once after 1 second

```cpp
#include <join/timer.hpp>

using join;

Monotonic::Timer timer;

timer.setOneShot(std::chrono::seconds(1), [](){
    ...
});
```

---

## One‑shot timer (absolute time)

You can also arm a one‑shot timer at an **absolute time point**.

### Example: fire at a specific time

```cpp
#include <join/timer.hpp>

using join;

RealTime::Timer timer;

auto deadline = std::chrono::system_clock::now() + std::chrono::seconds(5);

timer.setOneShot(deadline, [](){
    ...
});
```

⚠️ The clock type **must match** the timer policy:

* `RealTime` → `system_clock`
* `Monotonic` → `steady_clock`

---

## Periodic timer

A periodic timer fires repeatedly at a fixed interval.

### Example: periodic timer every 500 ms

```cpp
#include <join/timer.hpp>

using join;

Monotonic::Timer timer;

timer.setInterval(std::chrono::milliseconds(500), [](){
    ...
});
```

The callback is executed **once per expiration**. If the reactor is delayed and multiple expirations occur, the callback is invoked multiple times accordingly.

---

## Cancel a timer

Timers can be canceled at any time.

```cpp
timer.cancel();
```

After cancellation:

* the timer is disarmed
* no further callbacks are triggered

---

## Timer state inspection

### Check if a timer is active

```cpp
if (timer.active()) {
    ...
}
```

### Remaining time before expiration

```cpp
auto remaining = timer.remaining();
```

### Interval of a periodic timer

```cpp
auto interval = timer.interval();
```

Returns zero if the timer is one‑shot or inactive.

---

## Reactor integration

Timers are automatically registered in the Join reactor:

* no manual polling
* callbacks are executed from the event loop

```text
Reactor
 ├─ Socket handlers
 ├─ Signal handlers
 └─ Timer handlers
```

Timers inherit from `EventHandler` and are triggered when their file descriptor becomes readable.

---

## Best practices

* Prefer **Monotonic timers** for delays and intervals
* Use **RealTime timers** only for wall‑clock scheduling
* Keep callbacks **short and non‑blocking**
* Cancel timers explicitly when no longer needed

---

## Summary

| Feature               | Supported |
| --------------------- | --------- |
| One‑shot timers       | ✅         |
| Periodic timers       | ✅         |
| Absolute time         | ✅         |
| Reactor integration   | ✅         |
| Nanosecond resolution | ✅         |
