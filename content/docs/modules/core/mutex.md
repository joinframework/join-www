---
title: "Mutex"
weight: 13
---

# Mutex

Join provides **thread synchronization primitives** built on top of POSIX threads.
These mutexes enable **safe concurrent access** to shared resources across threads and processes.

Mutex types:

* **Mutex** — basic mutual exclusion lock
* **RecursiveMutex** — allows recursive locking by the same thread
* **SharedMutex** — inter-process synchronization via shared memory
* **ScopedLock** — RAII-based automatic lock management

---

## Mutex types

### Mutex

Basic mutex for thread synchronization:

```cpp
#include <join/mutex.hpp>

using join;

Mutex mutex;

mutex.lock();
// Critical section
mutex.unlock();
```

**Characteristics:**

* Non-recursive — deadlock if same thread locks twice
* Thread-local — only for threads within the same process
* Lightweight — minimal overhead

---

### RecursiveMutex

Allows the same thread to acquire the lock multiple times:

```cpp
RecursiveMutex mutex;

void recursiveFunction(int depth)
{
    mutex.lock();

    if (depth > 0)
    {
        recursiveFunction(depth - 1);  // OK: recursive lock
    }

    mutex.unlock();
}
```

**Characteristics:**

* Recursive — same thread can lock multiple times
* Balanced unlocks — must call `unlock()` same number of times as `lock()`
* Slightly higher overhead than basic `Mutex`

---

### SharedMutex

Synchronizes access across different processes via shared memory:

```cpp
#include <join/mutex.hpp>
#include <join/shared.hpp>

using join;

// Create shared memory segment
SharedMemory shm("my_mutex", sizeof(SharedMutex));
shm.open();

// Use placement new to construct mutex in shared memory
SharedMutex* mutex = new (shm.get()) SharedMutex();

// Process A
mutex->lock();
// Critical section
mutex->unlock();

// Process B (opens same shared memory)
SharedMemory shm("my_mutex", sizeof(SharedMutex));
shm.open();

// Reinterpret existing mutex in shared memory
SharedMutex* mutex = reinterpret_cast<SharedMutex*>(shm.get());

mutex->lock();
// Critical section
mutex->unlock();
```

**Characteristics:**

* **Process-shared** — works across process boundaries
* **Robust** — automatically handles owner death with `PTHREAD_MUTEX_ROBUST`
* **Placement new** — must be constructed in shared memory with placement new
* **Explicit destruction** — call destructor manually before unlinking shared memory

**Important:** `SharedMutex` must be allocated in shared memory using placement new to be visible across processes.

---

## Lock operations

### Blocking lock

```cpp
mutex.lock();  // Blocks until lock is acquired
```

### Non-blocking lock

```cpp
if (mutex.tryLock())
{
    // Lock acquired
    mutex.unlock();
}
else
{
    // Lock not available
}
```

### Unlock

```cpp
mutex.unlock();  // Release the lock
```

---

## ScopedLock (RAII)

Automatically acquires and releases a lock using RAII:

```cpp
void criticalSection()
{
    Mutex mutex;

    ScopedLock<Mutex> lock(mutex);
    // Lock acquired automatically

    // Critical section
    // ...

    // Lock released automatically when lock goes out of scope
}
```

### Exception safety

ScopedLock ensures the mutex is unlocked even if an exception is thrown:

```cpp
Mutex mutex;

try
{
    ScopedLock<Mutex> lock(mutex);

    if (errorCondition)
    {
        throw std::runtime_error("Error");
    }

    // Lock automatically released here
}
catch (...)
{
    // Mutex already unlocked by ScopedLock destructor
}
```

### Works with all mutex types

```cpp
RecursiveMutex recMutex;
ScopedLock<RecursiveMutex> lock1(recMutex);

SharedMutex* sharedMutex = /* from shared memory */;
ScopedLock<SharedMutex> lock2(*sharedMutex);
```

---

## Usage patterns

### Basic critical section

```cpp
Mutex mutex;
int sharedCounter = 0;

void increment()
{
    mutex.lock();
    ++sharedCounter;
    mutex.unlock();
}
```

### RAII-based critical section

