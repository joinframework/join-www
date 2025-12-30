---
title: "Thread"
weight: 10
---

# Thread

Join provides a **thread management class** built on top of POSIX threads.
The `Thread` class offers a simple interface for **creating and managing threads** with support for move semantics and non-blocking join operations.

Thread features:

* **callable objects** — accepts functions, lambdas, and functors
* **move semantics** — efficient thread ownership transfer
* **non-blocking join** — check completion without blocking
* **thread cancellation** — request thread termination
* **RAII-compliant** — automatic cleanup on destruction

---

## Creating threads

### Basic thread creation

```cpp
#include <join/thread.hpp>

using join;

void worker() {
    // Thread work
}

Thread thread(worker);
thread.join();  // Wait for completion
```

### With lambda

```cpp
Thread thread([]() {
    std::cout << "Thread running\n";
});

thread.join();
```

### With arguments

```cpp
void task(int id, const std::string& name) {
    std::cout << "Task " << id << ": " << name << "\n";
}

Thread thread(task, 42, "worker");
thread.join();
```

### With member functions

```cpp
class Worker {
public:
    void process(int value) {
        // Process value
    }
};

Worker worker;
Thread thread(&Worker::process, &worker, 100);
thread.join();
```

---

## Thread operations

### Join

Block until thread completes:

```cpp
Thread thread([]() {
    std::this_thread::sleep_for(std::chrono::seconds(2));
});

thread.join();  // Blocks for ~2 seconds
// Thread completed
```

### Try join (non-blocking)

Check if thread completed without blocking:

```cpp
Thread thread([]() {
    std::this_thread::sleep_for(std::chrono::seconds(2));
});

if (thread.tryJoin()) {
    // Thread already completed
} else {
    // Thread still running
    // Do other work...
    thread.join();  // Wait later
}
```

### Cancel

Request thread cancellation:

```cpp
Thread thread([]() {
    while (true) {
        // Long-running work
    }
});

std::this_thread::sleep_for(std::chrono::seconds(1));
thread.cancel();  // Request cancellation and wait for termination
```

**Note:** Cancellation uses `pthread_cancel`, which may not work as expected if the thread doesn't reach a cancellation point. Consider cooperative cancellation patterns instead.

---

## Thread state

### Joinable

Check if thread has an associated execution:

```cpp
Thread thread1;  // Default constructed
bool j1 = thread1.joinable();  // false

Thread thread2([]() {});
bool j2 = thread2.joinable();  // true

thread2.join();
bool j3 = thread2.joinable();  // false (after join)
```

### Running

Check if thread is currently executing:

```cpp
Thread thread([]() {
    std::this_thread::sleep_for(std::chrono::seconds(2));
});

bool r1 = thread.running();  // true

std::this_thread::sleep_for(std::chrono::seconds(3));
bool r2 = thread.running();  // false (completed)

thread.join();  // Safe, thread already done
```

---

## Move semantics

Threads support move operations for ownership transfer:

```cpp
Thread createThread() {
    return Thread([]() {
        // Work
    });
}

Thread thread1 = createThread();  // Move construction

Thread thread2;
thread2 = std::move(thread1);  // Move assignment

// thread1 is now empty (not joinable)
// thread2 owns the thread
```

### Swap

```cpp
Thread thread1(task1);
Thread thread2(task2);

thread1.swap(thread2);  // Swap ownership

thread1.join();  // Joins what was thread2
thread2.join();  // Joins what was thread1
```

---

## Usage patterns

### Simple task execution

```cpp
void processData(const std::vector<int>& data) {
    Thread thread([&data]() {
        // Process in background
        for (int value : data) {
            // Heavy computation
        }
    });
    
    // Do other work
    
    thread.join();  // Wait for background processing
}
```

---

### Thread pool

```cpp
class ThreadPool {
public:
    ThreadPool(size_t numThreads) {
        for (size_t i = 0; i < numThreads; ++i) {
            _threads.emplace_back([this]() { worker(); });
        }
    }
    
    ~ThreadPool() {
        _stop = true;
        for (auto& thread : _threads) {
            thread.join();
        }
    }
    
    void submit(std::function<void()> task) {
        ScopedLock<Mutex> lock(_mutex);
        _tasks.push(std::move(task));
    }
    
private:
    void worker() {
        while (!_stop) {
            std::function<void()> task;
            
            {
                ScopedLock<Mutex> lock(_mutex);
                if (_tasks.empty()) {
                    std::this_thread::sleep_for(std::chrono::milliseconds(10));
                    continue;
                }
                task = std::move(_tasks.front());
                _tasks.pop();
            }
            
            task();
        }
    }
    
    std::vector<Thread> _threads;
    std::queue<std::function<void()>> _tasks;
    Mutex _mutex;
    std::atomic_bool _stop{false};
};
```

