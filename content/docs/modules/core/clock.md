---

title: "Clock"
weight: 170
---

# Clock

Join provides **clock policies** that abstract time sources for use with `BasicTimer` and `BasicStats`. Each policy exposes a consistent interface so that timers and statistics collectors can be parameterized independently of the underlying hardware or OS clock.

```cpp
#include <join/clock.hpp>

using namespace join;
```

---

## Available policies

### Monotonic

Reads `CLOCK_MONOTONIC` via `clock_gettime`. Adjusted by NTP (no sudden jumps, but frequency may be corrected). Recommended default for timers and latency measurements.

```cpp
Monotonic::TimePoint t = Monotonic::now();
```

Provides: `Timer`, `Stats`, `now()`.

```cpp
using MonoTimer = Monotonic::Timer;
using MonoStats = Monotonic::Stats;
```

### MonotonicRaw

Reads `CLOCK_MONOTONIC_RAW` via `clock_gettime`. Raw hardware clock — never adjusted by NTP. May drift relative to wall time but gives a purer view of elapsed CPU time.

```cpp
MonotonicRaw::TimePoint t = MonotonicRaw::now();
```

Provides: `Stats`, `now()`. No `Timer` alias.

```cpp
using RawStats = MonotonicRaw::Stats;
```

### RealTime

Reads `CLOCK_REALTIME`. Wall-clock time, adjusted by NTP and settable by root. Use when you need timestamps correlated with calendar time (e.g. for scheduled events, log timestamps).

```cpp
// RealTime has no now() — used only as a clock type tag for BasicTimer
using WallTimer = RealTime::Timer;
```

Provides: `Timer` only. No `Stats`, no `now()`.

### Rdtsc

Reads the CPU cycle counter directly (`RDTSC` on x86-64, `CNTVCT_EL0` on AArch64) and converts to nanoseconds via a fixed-point multiplier calibrated once against `CLOCK_MONOTONIC`.

```cpp
Rdtsc::TimePoint t = Rdtsc::now();
```

Provides: `Stats`, `now()`. No `Timer` alias.

```cpp
using RdtscStats = Rdtsc::Stats;
```

Calibration runs once globally via `std::call_once` at the first `Rdtsc` instance construction. It sleeps 100 ms and measures the ratio of cycles to nanoseconds. The multiplier is stored as a 32.32 fixed-point value for fast conversion.

⚠️ `Rdtsc` requires an **invariant TSC** (constant frequency regardless of CPU power state). On modern x86-64 systems this is the default. On AArch64 it uses the virtual counter `CNTVCT_EL0` which is similarly invariant. For accurate results, **pin the measuring thread to a single core** to avoid TSC skew across sockets.

---

## Using clock policies with Statistics

```cpp
#include <join/statistics.hpp>

using namespace join;

// CLOCK_MONOTONIC — general purpose
Monotonic::Stats stats("latency");

// CLOCK_MONOTONIC_RAW — raw hardware clock
MonotonicRaw::Stats rawStats("latency_raw");

// RDTSC — lowest overhead for tight loops
Rdtsc::Stats rdtscStats("latency_rdtsc");

auto t = stats.start();
// ... work ...
stats.stop(t);
```

---

## Using clock policies with Timers

```cpp
#include <join/timer.hpp>

using namespace join;

// CLOCK_MONOTONIC timer (recommended)
Monotonic::Timer timer;

// CLOCK_REALTIME timer (wall-clock scheduled events)
RealTime::Timer wallTimer;
```

`MonotonicRaw` and `Rdtsc` do not provide a `Timer` alias — they are for measurement only.

---

## Clock policy interface

All policies that expose `now()` share the same types:

```cpp
using Duration  = std::chrono::nanoseconds;
using TimePoint = std::chrono::time_point<NanoClock>;

static TimePoint now() noexcept;
```

Timer policies additionally expose:

```cpp
static constexpr int type() noexcept; // POSIX clock id (CLOCK_MONOTONIC, CLOCK_REALTIME…)
```

---

## Choosing a clock policy

| Policy | Source | Timer | Stats | Adjusted by NTP | Use case |
|--------|--------|:-----:|:-----:|:---------------:|---------|
| `Monotonic` | `CLOCK_MONOTONIC` | ✅ | ✅ | ✅ (freq only) | General purpose — timers, latency |
| `MonotonicRaw` | `CLOCK_MONOTONIC_RAW` | ❌ | ✅ | ❌ | Raw elapsed time, no NTP interference |
| `RealTime` | `CLOCK_REALTIME` | ✅ | ❌ | ✅ (jumps possible) | Wall-clock scheduled events |
| `Rdtsc` | RDTSC / CNTVCT_EL0 | ❌ | ✅ | ❌ | Lowest overhead tight-loop measurement |

For latency benchmarking prefer `Rdtsc` when overhead matters, `Monotonic` otherwise. Use `RealTime` only when calendar correlation is required.
