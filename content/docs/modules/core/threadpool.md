---
title: "Thread Pool"
weight: 11
---

# Thread Pool

Join provides **thread pool implementations** for efficient parallel task execution.
The library offers both a **persistent thread pool** for continuous task processing and **one-shot parallel algorithms** for data distribution.

Thread pool features:

* **automatic sizing** — defaults to hardware concurrency
* **work queue** — efficient job distribution
* **graceful shutdown** — waits for pending tasks
* **parallel algorithms** — `distribute()` and `parallelForEach()`

---

## ThreadPool

Persistent pool of worker threads that process tasks from a queue.

### Creating a pool

```cpp
#include <join/threadpool.hpp>

using join;

// Default: uses hardware_concurrency
ThreadPool pool;

// Custom worker count
ThreadPool pool(4);
```

### Submitting tasks

```cpp
void task(int id)
{
    std::cout << "Task " << id << "\n";
}

ThreadPool pool;

// Submit function with arguments
pool.push(task, 42);

// Submit lambda
pool.push([]() {
    std::cout << "Lambda task\n";
});

// Submit with captured variables
int value = 100;
pool.push([value]() {
    std::cout << "Value: " << value << "\n";
});
```

### Pool size

```cpp
size_t workerCount = pool.size();
```

---

## Parallel algorithms

### distribute()

Splits an iterator range across threads and executes a function on each partition:

```cpp
#include <join/threadpool.hpp>
#include <vector>

using join;

std::vector<int> data(10000);

// Function receives [begin, end) iterators for its partition
distribute(data.begin(), data.end(),
    [](auto first, auto last) {
        int sum = 0;
        for (auto it = first; it != last; ++it)
        {
            sum += *it;
        }
        // Process sum for this partition
    }
);
```

**How it works:**

1. Determines optimal thread count (up to `hardware_concurrency`)
2. Divides range into equal partitions
3. Spawns threads to process partitions in parallel
4. Main thread processes one partition too
5. Waits for all threads to complete

---

### parallelForEach()

Applies a function to each element in parallel:

```cpp
std::vector<int> data = {1, 2, 3, 4, 5, 6, 7, 8};

parallelForEach(data.begin(), data.end(),
    [](int& value) {
        value *= 2;  // Double each element in parallel
    }
);
```

Equivalent to `std::for_each` but executed in parallel across multiple threads.

---

## Usage patterns

### Task queue processing

```cpp
ThreadPool pool(8);

for (int i = 0; i < 100; ++i)
{
    pool.push([i]() {
        // Process task i
        processData(i);
    });
}

// Pool destructor waits for all tasks to complete
```

---

### Parallel computation

```cpp
std::vector<double> results(1000);

parallelForEach(results.begin(), results.end(),
    [](double& result) {
        result = expensiveComputation();
    }
);
```

---

### Map-reduce pattern

```cpp
std::vector<int> data(10000);
std::vector<int> partialSums(std::thread::hardware_concurrency());

// Map: compute partial sums in parallel
distribute(data.begin(), data.end(),
    [&](auto first, auto last) {
        static std::atomic<int> partitionId{0};
        int id = partitionId++;

        int sum = 0;
        for (auto it = first; it != last; ++it)
        {
            sum += *it;
        }

        partialSums[id] = sum;
    }
);

// Reduce: combine partial results
int total = 0;
for (int sum : partialSums)
{
    total += sum;
}
```

---

### Parallel image processing

```cpp
struct Pixel { uint8_t r, g, b; };
std::vector<Pixel> image(1920 * 1080);

parallelForEach(image.begin(), image.end(),
    [](Pixel& p) {
        // Apply filter to each pixel in parallel
        p.r = std::min(255, p.r * 1.2);
        p.g = std::min(255, p.g * 1.2);
        p.b = std::min(255, p.b * 1.2);
    }
);
```

---

### Background job processor

```cpp
class JobProcessor
{
public:
    JobProcessor() : _pool(4)
    {
        // Pool automatically starts workers
    }

    void submitJob(const std::string& data)
    {
        _pool.push([data]() {
            processJob(data);
        });
    }

private:
    static void processJob(const std::string& data)
    {
        // Heavy processing
    }

    ThreadPool _pool;
};
```

---

### Batch processing