---

### Parallel computation

```cpp
void parallelSum(const std::vector<int>& data) {
    size_t mid = data.size() / 2;
    int sum1 = 0, sum2 = 0;
    
    Thread thread([&]() {
        for (size_t i = 0; i < mid; ++i) {
            sum1 += data[i];
        }
    });
    
    for (size_t i = mid; i < data.size(); ++i) {
        sum2 += data[i];
    }
    
    thread.join();
    
    int total = sum1 + sum2;
    std::cout << "Total: " << total << "\n";
}
```

---

### Background monitoring

```cpp
class Monitor {
public:
    Monitor() : _running(true) {
        _thread = Thread([this]() {
            while (_running) {
                checkStatus();
                std::this_thread::sleep_for(std::chrono::seconds(1));
            }
        });
    }
    
    ~Monitor() {
        _running = false;
        _thread.join();
    }
    
private:
    void checkStatus() {
        // Monitor system status
    }
    
    Thread _thread;
    std::atomic_bool _running;
};
```

---

### Cooperative cancellation

Since `pthread_cancel` may not work reliably, use cooperative cancellation:

```cpp
class Task {
public:
    void start() {
        _stop = false;
        _thread = Thread([this]() { run(); });
    }
    
    void stop() {
        _stop = true;
        _thread.join();
    }
    
private:
    void run() {
        while (!_stop) {
            // Check _stop regularly
            // Do work
            
            if (_stop) break;
        }
    }
    
    Thread _thread;
    std::atomic_bool _stop{false};
};
```

---

## Best practices

* **Always join or cancel** — threads must be joined or canceled before destruction
* **Use RAII wrappers** — wrap threads in classes that manage their lifetime
* **Cooperative cancellation** — prefer flag-based cancellation over `pthread_cancel`
* **Check running state** — use `tryJoin()` for non-blocking completion checks
* **Move, don't copy** — threads are move-only, use `std::move()` for ownership transfer
* **Avoid exceptions in threads** — unhandled exceptions terminate the program
* **Synchronize shared data** — use mutexes to protect data accessed by multiple threads

---

## Common pitfalls

### Forgetting to join

```cpp
// BAD: thread destroyed before joining
{
    Thread thread(task);
    // Destructor cancels the thread!
}

// GOOD: explicitly join
{
    Thread thread(task);
    thread.join();
}
```

### Data races

```cpp
// BAD: race condition
int counter = 0;

Thread t1([&]() { ++counter; });
Thread t2([&]() { ++counter; });

t1.join();
t2.join();
// counter may not be 2!

// GOOD: use mutex
Mutex mutex;
int counter = 0;

Thread t1([&]() {
    ScopedLock<Mutex> lock(mutex);
    ++counter;
});

Thread t2([&]() {
    ScopedLock<Mutex> lock(mutex);
    ++counter;
});

t1.join();
t2.join();
// counter is definitely 2
```

### Dangling references

```cpp
// BAD: local variable destroyed before thread finishes
void bad() {
    std::vector<int> data = {1, 2, 3};
    
    Thread thread([&data]() {
        // data may be destroyed already!
        for (int x : data) { }
    });
    
    // Function returns, data destroyed, thread still running
}

// GOOD: join before return or copy data
void good() {
    std::vector<int> data = {1, 2, 3};
    
    Thread thread([data]() {  // Copy data
        for (int x : data) { }
    });
    
    thread.join();  // Or ensure thread completes
}
```

---

## Comparison with std::thread

| Feature               | join::Thread           | std::thread             |
| --------------------- | ---------------------- | ----------------------- |
| Move semantics        | ✅ Yes                  | ✅ Yes                   |
| Cancellation          | ✅ Built-in             | ❌ Manual               |
| Non-blocking join     | ✅ `tryJoin()`          | ❌ No                   |
| Running check         | ✅ `running()`          | ❌ No                   |
| Auto-cancel on destroy| ✅ Yes                  | ⚠️ Terminates program   |

---

## Summary

| Feature                  | Supported |
| ------------------------ | --------- |
| Thread creation          | ✅         |
| Lambda support           | ✅         |
| Member function support  | ✅         |
| Move semantics           | ✅         |
| Non-blocking join        | ✅         |
| Running state check      | ✅         |
| Thread cancellation      | ✅         |
| RAII cleanup             | ✅         |
