---

title: "Thread"
weight: 110
---

# Thread

Join provides a **thread management class** built on top of POSIX threads.
The `Thread` class offers a simple interface for **creating and managing threads** with support for core affinity, real-time priority, move semantics, and non-blocking join operations.

Thread features:

* **callable objects** — accepts functions, lambdas, and functors
* **core affinity** — pin threads to specific CPU cores
* **real-time priority** — configure `SCHED_OTHER` or `SCHED_FIFO` scheduling
* **move semantics** — efficient thread ownership transfer
* **non-blocking join** — check completion without blocking
* **thread cancellation** — request thread termination
* **RAII-compliant** — automatic cleanup on destruction

---

## Creating threads

### Basic thread creation

```cpp
#include <join/thread.hpp>

using namespace join;

Thread thread([]() {
    // Thread work
});

thread.join();
```

### With arguments

```cpp
void task(int id, const std::string& name)
{
    // ...
}

Thread thread(task, 42, "worker");
thread.join();
```

### With member functions

```cpp
class Worker
{
public:
    void process(int value) { /* ... */ }
};

Worker worker;
Thread thread(&Worker::process, &worker, 100);
thread.join();
```

---

## Core affinity

A thread can be pinned to a specific CPU core at construction time or after creation.

### Pin at construction

```cpp
int core = 2;
int prio = 0;

Thread thread(core, prio, []() {
    // runs on core 2
});
```

### Pin after construction

```cpp
Thread thread([]() { /* ... */ });

if (thread.affinity(3) == -1)
{
    // check join::lastError
}
```

### Read current affinity

```cpp
int core = thread.affinity();  // -1 if not pinned
```

### Unpin a thread

```cpp
thread.affinity(-1);  // restores all cores
```

The static overload is available to pin any thread by its `pthread_t` handle:

```cpp
Thread::affinity(handle, core);
```

---

## Thread priority

Threads support two scheduling policies:

| Priority value | Scheduling policy | Description               |
| :------------: | ----------------- | ------------------------- |
| `0`            | `SCHED_OTHER`     | Standard time-sharing     |
| `1` – `99`     | `SCHED_FIFO`      | Real-time FIFO scheduling |

### Set at construction

```cpp
int core = -1;   // no pinning
int prio = 50;   // SCHED_FIFO, priority 50

Thread thread(core, prio, []() {
    // real-time thread
});
```

### Set after construction

```cpp
if (thread.priority(80) == -1)
{
    // check join::lastError
}
```

### Read current priority

```cpp
int prio = thread.priority();  // 0 if standard
```

The static overload is available to set the priority of any thread by its `pthread_t` handle:

```cpp
Thread::priority(handle, prio);
```

⚠️ Setting a real-time priority requires appropriate system privileges (`CAP_SYS_NICE` or equivalent).

---

## Thread operations

### Join

Block until the thread completes:

```cpp
thread.join();
```

After joining, the thread is no longer joinable.

### Try join (non-blocking)

Check if the thread has completed without blocking:

```cpp
if (thread.tryJoin())
{
    // thread completed
}
else
{
    // thread still running
}
```

### Cancel

Request thread cancellation and wait for termination:

```cpp
thread.cancel();
```

Cancellation sends `pthread_cancel` to the thread. It only takes effect at a cancellation point.
Prefer **cooperative cancellation** using an atomic flag for reliable termination.

---

## Thread state

### Joinable

Returns `true` if the thread has an associated execution:

```cpp
Thread t1;            // default constructed
t1.joinable();        // false

Thread t2([]() {});
t2.joinable();        // true

t2.join();
t2.joinable();        // false
```

### Running

Returns `true` if the thread is currently executing:

```cpp
Thread thread([]() {
    std::this_thread::sleep_for(std::chrono::seconds(2));
});

thread.running();  // true

std::this_thread::sleep_for(std::chrono::seconds(3));
thread.running();  // false

thread.join();
```

### Handle

Access the underlying `pthread_t` handle:

```cpp
pthread_t h = thread.handle();
```

