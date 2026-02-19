---
title: "Semaphore"
weight: 130
---

# Semaphore

Join provides **counting semaphores** for thread and process synchronization.
Semaphores maintain an **internal counter** and enable efficient resource management and signaling patterns.

Semaphore types:

* **Semaphore** — unnamed (thread-local) or named (system-wide) semaphores
* **SharedSemaphore** — process-shared semaphores via shared memory

---

## Semaphore types

### Unnamed semaphore

Thread-local semaphore for intra-process synchronization:

```cpp
#include <join/semaphore.hpp>

using join;

Semaphore sem(3);  // Initial count of 3

// Thread 1
sem.wait();  // Decrement counter (3 → 2)
// Critical section
sem.post();  // Increment counter (2 → 3)

// Thread 2
sem.wait();  // Decrement counter (3 → 2)
// Critical section
sem.post();  // Increment counter (2 → 3)
```

---

### Named semaphore

System-wide semaphore accessible by name across processes:

```cpp
// Process A: Create named semaphore
Semaphore sem("/my_semaphore", 1, O_CREAT, 0644);

sem.wait();
// Critical section
sem.post();

// Process B: Open existing semaphore
Semaphore sem("/my_semaphore", 0, 0);

sem.wait();
// Critical section
sem.post();
```

**Named semaphores:**

* Persist in the system until explicitly unlinked
* Use file-like names starting with `/`
* Accessible across unrelated processes
* Require cleanup with `sem_unlink("/name")`

---

### SharedSemaphore

Process-shared semaphore using shared memory:

```cpp
#include <join/shared.hpp>

using join;

// Create in shared memory
SharedMemory shm("sem_data", sizeof(SharedSemaphore));
shm.open();

SharedSemaphore* sem = new (shm.get()) SharedSemaphore(1);

// Process A
sem->wait();
// Critical section
sem->post();

// Process B (opens same shared memory)
SharedMemory shm("sem_data", sizeof(SharedSemaphore));
shm.open();

SharedSemaphore* sem = reinterpret_cast<SharedSemaphore*>(shm.get());

sem->wait();
// Critical section
sem->post();
```

**Important:** `SharedSemaphore` must be allocated in shared memory using placement new.

---

## Operations

### Post (signal/release)

Increment the counter and wake a waiting thread:

```cpp
sem.post();  // Counter++, wake one waiter if any
```

### Wait (acquire)

Decrement the counter, blocking if it's zero:

```cpp
sem.wait();  // Blocks until counter > 0, then counter--
```

### Try wait (non-blocking)

Attempt to decrement without blocking:

```cpp
if (sem.tryWait())
{
    // Successfully acquired (counter was > 0)
    // Critical section
    sem.post();
}
else
{
    // Counter was 0, didn't acquire
}
```

### Timed wait

Wait with timeout:

```cpp
if (sem.timedWait(std::chrono::seconds(5)))
{
    // Acquired within timeout
    // Critical section
    sem.post();
}
else
{
    // Timeout occurred
}
```

### Get value

Query the current counter value:

```cpp
int count = sem.value();
```

**Note:** The value may change immediately after reading due to concurrent access.

---

## Usage patterns

### Mutex (binary semaphore)

```cpp
Semaphore mutex(1);  // Binary semaphore

void criticalSection()
{
    mutex.wait();
    // Only one thread can be here
    mutex.post();
}
```

---

### Resource pool

```cpp
Semaphore resources(5);  // 5 available resources

void useResource()
{
    resources.wait();  // Acquire one resource

    // Use resource

    resources.post();  // Release resource
}
```

---

### Producer-consumer

```cpp
#include <queue>

Semaphore items(0);       // Count of items in queue
Semaphore spaces(100);    // Count of free spaces
Mutex queueMutex;
std::queue<int> queue;

void producer()
{
    for (int i = 0; i < 1000; ++i)
    {
        spaces.wait();  // Wait for space

        {
            ScopedLock<Mutex> lock(queueMutex);
            queue.push(i);
        }

        items.post();  // Signal new item
    }
}

void consumer()
{
    while (true)
    {
        items.wait();  // Wait for item

        int value;

        {
            ScopedLock<Mutex> lock(queueMutex);
            value = queue.front();
            queue.pop();
        }

        spaces.post();  // Signal free space

        // Process value
    }
}
```

---

### Thread pool with work queue

