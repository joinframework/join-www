---

title: "Statistics"
weight: 174
---

# Statistics

Join provides a **lock-free, multi-producer-safe performance statistics collector** built on an HDR (High Dynamic Range) histogram. It measures latency intervals, computes aggregates (min, mean, max, percentiles), and reports throughput — all without mutexes.

Three clock policies expose a `Stats` alias:

```cpp
#include <join/statistics.hpp>

using namespace join;

// CLOCK_MONOTONIC (recommended general purpose)
Monotonic::Stats stats("my_op");

// CLOCK_MONOTONIC_RAW (raw hardware, no NTP adjustment)
MonotonicRaw::Stats stats("my_op");

// RDTSC / CNTVCT_EL0 (lowest overhead, requires invariant TSC)
Rdtsc::Stats stats("my_op");
```

---

## Creating a collector

```cpp
Stats stats("my_operation");

// Anonymous collector (no name)
Stats stats;
```

`BasicStats` is neither copyable nor movable — construct in-place or behind a pointer.

---

## Measuring intervals

### Manual start / stop

```cpp
auto t = stats.start();

// ... work ...

stats.stop(t);
```

`start()` captures a timestamp. `stop()` computes the elapsed duration, updates all aggregates atomically, and increments the sample counter.

Both methods are safe to call from multiple threads simultaneously — `stop()` uses only relaxed/release atomics and CAS loops.

### RAII guard — ScopedStats

`ScopedStats` calls `start()` on construction and `stop()` on destruction:

```cpp
{
    ScopedStats<Stats> guard(stats);
    // ... work ...
}   // stop() called here automatically
```

`ScopedStats` is neither copyable nor movable.

---

## Reading aggregates

All accessors return zero if no sample has been recorded yet.

```cpp
uint64_t n   = stats.count();       // number of completed intervals
Duration last = stats.last();       // most recent interval
Duration min  = stats.min();        // minimum observed
Duration max  = stats.max();        // maximum observed

// mean returns double-precision nanoseconds
std::chrono::duration<double, std::nano> mean = stats.mean();

// throughput in ops/s
double thr = stats.throughput();
```

### Percentiles (HDR histogram)

```cpp
Duration p50 = stats.percentile(50.0);
Duration p90 = stats.percentile(90.0);
Duration p99 = stats.percentile(99.0);
Duration p999 = stats.percentile(99.9);
```

The histogram has a resolution of ~0.8% relative error across its full range (HDR, 8-bit sub-bucket magnitude). The maximum trackable value is approximately 68 seconds (`2^30` nanoseconds). Samples exceeding this are clamped to the overflow bucket.

---

## Resetting

```cpp
stats.reset();
```

Resets all atomics to their initial state (count, last, sum = 0; min = UINT64_MAX; max = 0; all histogram buckets = 0).

---

## Streaming output

`BasicStats` has an `operator<<` that prints a formatted row. Use `statsHeader` to print the column headers first:

```cpp
std::cout << usec << kops;          // set display units (sticky on the stream)
std::cout << statsHeader << "\n";
std::cout << stats << "\n";
```

Example output:

```
Metric                        Count          Throughput             Min            Mean             Max             P50             P90             P99
------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
my_operation               1000000     423.5 (Kops/s)      1.2 (us)      2.4 (us)      9.1 (us)      2.1 (us)      3.8 (us)      7.3 (us)
```

### Latency unit manipulators (sticky)

| Manipulator | Unit |
|-------------|------|
| `nsec`  | nanoseconds  |
| `usec`  | microseconds |
| `msec`  | milliseconds |
| `sec`   | seconds      |

### Throughput unit manipulators (sticky)

| Manipulator | Unit |
|-------------|------|
| `ops`   | ops/s   |
| `kops`  | Kops/s  |
| `mops`  | Mops/s  |
| `gops`  | Gops/s  |

Units are stored on the stream via `std::ios_base::iword` and persist across multiple `<<` calls on the same stream. The default if no manipulator has been applied is `nsec` / `ops`.

---

## Memory management

The HDR histogram counters are backed by a `LocalMem` mmap region. This region can be bound to a NUMA node or locked in RAM:

```cpp
// requires JOIN_HAS_NUMA
stats.mbind(0);

// lock histogram memory in RAM
stats.mlock();
```

---

## Clock policies

| Policy | Source | Notes |
|--------|--------|-------|
| `Monotonic` | `CLOCK_MONOTONIC` | General purpose, NTP frequency-adjusted, ~20–50 ns overhead |
| `MonotonicRaw` | `CLOCK_MONOTONIC_RAW` | Raw hardware clock, no NTP adjustment |
| `Rdtsc` | `RDTSC` / `CNTVCT_EL0` + fixed-point calibration | Lowest overhead, requires invariant TSC, calibrated once at first construction |

`Rdtsc` performs a one-time calibration via `std::call_once` at the first construction, sleeping 100 ms to measure the cycle-to-nanosecond ratio. It is suitable for tight loops where `clock_gettime` overhead is measurable. Requires the measuring thread to be pinned to a single core for accurate results.

---

## Thread safety

`stop()` is fully safe to call from multiple producers simultaneously. All updates use atomic operations:
- `_sum`, `_last` — `fetch_add` / `store` relaxed
- `_min`, `_max` — CAS loop with relaxed ordering
- histogram bucket — `fetch_add` relaxed
- `_count` — `fetch_add` release (publication sentinel)

`count()` uses `load(acquire)` to synchronize with the release in `stop()`, ensuring that all aggregate updates are visible once `count()` reflects the new sample.

`reset()` is **not** thread-safe with concurrent `stop()` calls — call it only when no producers are active.

---

## Best practices

- Use **`ScopedStats`** in production code to avoid missing `stop()` on early returns or exceptions.
- Use **`RdtscClock`** for sub-microsecond measurements where clock overhead matters; use **`SteadyClock`** otherwise.
- Call **`mlock()`** on the histogram if the measured code path is latency-sensitive and you want to avoid page faults on first access.
- Call **`reset()`** only from a single thread when no producers are running.
- Apply latency/throughput manipulators **once** per stream — they are sticky.

---

## Summary

| Feature | Supported |
| ------- | :-------: |
| Lock-free multi-producer safe | ✅ |
| HDR histogram (percentiles) | ✅ |
| Min / mean / max / last | ✅ |
| Throughput (ops/s) | ✅ |
| RAII guard (`ScopedStats`) | ✅ |
| Tabular stream output | ✅ |
| Sticky unit manipulators | ✅ |
| `SteadyClock` policy | ✅ |
| `RdtscClock` policy | ✅ |
| NUMA binding | ✅ |
| Memory locking | ✅ |
| Thread-safe reset | ❌ (single-thread only) |
