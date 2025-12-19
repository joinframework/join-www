---
title: "Reactor"
weight: 4
---

# Reactor

Join provides an **event-driven I/O reactor** built on top of Linux `epoll`.
The reactor implements the **Reactor pattern** for handling asynchronous events from multiple sources.

The reactor is:

* **event-driven** — asynchronous I/O multiplexing
* **thread-safe** — automatic thread management
* **automatic** — starts/stops dispatcher thread as needed
* **singleton** — single global instance per process

---

## Architecture

The reactor monitors file descriptors and dispatches events to registered handlers:

```text
Reactor (epoll)
 ├─ EventHandler 1 (socket, timer, etc.)
 ├─ EventHandler 2
 └─ EventHandler N
```

When an event occurs on a monitored file descriptor, the reactor calls the appropriate callback on the handler.

---

## Event handler interface

Custom event handlers inherit from `EventHandler` and implement event callbacks:

```cpp
#include <join/reactor.hpp>

using join;

class MyHandler : public EventHandler {
public:
    int handle() const noexcept override {
        return _fd;
    }

protected:
    void onReceive() override {
        // Called when data is ready to read
    }

    void onClose() override {
        // Called when connection is closed
    }

    void onError() override {
        // Called when an error occurs
    }

private:
    int _fd;
};
```

---

## Registering handlers

### Adding a handler

```cpp
MyHandler handler;

if (Reactor::instance()->addHandler(&handler) == -1) {
    // Handle error
}
```

The reactor automatically starts a dispatcher thread when the first handler is added.

### Removing a handler

```cpp
if (Reactor::instance()->delHandler(&handler) == -1) {
    // Handle error
}
```

The reactor automatically stops the dispatcher thread when the last handler is removed.

---

## Event callbacks

### `onReceive()`

Called when the file descriptor is **readable** (data available):

```cpp
void onReceive() override {
    char buffer[1024];
    ssize_t n = read(handle(), buffer, sizeof(buffer));
    if (n > 0) {
        // Process data
    }
}
```

### `onClose()`

Called when the connection is **closed** by the peer:

```cpp
void onClose() override {
    std::cout << "Connection closed\n";
    // Cleanup resources
}
```

### `onError()`

Called when an **error** occurs on the file descriptor:

```cpp
void onError() override {
    std::cerr << "Error on descriptor " << handle() << "\n";
    // Handle error condition
}
```

---

## Built-in components

Several Join components automatically integrate with the reactor:

### Timers

```cpp
Monotonic::Timer timer;
timer.setOneShot(std::chrono::seconds(5), []() {
    std::cout << "Timer fired\n";
});
// Timer is automatically registered with the reactor
```

### Sockets

Sockets inherit from `EventHandler` and must be manually registered:

```cpp
Tcp::Socket socket;
socket.connect(endpoint);

// Register with reactor to receive events
Reactor::instance()->addHandler(&socket);
```

---

## Lifecycle management

### Automatic thread management

The reactor handles its dispatcher thread automatically:

* **First handler added** → dispatcher thread starts
* **Last handler removed** → dispatcher thread stops
* **Reactor destroyed** → dispatcher thread joins gracefully

### Thread safety

The reactor is thread-safe:

```cpp
std::thread t1([&]() {
    Reactor::instance()->addHandler(&handler1);
});

std::thread t2([&]() {
    Reactor::instance()->addHandler(&handler2);
});
```

---

## Singleton pattern

The reactor uses a singleton pattern accessed via `Reactor::instance()`:

```cpp
Reactor* reactor = Reactor::instance();
reactor->addHandler(&handler);
```

There is **one reactor per process** that all components share.

---

## Event dispatching

### Event types monitored

The reactor monitors these `epoll` events:

* `EPOLLIN` → data ready to read → `onReceive()`
* `EPOLLRDHUP` / `EPOLLHUP` → connection closed → `onClose()`
* `EPOLLERR` → error occurred → `onError()`

### Dispatch loop

The reactor runs an event loop in a dedicated thread:

```cpp
while (running) {
    int nset = epoll_wait(epoll_fd, events, ...);
    
    for (int i = 0; i < nset; ++i) {
        EventHandler* handler = events[i].data.ptr;
        
        if (events[i].events & EPOLLERR) {
            handler->onError();
        } else if (events[i].events & EPOLLRDHUP) {
            handler->onClose();
        } else if (events[i].events & EPOLLIN) {
            handler->onReceive();
        }
    }
}
```

---

## Best practices

* **Keep callbacks short** — avoid blocking operations in event handlers
* **Handle all event types** — implement `onReceive()`, `onClose()`, and `onError()`
* **Proper cleanup** — remove handlers before destroying them
* **Thread awareness** — callbacks execute in the reactor's dispatcher thread
* **No manual threading** — let the reactor manage the dispatch thread

---

## Example usage

### Custom event handler

```cpp
#include <join/reactor.hpp>
#include <unistd.h>
#include <fcntl.h>

class FileWatcher : public EventHandler {
public:
    FileWatcher(const std::string& path) {
        _fd = open(path.c_str(), O_RDONLY | O_NONBLOCK);
        Reactor::instance()->addHandler(this);
    }

    ~FileWatcher() {
        Reactor::instance()->delHandler(this);
        close(_fd);
    }

    int handle() const noexcept override {
        return _fd;
    }

protected:
    void onReceive() override {
        char buffer[4096];
        ssize_t n = read(_fd, buffer, sizeof(buffer));
        if (n > 0) {
            std::cout << "Read " << n << " bytes\n";
        }
    }

    void onError() override {
        std::cerr << "Error reading file\n";
    }

private:
    int _fd;
};

// Usage
FileWatcher watcher("/tmp/myfile");
// Reactor automatically monitors file and calls onReceive()
```

---

## Summary

| Feature                      | Supported |
| ---------------------------- | --------- |
| Event-driven I/O             | ✅         |
| Automatic thread management  | ✅         |
| Thread-safe operations       | ✅         |
| Multiple event types         | ✅         |
| Singleton pattern            | ✅         |
| Built-in component integration | ✅       |
