---
title: "Thread"
weight: 5
bookCollapseSection: true
---

# Thread

The **Thread** module provides multithreading primitives and synchronization mechanisms built on POSIX threads (pthread).

---

### Thread

Thread abstraction for concurrent execution.

**Features:**

* pthread wrapper with move semantics
* Join, tryJoin, cancel operations
* Running state query

---

### Thread Pool

Worker pool for parallel task execution.

**Features:**

* Configurable worker count (default: hardware_concurrency)
* Task queue with condition variable
* Template-based task submission

**Utilities:**

* `distribute` - Distribute work across threads
* `parallelForEach` - Parallel iteration

---

### Semaphore

Counting semaphore for resource management.

**Types:**

* **Semaphore** - Named and unnamed semaphores
* **SharedSemaphore** - Semaphore for shared memory

**Features:**

* Post, wait, tryWait operations
* Timed wait with timeout
* Value query

---

### Mutex

Mutual exclusion locks for protecting shared data.

**Types:**

* **Mutex** - Standard mutex
* **RecursiveMutex** - Recursive mutex (same thread can lock multiple times)
* **SharedMutex** - Mutex for inter-process synchronization via shared memory

**Features:**

* Lock, tryLock, unlock operations
* RAII-based ScopedLock template
* pthread_mutex_t wrapper

---

### Condition

Condition variable for thread synchronization.

**Types:**

* **Condition** - Standard condition variable
* **SharedCondition** - Condition variable for shared memory

**Features:**

* Wait with optional predicate
* Timed wait operations
* Signal and broadcast notifications

---

## API Reference

For detailed API documentation, see:

🔗 [Doxygen Thread Module Reference](https://joinframework.github.io/join/)
