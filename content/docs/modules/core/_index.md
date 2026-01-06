---
title: "Core"
weight: 1
bookCollapseSection: true
---

# Core Module

The **Core** module provides the fundamental building blocks and runtime primitives for the Join framework. It includes networking, concurrency, I/O, and utility components.

---

## 🌐 Networking

### MAC Address

Media Access Control address handling:

- 48-bit MAC address representation
- Parsing and formatting
- Address comparison

### IP Address

IP address abstraction supporting both IPv4 and IPv6:

- Address parsing and formatting
- Network/broadcast address calculation
- Address comparison

### Endpoints

Network endpoint representation (IP address + port):

- IPv4 and IPv6 support
- Address family handling
- Endpoint comparison and formatting

### Protocol

Protocol definitions and type system for different socket types.

### Sockets

Comprehensive socket abstractions for various protocols:

- **TCP Sockets** - Stream-oriented reliable connections
- **UDP Sockets** - Connectionless datagram protocol
- **TLS/SSL Sockets** - Encrypted secure communications
- **Unix Domain Sockets** - Inter-process communication (stream and datagram)
- **Raw Sockets** - Direct IP packet access
- **ICMP Sockets** - Internet Control Message Protocol
- **Netlink Sockets** - Linux kernel communication

### Acceptors

Server socket abstractions for accepting incoming connections:

- TCP Acceptor
- TLS Acceptor
- Unix Stream Acceptor

### Socket Streams

Stream interface for sockets with std::iostream integration:

- Buffered I/O
- Stream operators (<<, >>)
- Compatible with standard stream algorithms

---

## ⚡ Reactor Pattern

Event-driven I/O multiplexing using Linux epoll:

- **Reactor** - Singleton event loop with automatic dispatcher thread
- **EventHandler** - Interface for I/O event callbacks
- Non-blocking I/O event handling
- Event callbacks: onReceive, onClose, onError

---

## 🧵 Threading & Concurrency

### Thread

POSIX thread wrapper with modern C++ semantics:

- Move semantics (non-copyable)
- Join, tryJoin, cancel operations
- Running state queries

### Thread Pool

Worker pool for parallel task execution:

- Configurable worker count (default: hardware_concurrency)
- Task queue with condition variables
- Template-based task submission

**Utilities:**
- `distribute` - Distribute work across threads
- `parallelForEach` - Parallel iteration

### Mutex

Mutual exclusion locks for protecting shared data:

- **Mutex** - Standard mutex
- **RecursiveMutex** - Recursive locking (same thread can lock multiple times)
- **SharedMutex** - Inter-process synchronization via shared memory

### Condition Variables

Thread synchronization primitives:

- **Condition** - Standard condition variable
- **SharedCondition** - Condition variable for shared memory

### Semaphore

Counting semaphore for resource management:

- **Semaphore** - Named and unnamed semaphores
- **SharedSemaphore** - Semaphore for shared memory

---

## 🔄 Lock-Free Queues

High-performance lock-free ring buffer implementations for inter-process communication:

### Queue Types

- **SPSC** (Single Producer, Single Consumer) - Highest performance
- **MPSC** (Multiple Producer, Single Consumer) - Lock-free enqueue
- **MPMC** (Multiple Producer, Multiple Consumer) - Fully lock-free

### Features

- Shared memory based (shm_open/mmap)
- Bidirectional endpoints for IPC
- Blocking and non-blocking operations
- Zero-copy semantics where possible

---

## ⏱️ Timers

High-precision timers using timerfd with reactor integration:

### Timer Types

- **Monotonic Timer** - Elapsed time, unaffected by clock changes
- **RealTime Timer** - Wall-clock time for absolute scheduling

### Features

- One-shot and periodic timers
- Callback-based expiration handling
- Nanosecond precision
- Integration with reactor event loop

---

## 🗂️ Utilities

### File System

File system utilities and operations:

- File I/O helpers
- Path manipulation
- File status queries

### Variant

Type-safe union implementation supporting multiple types:

- Type-safe value storage
- Exception-safe operations
- Comparison operators

### Traits

Type traits and compile-time utilities for template metaprogramming:

- Parameter pack manipulation (find_index, find_element, match_t)
- Type checking (is_unique, is_alternative, count)
- Constructor control (EnableDefault)

### Utils

General-purpose utility functions:

- Byte order swapping (endianness conversion)
- String manipulation (trim, split, replace, case-insensitive compare)
- Utilities (dump, benchmark, random generation)


### OpenSSL

OpenSSL library management and smart pointers.

---

## 🚨 Error Handling

Custom error handling system with error codes and conditions:

- Custom error category
- Thread-local error state
- Integration with std::error_code
- OpenSSL error integration

---

## 📚 API Reference

For detailed API documentation, see:

[Doxygen Reference](https://joinframework.github.io/join/)
