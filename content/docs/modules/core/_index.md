---
title: "Core"
weight: 10
bookCollapseSection: true
---

# Core Module

The **Core** module provides the fundamental building blocks and runtime primitives for the Join framework. It includes networking, concurrency, I/O, and utility components.

---

## 🌐 Networking

### MAC Address

48-bit MAC address representation with parsing, formatting, and comparison.

### IP Address

IP address abstraction supporting both IPv4 and IPv6: parsing, formatting, network and broadcast address calculation, and comparison.

### Endpoints

Network endpoint representation combining an IP address and a port, with support for both address families.

### Protocol

Protocol definitions and type system for the different socket kinds.

### Sockets

Socket abstractions for various protocols:

- **TCP** — stream-oriented reliable connections
- **UDP** — connectionless datagram protocol
- **TLS/SSL** — encrypted secure communications
- **Unix Domain** — inter-process communication (stream and datagram)
- **Raw** — direct IP packet access
- **ICMP** — Internet Control Message Protocol
- **Netlink** — Linux kernel communication

### Acceptors

Server-side socket abstractions for accepting incoming connections: TCP, TLS, and Unix stream.

### Socket Streams

Buffered stream interface for sockets with `std::iostream` integration, including stream operators (`<<`, `>>`).

---

## ⚡ Reactor

Event-driven I/O multiplexing built on Linux `epoll`:

- **`Reactor`** — embeddable event loop; call `run()` to start, `stop()` to terminate
- **`ReactorThread`** — singleton wrapper that owns a `Reactor` on a dedicated background thread
- **`EventHandler`** — interface for I/O event callbacks (`onReceive`, `onClose`, `onError`)

See [Reactor]({{< ref "reactor" >}}) for full documentation.

---

## 🧵 Threading & Concurrency

### Thread

POSIX thread wrapper with core affinity, real-time priority, move semantics, non-blocking join (`tryJoin`), and running state query.

See [Thread]({{< ref "thread" >}}) for full documentation.

### Thread Pool

Worker pool for parallel task execution. Default worker count is based on `CpuTopology` (physical core count). Provides `distribute()` and `parallelForEach()` parallel algorithms.

See [Thread Pool]({{< ref "threadpool" >}}) for full documentation.

### CPU Topology

Runtime detector for the physical CPU layout: sockets, cores, hardware threads (SMT/HT), and NUMA nodes. Read from Linux sysfs. Used internally by `ThreadPool` and `distribute()`.

See [CPU Topology]({{< ref "cpu" >}}) for full documentation.

### Mutex

- **`Mutex`** — standard mutual exclusion lock
- **`RecursiveMutex`** — re-entrant locking for the same thread
- **`SharedMutex`** — inter-process synchronization via shared memory

### Condition Variables

- **`Condition`** — standard condition variable
- **`SharedCondition`** — condition variable for shared memory

### Semaphore

- **`Semaphore`** — counting semaphore (named and unnamed)
- **`SharedSemaphore`** — semaphore for shared memory

---

## 🔄 Lock-Free Queues & Allocator

High-performance lock-free primitives built on top of the memory backends:

- **`Spsc`** — single-producer / single-consumer queue (lowest overhead)
- **`Mpsc`** — multi-producer / single-consumer queue
- **`Mpmc`** — multi-producer / multi-consumer queue
- **`BasicArena`** — lock-free slab allocator with multiple fixed-size pools

Backed by either **`LocalMem`** (anonymous private memory) or **`ShmMem`** (POSIX shared memory). Supports blocking and non-blocking push/pop, NUMA binding, and memory locking.

See [Memory]({{< ref "memory" >}}), [Queue]({{< ref "queue" >}}), [Allocator]({{< ref "allocator" >}}), and [Backoff]({{< ref "backoff" >}}) for full documentation.

---

## ⏱️ Timers

High-resolution timers built on Linux `timerfd`, integrated with the reactor:

- **`Monotonic::Timer`** — uses `CLOCK_MONOTONIC`, unaffected by system clock changes
- **`RealTime::Timer`** — uses `CLOCK_REALTIME`, follows wall-clock adjustments

Supports one-shot, absolute time-point, and periodic modes. Nanosecond precision.

See [Timer]({{< ref "timer" >}}) for full documentation.

---

## 🗂️ Utilities

### File System

File I/O helpers, path manipulation, and file status queries.

### Variant

Type-safe union implementation with exception-safe operations and comparison operators.

### Traits

Compile-time type utilities: parameter pack manipulation (`find_index`, `find_element`, `match_t`), type checking (`is_unique`, `is_alternative`, `count`), and constructor control (`EnableDefault`).

### Utils

General-purpose utilities: byte order conversion, string manipulation (`trim`, `split`, `replace`, case-insensitive compare), benchmarking, and random generation.

### OpenSSL

OpenSSL library management and RAII smart pointer wrappers.

---

## 🚨 Error Handling

Custom error handling system: error category, thread-local error state (`join::lastError`), integration with `std::error_code`, and OpenSSL error integration.

---

## 📚 API Reference

[Doxygen Reference](https://joinframework.github.io/join/)