Returns a zero-initialized `pthread_t` if the thread is not joinable.

---

## Move semantics

Threads are **move-only** — copy construction and copy assignment are deleted.

```cpp
Thread t1([]() { /* ... */ });
Thread t2 = std::move(t1);  // t1 is now empty

Thread t3;
t3 = std::move(t2);         // move assignment cancels any existing thread in t3
```

### Swap

```cpp
Thread t1(task1);
Thread t2(task2);

t1.swap(t2);

t1.join();  // joins what was task2
t2.join();  // joins what was task1
```

---

## Usage patterns

### Background monitoring

```cpp
class Monitor
{
public:
    Monitor() : _running(true)
    {
        _thread = Thread([this]() {
            while (_running)
            {
                checkStatus();
                std::this_thread::sleep_for(std::chrono::seconds(1));
            }
        });
    }

    ~Monitor()
    {
        _running = false;
        _thread.join();
    }

private:
    void checkStatus() { /* ... */ }

    Thread _thread;
    std::atomic_bool _running;
};
```

### Cooperative cancellation

Since `pthread_cancel` may not fire reliably, prefer flag-based cancellation:

```cpp
class Task
{
public:
    void start()
    {
        _stop = false;
        _thread = Thread([this]() {
            while (!_stop)
            {
                // do work
            }
        });
    }

    void stop()
    {
        _stop = true;
        _thread.join();
    }

private:
    Thread _thread;
    std::atomic_bool _stop{false};
};
```

### Real-time worker pinned to a core

```cpp
// pin to core 1, SCHED_FIFO priority 60
Thread rt(1, 60, []() {
    // latency-sensitive processing
});

rt.join();
```

---

## Best practices

* **Always join or cancel** — the destructor calls `cancel()`, which may abruptly terminate the thread
* **Prefer cooperative cancellation** — use an atomic flag rather than `pthread_cancel`
* **Use RAII wrappers** — manage thread lifetime inside classes with proper destructors
* **Pin real-time threads** — combine core affinity with a real-time priority for deterministic latency
* **Check return values** — `affinity()` and `priority()` return `-1` on failure; inspect `join::lastError`
* **Move, don't copy** — use `std::move()` for ownership transfer
* **Synchronize shared data** — unprotected access from multiple threads causes data races

---

## Common pitfalls

### Forgetting to join

```cpp
// BAD: destructor calls cancel() — thread may be abruptly terminated
{
    Thread thread(task);
}

// GOOD: explicitly join
{
    Thread thread(task);
    thread.join();
}
```

### Dangling references in lambdas

```cpp
// BAD: local data destroyed before thread finishes
void bad()
{
    std::vector<int> data = {1, 2, 3};
    Thread thread([&data]() { /* data may be gone */ });
    // function returns, data destroyed
}

// GOOD: join before return, or capture by value
void good()
{
    std::vector<int> data = {1, 2, 3};
    Thread thread([data]() { /* safe copy */ });
    thread.join();
}
```

---

## Comparison with std::thread

| Feature                  | `join::Thread`         | `std::thread`            |
| ------------------------ | ---------------------- | ------------------------ |
| Move semantics           | ✅                      | ✅                        |
| Core affinity            | ✅ Built-in             | ❌ Manual                |
| Real-time priority       | ✅ Built-in             | ❌ Manual                |
| Thread cancellation      | ✅ Built-in             | ❌ Manual                |
| Non-blocking join        | ✅ `tryJoin()`          | ❌ No                    |
| Running state check      | ✅ `running()`          | ❌ No                    |
| Auto-cancel on destroy   | ✅                      | ⚠️ Terminates program    |

---

## Summary

| Feature                  | Supported |
| ------------------------ | :-------: |
| Thread creation          | ✅         |
| Lambda support           | ✅         |
| Member function support  | ✅         |
| Core affinity            | ✅         |
| Real-time priority       | ✅         |
| Move semantics           | ✅         |
| Non-blocking join        | ✅         |
| Running state check      | ✅         |
| Thread cancellation      | ✅         |
| RAII cleanup             | ✅         |