```cpp
Mutex mutex;
int sharedCounter = 0;

void increment()
{
    ScopedLock<Mutex> lock(mutex);
    ++sharedCounter;
    // Automatic unlock
}
```

### Conditional locking

```cpp
Mutex mutex;

void tryUpdate()
{
    if (mutex.tryLock())
    {
        // Update data
        mutex.unlock();
    }
    else
    {
        // Skip update, mutex busy
    }
}
```

### Recursive locking

```cpp
RecursiveMutex mutex;
std::vector<int> data;

void processElement(int index)
{
    ScopedLock<RecursiveMutex> lock(mutex);

    if (index < data.size())
    {
        // Process current element

        if (needsRecursion)
        {
            processElement(index + 1);  // OK: recursive lock
        }
    }
}
```

### Inter-process synchronization

```cpp
#include <join/shared.hpp>
#include <join/mutex.hpp>

using join;

// Process A (creates shared memory and mutex)
SharedMemory shm("my_mutex", sizeof(SharedMutex));
if (shm.open() == 0)
{
    // Construct mutex using placement new
    SharedMutex* mutex = new (shm.get()) SharedMutex();

    mutex->lock();
    // Critical section
    mutex->unlock();

    // Before closing, explicitly destroy
    mutex->~SharedMutex();
    shm.close();
}

// Process B (attaches to existing shared memory)
SharedMemory shm("my_mutex", sizeof(SharedMutex));
if (shm.open() == 0)
{
    // Reinterpret existing mutex (no construction needed)
    SharedMutex* mutex = reinterpret_cast<SharedMutex*>(shm.get());

    mutex->lock();
    // Critical section
    mutex->unlock();

    shm.close();
}

// Cleanup (after all processes are done)
SharedMemory::unlink("my_mutex");
```

---

## Native handle

Access the underlying `pthread_mutex_t` for advanced operations:

```cpp
Mutex mutex;
pthread_mutex_t* handle = mutex.handle();

// Use with pthread functions
pthread_cond_wait(&cond, handle);
```

---

## Best practices

* **Use ScopedLock** — automatic unlock prevents deadlocks from early returns or exceptions
* **Minimize critical sections** — keep locked regions as short as possible
* **Avoid nested locks** — can lead to deadlocks unless using `RecursiveMutex`
* **Use `tryLock()` carefully** — ensure proper error handling when lock fails
* **SharedMutex placement** — always allocate in true shared memory regions
* **Consistent locking order** — when using multiple mutexes, always acquire in the same order

---

## Common pitfalls

### Forgetting to unlock

```cpp
// BAD: exception causes unlock to be skipped
mutex.lock();
if (error)
{
    throw std::runtime_error("Error");  // mutex never unlocked!
}
mutex.unlock();

// GOOD: use ScopedLock
ScopedLock<Mutex> lock(mutex);
if (error)
{
    throw std::runtime_error("Error");  // mutex automatically unlocked
}
```

### Deadlock with nested locks

```cpp
// BAD: deadlock with regular Mutex
Mutex mutex;

void outer()
{
    mutex.lock();
    inner();  // Deadlock! Same thread tries to lock again
    mutex.unlock();
}

void inner()
{
    mutex.lock();
    // ...
    mutex.unlock();
}

// GOOD: use RecursiveMutex when recursion is needed
RecursiveMutex mutex;  // Now safe
```

### Circular lock dependencies

```cpp
// BAD: potential deadlock
Mutex mutex1, mutex2;

// Thread A
mutex1.lock();
mutex2.lock();  // Waits if Thread B holds mutex2

// Thread B
mutex2.lock();
mutex1.lock();  // Waits if Thread A holds mutex1

// GOOD: consistent lock order
// Both threads acquire in same order: mutex1 then mutex2
```

---

## Summary

| Feature                    | Supported |
| -------------------------- | --------- |
| Basic mutex                | ✅         |
| Recursive mutex            | ✅         |
| Shared memory mutex        | ✅         |
| RAII lock management       | ✅         |
| Non-blocking try-lock      | ✅         |
| Robust process-shared      | ✅         |
| Native handle access       | ✅         |
