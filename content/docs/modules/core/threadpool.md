---

title: "Thread Pool"
weight: 120
---

# Thread Pool

Join provides **thread pool implementations** for efficient parallel task execution.
The library offers both a **persistent thread pool** for continuous task processing and **one-shot parallel algorithms** for data distribution.

Thread pool features:

* **topology-aware sizing** — defaults to the number of physical CPU cores via `CpuTopology`
* **work queue** — `std::deque`-backed job distribution protected by a mutex and condition variable
* **graceful shutdown** — workers drain the queue before exiting
* **parallel algorithms** — `distribute()` and `parallelForEach()`

---

## ThreadPool

Persistent pool of worker threads that process tasks from a shared queue.

### Creating a pool

```cpp
#include <join/threadpool.hpp>

using namespace join;

// Default: one worker per physical core (CpuTopology)
ThreadPool pool;

// Custom worker count
ThreadPool pool(4);
```

The worker count must be strictly positive — passing `0` or a negative value throws `std::invalid_argument`.

`ThreadPool` is neither copyable nor movable.

### Submitting tasks

```cpp
void task(int id)
{
    // ...
}

ThreadPool pool;

// Submit function with arguments
pool.push(task, 42);

// Submit lambda
pool.push([]() {
    // ...
});

// Submit with captured variables
int value = 100;
pool.push([value]() {
    // ...
});
```

Tasks are enqueued as `std::function<void()>` objects and executed by the first available worker thread.

### Pool size

```cpp
size_t n = pool.size();
```

---

## Shutdown behaviour

The destructor:

1. Sets the internal stop flag.
2. Broadcasts to all waiting worker threads via `_condition.broadcast()`.
3. Workers finish their **current task**, then drain any **remaining queued jobs** before exiting.
4. Each `WorkerThread` destructor joins its underlying `Thread`.

This guarantees that **all queued tasks complete** before the pool is destroyed.

```cpp
{
    ThreadPool pool(4);

    for (int i = 0; i < 100; ++i)
    {
        pool.push([i]() { process(i); });
    }

    // All 100 tasks are guaranteed to complete here
}
```

---

## Parallel algorithms

### distribute()

Splits an iterator range across threads and executes a function on each partition.
Uses `CpuTopology` to determine the number of threads — capped to the number of elements.

```cpp
#include <join/threadpool.hpp>
#include <vector>

using namespace join;

std::vector<int> data(10000);

distribute(data.begin(), data.end(),
    [](auto first, auto last) {
        for (auto it = first; it != last; ++it)
        {
            // process *it
        }
    }
);
```

**How it works:**

1. Computes the number of threads as `min(cores, count)`.
2. Divides the range into equal partitions, distributing remainder elements to the first partitions.
3. Spawns `concurrency - 1` threads to process their partitions.
4. The calling thread processes the last partition directly.
5. Joins all spawned threads before returning.

---

### parallelForEach()

Applies a unary function to each element in the range in parallel.
This is a convenience wrapper around `distribute()`.

```cpp
std::vector<int> data = {1, 2, 3, 4, 5, 6, 7, 8};

parallelForEach(data.begin(), data.end(),
    [](int& value) {
        value *= 2;
    }
);
```

Equivalent to `std::for_each` but executed in parallel across physical cores.

---

## Usage patterns

### Background job processor

```cpp
class JobProcessor
{
public:
    JobProcessor() : _pool(4) {}

    void submit(const std::string& data)
    {
        _pool.push([data]() { process(data); });
    }

private:
    static void process(const std::string& data) { /* ... */ }

    ThreadPool _pool;
};
```

### Parallel computation

```cpp
std::vector<double> results(1000);

parallelForEach(results.begin(), results.end(),
    [](double& result) {
        result = expensiveComputation();
    }
);
```

### Map-reduce pattern

```cpp
std::vector<int> data(10000);
std::atomic<int> total{0};

parallelForEach(data.begin(), data.end(),
    [&total](int value) {
        total += compute(value);
    }
);
```

---

## Performance considerations

### Sizing for CPU vs. I/O workloads

```cpp
// CPU-bound: one thread per core (default)
ThreadPool cpuPool;

// I/O-bound: more threads to overlap blocking waits
ThreadPool ioPool(std::thread::hardware_concurrency() * 2);
```

### Task granularity

```cpp
// BAD: per-element push — queue overhead dominates
for (int i = 0; i < 1000000; ++i)
{
    pool.push([i]() { data[i] *= 2; });
}

// GOOD: use parallel algorithms for data parallelism
parallelForEach(data.begin(), data.end(), [](int& v) { v *= 2; });
```

Prefer `parallelForEach()` and `distribute()` for data-parallel loops.
Reserve `ThreadPool::push()` for heterogeneous tasks that must be queued independently.

---

## Best practices

* **Let the default size stand** — `CpuTopology`-based sizing avoids over-subscription on CPU-bound work
* **Batch small tasks** — group tiny operations to amortise queue and mutex overhead
* **Prefer parallel algorithms** — `distribute()` and `parallelForEach()` handle partitioning automatically
* **Synchronize shared state** — protect any data written by multiple tasks with mutexes or atomics
* **Avoid blocking in tasks** — long blocking calls stall a worker and reduce throughput
* **Let the destructor handle shutdown** — it drains the queue and joins all workers

---

## Comparison: ThreadPool vs. distribute()

| Feature          | `ThreadPool`                   | `distribute()`                |
| ---------------- | ------------------------------ | ----------------------------- |
| Lifetime         | Persistent workers             | One-shot execution            |
| Use case         | Ongoing heterogeneous tasks    | Parallel data processing      |
| Thread reuse     | ✅                              | ❌ Creates new threads         |
| Overhead         | Lower for many tasks           | Lower for single batch        |
| Shutdown         | Drains full queue              | Waits for all partitions      |

**Choose `ThreadPool`** when processing a continuous or heterogeneous stream of tasks.

**Choose `distribute()`** when processing a single large dataset in one parallel pass.

---

## Summary

| Feature                 | Supported |
| ----------------------- | :-------: |
| Persistent worker pool  | ✅         |
| Topology-aware sizing   | ✅         |
| Task queue              | ✅         |
| Graceful shutdown       | ✅         |
| `distribute()`          | ✅         |
| `parallelForEach()`     | ✅         |
| Work stealing           | ❌         |
| Future/promise support  | ❌         |