```cpp
class ThreadPool
{
public:
    ThreadPool(int workers) : _tasks(0)
    {
        for (int i = 0; i < workers; ++i)
        {
            std::thread([this]() { worker(); }).detach();
        }
    }

    void submit(std::function<void()> task)
    {
        {
            ScopedLock<Mutex> lock(_mutex);
            _queue.push(std::move(task));
        }
        _tasks.post();  // Signal new task
    }

private:
    void worker()
    {
        while (true)
        {
            _tasks.wait();  // Wait for task

            std::function<void()> task;

            {
                ScopedLock<Mutex> lock(_mutex);
                if (_queue.empty()) continue;
                task = std::move(_queue.front());
                _queue.pop();
            }

            task();  // Execute task
        }
    }

    Mutex _mutex;
    Semaphore _tasks;
    std::queue<std::function<void()>> _queue;
};
```

---

### Inter-process signaling

```cpp
// Process A: Wait for signal from B
Semaphore signal("/process_signal", 0, O_CREAT, 0644);

std::cout << "Waiting for signal...\n";
signal.wait();
std::cout << "Signal received!\n";

// Process B: Send signal to A
Semaphore signal("/process_signal", 0, 0);

std::this_thread::sleep_for(std::chrono::seconds(2));
signal.post();
std::cout << "Signal sent!\n";

// Cleanup
sem_unlink("/process_signal");
```

---

### Rate limiting

```cpp
class RateLimiter
{
public:
    RateLimiter(int requestsPerSecond)
    : _sem(requestsPerSecond)
    , _rate(requestsPerSecond)
    {
        std::thread([this]() { refill(); }).detach();
    }

    bool tryAcquire()
    {
        return _sem.tryWait();
    }

    void acquire()
    {
        _sem.wait();
    }

private:
    void refill()
    {
        while (true)
        {
            std::this_thread::sleep_for(std::chrono::seconds(1));

            // Refill permits
            for (int i = 0; i < _rate; ++i)
            {
                _sem.post();
            }
        }
    }

    Semaphore _sem;
    int _rate;
};
```

---

## Named semaphore cleanup

Named semaphores persist after process termination. Always clean up:

```cpp
#include <semaphore.h>

// Create and use
Semaphore sem("/my_sem", 1, O_CREAT | O_EXCL, 0644);
// ...

// Cleanup when done
sem_unlink("/my_sem");
```

**Best practice:** Use `O_EXCL` flag to detect if semaphore already exists.

---

## Best practices

* **Choose appropriate initial value** — 0 for signaling, N for resource pools
* **Always balance wait/post** — each `wait()` should eventually have a `post()`
* **Use tryWait() for timeouts** — avoid indefinite blocking when appropriate
* **Clean up named semaphores** — use `sem_unlink()` to remove system-wide semaphores
* **Prefer unnamed over named** — unnamed semaphores have lower overhead for thread-only use
* **SharedSemaphore placement** — always use placement new in shared memory

---

## Comparison with other primitives

### Semaphore vs. Mutex

| Feature          | Semaphore              | Mutex                   |
| ---------------- | ---------------------- | ----------------------- |
| Ownership        | None                   | Thread-owned            |
| Counter          | N (configurable)       | 1 (binary)              |
| Post by any      | ✅ Yes                  | ❌ Only owner can unlock |
| Use case         | Signaling, resources   | Mutual exclusion        |

### Semaphore vs. Condition Variable

| Feature          | Semaphore              | Condition Variable      |
| ---------------- | ---------------------- | ----------------------- |
| State            | Counter (persistent)   | Stateless               |
| Missed signals   | Queued in counter      | Lost if no waiter       |
| Predicate        | Counter > 0            | Custom predicate        |
| Complexity       | Simpler                | More flexible           |

---

## Common pitfalls

### Forgetting to post

```cpp
// BAD: resource never released on exception
sem.wait();
if (error)
{
    throw std::runtime_error("Error");  // sem.post() never called!
}
sem.post();

// GOOD: use RAII or ensure all paths call post
```

### Deadlock with circular wait

```cpp
// BAD: potential deadlock
Semaphore sem1(1), sem2(1);

// Thread A
sem1.wait();
sem2.wait();  // Waits if B holds sem2

// Thread B
sem2.wait();
sem1.wait();  // Waits if A holds sem1

// GOOD: consistent ordering
```

---

## Summary

| Feature                    | Supported |
| -------------------------- | --------- |
| Unnamed semaphores         | ✅         |
| Named semaphores           | ✅         |
| Process-shared semaphores  | ✅         |
| Counting (N > 1)           | ✅         |
| Non-blocking try-wait      | ✅         |
| Timed wait                 | ✅         |
| Query counter value        | ✅         |