```cpp
void processBatch(const std::vector<std::string>& files)
{
    ThreadPool pool;

    for (const auto& file : files)
    {
        pool.push([file]() {
            loadAndProcess(file);
        });
    }

    // Destructor waits for all files to be processed
}
```

---

## Synchronization with results

ThreadPool doesn't provide built-in futures. Use manual synchronization:

### Using mutex for results

```cpp
std::vector<int> data(1000);
std::vector<int> results(1000);
Mutex mutex;

parallelForEach(data.begin(), data.end(),
    [&](int& value) {
        int result = compute(value);

        ScopedLock<Mutex> lock(mutex);
        results.push_back(result);
    }
);
```

### Using atomic operations

```cpp
std::vector<int> data(1000);
std::atomic<int> total{0};

parallelForEach(data.begin(), data.end(),
    [&](int value) {
        int result = compute(value);
        total += result;
    }
);

std::cout << "Total: " << total << "\n";
```

### Using condition variable

```cpp
ThreadPool pool;
Mutex mutex;
Condition cond;
bool done = false;

pool.push([&]() {
    // Do work

    {
        ScopedLock<Mutex> lock(mutex);
        done = true;
    }

    cond.signal();
});

// Wait for completion
ScopedLock<Mutex> lock(mutex);
cond.wait(lock, [&]() { return done; });
```

---

## Performance considerations

### Optimal thread count

```cpp
// Let system decide
ThreadPool pool;  // hardware_concurrency threads

// For CPU-bound tasks
ThreadPool cpuPool(std::thread::hardware_concurrency());

// For I/O-bound tasks (may use more threads)
ThreadPool ioPool(std::thread::hardware_concurrency() * 2);

// For specific workloads
ThreadPool customPool(8);
```

### Task granularity

```cpp
// BAD: too fine-grained (overhead dominates)
for (int i = 0; i < 1000000; ++i)
{
    pool.push([i]() {
        data[i] *= 2;  // Too small, thread overhead too high
    });
}

// GOOD: coarse-grained batches
int batchSize = 1000;
for (int batch = 0; batch < 1000; ++batch)
{
    pool.push([batch, batchSize]() {
        int start = batch * batchSize;
        int end = start + batchSize;
        for (int i = start; i < end; ++i)
        {
            data[i] *= 2;
        }
    });
}

// BEST: use parallel algorithms
parallelForEach(data.begin(), data.end(), [](int& v) { v *= 2; });
```

---

## Lifecycle and shutdown

### Automatic cleanup

```cpp
{
    ThreadPool pool;

    for (int i = 0; i < 100; ++i)
    {
        pool.push(task);
    }

    // Destructor waits for all 100 tasks to complete
}
```

### Graceful shutdown

The pool's destructor:

1. Sets the stop flag
2. Wakes all worker threads
3. Workers finish current tasks
4. Workers exit when queue is empty
5. Destructor waits for all workers to join

---

## Best practices

* **Size appropriately** — match thread count to workload type (CPU vs I/O bound)
* **Batch small tasks** — avoid overhead by grouping tiny operations
* **Use parallel algorithms** — prefer `distribute()` / `parallelForEach()` for data parallelism
* **Synchronize carefully** — protect shared state with mutexes or atomics
* **Avoid blocking in tasks** — don't call blocking I/O in CPU-bound pools
* **Let pool manage lifetime** — destructor handles graceful shutdown automatically

---

## Comparison: ThreadPool vs. distribute()

| Feature              | ThreadPool                    | distribute()                  |
| -------------------- | ----------------------------- | ----------------------------- |
| Lifetime             | Persistent workers            | One-shot execution            |
| Use case             | Ongoing task queue            | Parallel data processing      |
| Thread reuse         | ✅ Yes                         | ❌ Creates new threads         |
| Overhead             | Lower for many tasks          | Lower for single batch        |
| Shutdown             | Graceful, waits for queue     | Waits for all partitions      |

**Choose ThreadPool when:** processing continuous stream of tasks

**Choose distribute() when:** processing a single large dataset in parallel

---

## Summary

| Feature                    | Supported |
| -------------------------- | --------- |
| Persistent worker pool     | ✅         |
| Automatic sizing           | ✅         |
| Task queue                 | ✅         |
| Graceful shutdown          | ✅         |
| Parallel algorithms        | ✅         |
| Iterator-based             | ✅         |
| Work stealing              | ❌         |
| Future/promise support     | ❌         |
