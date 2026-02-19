---
title: "Condition Variable"
weight: 150
---

# Condition Variable

Join provides **condition variables** for thread and process synchronization.
Condition variables enable threads to **wait for specific conditions** to become true and efficiently **signal state changes**.

Condition types:

* **Condition** — thread synchronization within a process
* **SharedCondition** — inter-process synchronization via shared memory

Both use `CLOCK_MONOTONIC` for timeout operations, ensuring immunity to system clock adjustments.

---

## Condition types

### Condition

Standard condition variable for thread synchronization:

```cpp
#include <join/condition.hpp>
#include <join/mutex.hpp>

using join;

Mutex mutex;
Condition cond;
bool ready = false;

// Thread 1: Wait for condition
void waiter()
{
    ScopedLock<Mutex> lock(mutex);

    while (!ready)
    {
        cond.wait(lock);  // Atomically unlocks mutex and waits
    }

    // Condition is true, mutex is locked again
}

// Thread 2: Signal condition
void signaler()
{
    {
        ScopedLock<Mutex> lock(mutex);
        ready = true;
    }

    cond.signal();  // Wake up one waiting thread
}
```

---

### SharedCondition

Condition variable for inter-process synchronization:

```cpp
#include <join/condition.hpp>
#include <join/mutex.hpp>
#include <join/shared.hpp>

using join;

struct SyncData
{
    SharedMutex mutex;
    SharedCondition cond;
    bool ready;
};

// Create in shared memory
SharedMemory shm("sync_data", sizeof(SyncData));
shm.open();

SyncData* data = new (shm.get()) SyncData();

// Process A: Wait
{
    ScopedLock<SharedMutex> lock(data->mutex);

    while (!data->ready)
    {
        data->cond.wait(lock);
    }
}

// Process B: Signal
{
    ScopedLock<SharedMutex> lock(data->mutex);
    data->ready = true;
}

data->cond.signal();
```

**Important:** `SharedCondition` must be allocated in shared memory using placement new, alongside a `SharedMutex`.

---

## Operations

### Signal

Wake up **one** waiting thread:

```cpp
cond.signal();
```

If multiple threads are waiting, the scheduler chooses which one to wake.

### Broadcast

Wake up **all** waiting threads:

```cpp
cond.broadcast();
```

All waiting threads compete to reacquire the mutex.

### Wait

Block until signaled:

```cpp
ScopedLock<Mutex> lock(mutex);
cond.wait(lock);
```

**Atomically:**
1. Releases the mutex
2. Blocks the thread
3. Reacquires the mutex when signaled

### Wait with predicate

Avoid spurious wakeups with a predicate:

```cpp
ScopedLock<Mutex> lock(mutex);

cond.wait(lock, []() {
    return ready;  // Only return when condition is true
});
```

Equivalent to:
```cpp
while (!ready)
{
    cond.wait(lock);
}
```

### Timed wait

Wait with timeout:

```cpp
ScopedLock<Mutex> lock(mutex);

if (cond.timedWait(lock, std::chrono::seconds(5)))
{
    // Signaled before timeout
}
else
{
    // Timeout occurred
}
```

### Timed wait with predicate

```cpp
ScopedLock<Mutex> lock(mutex);

if (cond.timedWait(lock, std::chrono::seconds(5), []() { return ready; }))
{
    // Condition became true
}
else
{
    // Timeout (condition still false)
}
```

---

## Usage patterns

### Producer-consumer queue

```cpp
#include <queue>

Mutex mutex;
Condition cond;
std::queue<int> queue;
bool done = false;

// Producer thread
void produce()
{
    for (int i = 0; i < 100; ++i)
    {
        {
            ScopedLock<Mutex> lock(mutex);
            queue.push(i);
        }
        cond.signal();
    }

    {
        ScopedLock<Mutex> lock(mutex);
        done = true;
    }

    cond.broadcast();
}

// Consumer thread
void consume()
{
    while (true)
    {
        ScopedLock<Mutex> lock(mutex);

        cond.wait(lock, [&]() {
            return !queue.empty() || done;
        });

        if (queue.empty() && done)
        {
            break;
        }

        int value = queue.front();
        queue.pop();

        // Process value
    }
}
```

---

### Thread pool barrier

