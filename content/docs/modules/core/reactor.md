---

title: "Reactor"
weight: 160
---

# Reactor

Join provides an **event-driven I/O reactor** built on top of Linux `epoll`.
The reactor implements the **Reactor pattern** for handling asynchronous events from multiple sources using a lock-free command queue and a dedicated dispatcher thread.

The reactor is:

* **event-driven** — asynchronous I/O multiplexing via `epoll`
* **lock-free** — commands are dispatched through an `Mpsc` queue
* **thread-safe** — `addHandler` / `delHandler` are safe to call from any thread
* **synchronous or fire-and-forget** — caller can optionally wait for completion

Two classes are provided:

* **`Reactor`** — the event loop itself; can be embedded or run manually
* **`ReactorThread`** — singleton wrapper that owns a `Reactor` running on a dedicated background thread

---

## Architecture

Commands (Add, Del, Stop) are pushed into a lock-free `Mpsc` queue and signalled via an `eventfd`.
The dispatcher thread wakes on the `eventfd`, drains the command queue first, then dispatches any pending I/O events.
This ordering guarantees that a handler is fully registered before any of its events are dispatched.

---

## Event handler interface

Custom event handlers inherit from `EventHandler` and override the relevant callbacks.
All callbacks have default no-op implementations — override only what you need.
Each callback receives the file descriptor that triggered the event.

```cpp
#include <join/reactor.hpp>

using namespace join;

class MyHandler : public EventHandler
{
protected:
    void onReceive(int fd) override
    {
        // called when data is ready to read (EPOLLIN)
    }

    void onClose(int fd) override
    {
        // called when peer closed the connection (EPOLLRDHUP | EPOLLHUP)
    }

    void onError(int fd) override
    {
        // called when an error occurred on the fd (EPOLLERR)
    }
};
```

`EventHandler` supports copy and move — derived classes must manage their own file descriptor lifetime.

---

## ReactorThread — singleton usage

`ReactorThread` is the recommended entry point for most applications.
It owns a `Reactor` and a background `Thread` that runs the event loop.
The singleton is created on first access and destroyed on program exit.

```cpp
#include <join/reactor.hpp>

using namespace join;

// Register a handler for file descriptor fd
ReactorThread::reactor()->addHandler(fd, &myHandler);

// Remove the handler
ReactorThread::reactor()->delHandler(fd);
```

### Thread configuration

The dispatcher thread can be pinned and given a real-time priority:

```cpp
// pin to core 2
ReactorThread::affinity(2);

// set SCHED_FIFO priority 50
ReactorThread::priority(50);

// get the pthread handle
pthread_t h = ReactorThread::handle();
```

### Memory optimisation

The internal command queue memory can be bound to a NUMA node or locked in RAM:

```cpp
ReactorThread::mbind(0);   // bind to NUMA node 0 (requires JOIN_HAS_NUMA)
ReactorThread::mlock();    // lock queue memory in RAM
```

---

## Reactor — direct usage

`Reactor` can also be used standalone when you need full control over the event loop thread.

```cpp
Reactor reactor;

// run the event loop on the current thread (blocking)
reactor.run();

// stop from another thread
reactor.stop();
```

`run()` blocks until `stop()` is called. It records the calling thread's ID so that `addHandler` / `delHandler` called from within the loop bypass the command queue and operate directly.

### Adding and removing handlers

```cpp
// synchronous (default): caller spins until the dispatcher confirms
reactor.addHandler(fd, &handler);   // sync = true
reactor.delHandler(fd);             // sync = true

// fire-and-forget: returns immediately
reactor.addHandler(fd, &handler, false);
reactor.delHandler(fd, false);
```

In synchronous mode the caller busy-waits using `Backoff` until the dispatcher thread signals completion.

---

## Event dispatching

The reactor monitors registered file descriptors and dispatches `epoll` events to their handlers:

| epoll event              | Callback triggered  |
| ------------------------ | ------------------- |
| `EPOLLIN`                | `onReceive(int fd)` |
| `EPOLLRDHUP / EPOLLHUP`  | `onClose(int fd)`   |
| `EPOLLERR`               | `onError(int fd)`   |

Events are dispatched **after** all pending commands have been processed in the same `epoll_wait` cycle. A handler that has been removed but still appears in the event batch is silently skipped via the `_deleted` set.

---

## Lifecycle and shutdown

`ReactorThread` destructor calls `reactor.stop()` then joins the dispatcher thread — all in-flight callbacks complete before destruction.

`Reactor` destructor calls `stop()` and closes the `epoll` and `eventfd` file descriptors.

```cpp
{
    ReactorThread::reactor()->addHandler(fd, &handler);

    // ... application runs ...

    ReactorThread::reactor()->delHandler(fd);

    // singleton destroyed on exit: stop() + join()
}
```

---

## Using Reactor with a thread pool

`Reactor` can be run from a worker thread pushed into a `ThreadPool`.
This lets you configure affinity and priority from inside the lambda before handing control to the event loop.

```cpp
#include <join/reactor.hpp>
#include <join/threadpool.hpp>

using namespace join;

Reactor reactor;

// register handlers before starting the loop (fire-and-forget, no dispatcher yet)
reactor.addHandler(fd1, &handler1, false);
reactor.addHandler(fd2, &handler2, false);

// push the event loop into the pool
pool.push([&reactor]() {
    Thread::affinity(pthread_self(), 2);   // pin this worker to core 2
    Thread::priority(pthread_self(), 60);  // SCHED_FIFO priority 60
    reactor.run();                         // blocks until reactor.stop()
});

// ... application runs ...

reactor.stop();
```

`reactor.run()` blocks the worker for the lifetime of the event loop.
`reactor.stop()` can be called from any thread — it uses the same lock-free command queue as `addHandler` / `delHandler`.

---

## isReactorThread

`Reactor::isReactorThread()` returns `true` when called from the dispatcher thread itself.
This is used internally to bypass the command queue when `addHandler` / `delHandler` are called from within a callback:

```cpp
void onReceive(int fd) override
{
    // safe to call addHandler/delHandler here — bypass is automatic
    _reactor->addHandler(newFd, &anotherHandler);
}
```

---

## Best practices

* **Keep callbacks short and non-blocking** — all callbacks run on the single dispatcher thread; blocking stalls the entire reactor
* **Remove handlers before destroying them** — call `delHandler(fd)` in sync mode to ensure the handler is no longer referenced before its destructor runs
* **Use `ReactorThread` for most cases** — it handles thread lifetime automatically
* **Use `Reactor::run()` directly** when you need to embed the event loop in your own thread
* **Pin the dispatcher thread** with `ReactorThread::affinity()` on latency-sensitive systems
* **Lock the command queue** with `ReactorThread::mlock()` to eliminate page faults on the hot path

---

## Summary

| Feature                         | Supported |
| ------------------------------- | :-------: |
| `epoll`-based I/O multiplexing  | ✅        |
| Lock-free command queue (Mpsc)  | ✅        |
| Synchronous add/del             | ✅        |
| Fire-and-forget add/del         | ✅        |
| Safe removal during dispatch    | ✅        |
| Dedicated background thread     | ✅ (`ReactorThread`) |
| Embeddable event loop           | ✅ (`Reactor::run()`) |
| Core affinity control           | ✅        |
| Real-time priority control      | ✅        |
| NUMA binding                    | ✅        |
| Memory locking                  | ✅        |
