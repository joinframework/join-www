---
title: "Core"
weight: 1
bookCollapseSection: true
---

# Core

The **Core** module provides the fundamental building blocks and utilities used across the Join framework.

---

### Cache

File content caching using memory-mapped files (mmap).

**Features:**

* Memory-mapped file caching
* Automatic modification time tracking
* Thread-safe operations

---

### Error

Custom error handling system with error codes and conditions.

**Features:**

* Custom error category
* Thread-local error state
* Integration with std::error_code

---

### Reactor

Event-driven I/O multiplexing using epoll with singleton pattern.

**Features:**

* Non-blocking I/O event handling via EventHandler interface
* Automatic dispatcher thread management
* Event callbacks (onReceive, onClose, onError)

---

### Shared

Lock-free ring buffer implementations for inter-process communication via shared memory.

**Queue Types:**

* **SPSC** (Single Producer, Single Consumer) - Highest performance
* **MPSC** (Multiple Producer, Single Consumer) - Lock-free enqueue
* **MPMC** (Multiple Producer, Multiple Consumer) - Fully lock-free

**Features:**

* Shared memory based (shm_open/mmap)
* Bidirectional endpoints for IPC
* Blocking and non-blocking operations

---

### Timer

High-precision timers using timerfd with reactor integration.

**Timer Types:**

* **Monotonic** - Elapsed time, unaffected by clock changes
* **RealTime** - Wall-clock time for absolute scheduling

**Features:**

* One-shot and periodic timers
* Callback-based expiration handling
* Integration with reactor event loop

---

### Traits

Type traits and compile-time utilities for template metaprogramming.

**Features:**

* Parameter pack manipulation (find_index, find_element, match_t)
* Type checking (is_unique, is_alternative, count)
* Constructor control (EnableDefault)

---

### Utils

General-purpose utility functions and helpers.

**Features:**

* Byte order swapping (endianness conversion)
* String manipulation (trim, split, replace, case-insensitive compare)
* Utilities (dump, benchmark, random generation)

---

### Variant

Type-safe union implementation supporting multiple types.

**Features:**

* Type-safe value storage
* Exception-safe operations
* Comparison operators

---

### View

Non-owning views for efficient data access without copies.

**View Types:**

* **StringView** - Lightweight string view with seek support
* **StreamView** - Stream buffer view (seekable/non-seekable)
* **BufferingView** - Adapter with snapshot/consume operations

**Features:**

* Zero-copy data access
* Efficient parsing operations
* Predicate-based reading

---

### ZStream

Transparent zlib compression/decompression for streams.

**Features:**

* Compression levels 0-9
* Gzip format support
* Stream-based interface
* Efficient buffering

---

## API Reference

For detailed API documentation, see:

🔗 [Doxygen Core Module Reference](https://joinframework.github.io/join/)