```cpp
class Barrier
{
public:
    Barrier(int count) : _count(count), _waiting(0)
    {}

    void wait()
    {
        ScopedLock<Mutex> lock(_mutex);

        if (++_waiting == _count)
        {
            _waiting = 0;
            _cond.broadcast();
        }
        else
        {
            _cond.wait(lock, [this]() {
                return _waiting == 0;
            });
        }
    }

private:
    Mutex _mutex;
    Condition _cond;
    int _count;
    int _waiting;
};

// Usage
Barrier barrier(4);  // 4 threads

void worker()
{
    // Do work phase 1
    barrier.wait();  // All threads wait here

    // Do work phase 2 (only after all reached barrier)
}
```

---

### Event notification

```cpp
class Event
{
public:
    void wait()
    {
        ScopedLock<Mutex> lock(_mutex);
        _cond.wait(lock, [this]() { return _signaled; });
        _signaled = false;  // Auto-reset
    }

    bool waitFor(std::chrono::milliseconds timeout)
    {
        ScopedLock<Mutex> lock(_mutex);
        bool result = _cond.timedWait(lock, timeout, [this]() {
            return _signaled;
        });

        if (result)
        {
            _signaled = false;  // Auto-reset
        }

        return result;
    }

    void signal()
    {
        {
            ScopedLock<Mutex> lock(_mutex);
            _signaled = true;
        }
        _cond.signal();
    }

private:
    Mutex _mutex;
    Condition _cond;
    bool _signaled = false;
};
```

---

### Inter-process semaphore

```cpp
struct Semaphore
{
    SharedMutex mutex;
    SharedCondition cond;
    int count;
};

// Create in shared memory
SharedMemory shm("semaphore", sizeof(Semaphore));
shm.open();

Semaphore* sem = new (shm.get()) Semaphore {
    SharedMutex(),
    SharedCondition(),
    3  // Initial count
};

// Wait (P operation)
void wait(Semaphore* sem)
{
    ScopedLock<SharedMutex> lock(sem->mutex);

    sem->cond.wait(lock, [sem]() {
        return sem->count > 0;
    });

    --sem->count;
}

// Signal (V operation)
void signal(Semaphore* sem)
{
    {
        ScopedLock<SharedMutex> lock(sem->mutex);
        ++sem->count;
    }
    sem->cond.signal();
}
```

---

## Best practices

* **Always use with a mutex** — condition variables require an associated mutex
* **Use predicates** — protect against spurious wakeups
* **Use `ScopedLock`** — ensures mutex is properly held during wait
* **Signal after unlocking** — improves performance by reducing contention
* **Broadcast for state changes** — use when multiple threads need notification
* **Handle timeouts** — check return value of `timedWait()`

---

## Common patterns

### Signal under lock vs. after unlock

```cpp
// Pattern 1: Signal after unlock (better performance)
{
    ScopedLock<Mutex> lock(mutex);
    ready = true;
}
cond.signal();  // No lock contention

// Pattern 2: Signal under lock (simpler, slight overhead)
{
    ScopedLock<Mutex> lock(mutex);
    ready = true;
    cond.signal();
}
```

Both are correct. Pattern 1 is slightly more efficient.

### Multiple conditions, one mutex

```cpp
Mutex mutex;
Condition cond1;
Condition cond2;
bool ready1 = false;
bool ready2 = false;

void waiter1()
{
    ScopedLock<Mutex> lock(mutex);
    cond1.wait(lock, []() { return ready1; });
}

void waiter2()
{
    ScopedLock<Mutex> lock(mutex);
    cond2.wait(lock, []() { return ready2; });
}
```

Multiple condition variables can share a single mutex.

---

## Spurious wakeups

Condition variables can wake up without being signaled (spurious wakeup). **Always use predicates:**

```cpp
// BAD: vulnerable to spurious wakeups
cond.wait(lock);
if (ready)
{
    // Might not be ready!
}

// GOOD: predicate handles spurious wakeups
cond.wait(lock, []() { return ready; });
```

---

## Summary

| Feature                       | Supported |
| ----------------------------- | --------- |
| Thread synchronization        | ✅         |
| Inter-process synchronization | ✅         |
| Signal one thread             | ✅         |
| Broadcast all threads         | ✅         |
| Predicate-based wait          | ✅         |
| Timed wait                    | ✅         |
| Monotonic clock               | ✅         |
| Spurious wakeup protection    | ✅         |
