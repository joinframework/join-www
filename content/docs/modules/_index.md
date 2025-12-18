---
title: "Modules"
weight: 2
---

# Modules

Join is organized as a **modular C++ framework**. The codebase is structured into distinct modules, each focusing on a specific responsibility.

This modular organization provides:

* clear separation of concerns
* easy navigation through the codebase
* logical grouping of related functionality

## Available Modules

---

### Core

The **Core** module provides the fundamental building blocks used across the framework.

It includes:

* reactor pattern for asynchronous I/O
* timers (monotonic and real-time)
* thread-safe queues (SPSC, MPSC, MPMC)
* caching and filesystem utilities
* error handling and compression
* ...

👉 See: [Core Module](/docs/modules/core/)

---

### Network

The **Network** module provides comprehensive networking capabilities.

It includes:

* HTTP/HTTPS client and server
* SMTP/SMTPS email client
* sockets (TCP, UDP, Unix, Raw, ICMP, Netlink)
* DNS resolution
* network interface management
* ...

👉 See: [Network Module](/docs/modules/network/)

---

### Crypto

The **Crypto** module provides cryptographic primitives and security-related utilities.

It includes:

* Base64 encoding/decoding
* hash functions (MD5, SHA, BLAKE2, etc.)
* HMAC message authentication
* digital signatures (RSA, DSA, ECDSA, EdDSA)
* TLS key and certificate management
* ...

👉 See: [Crypto Module](/docs/modules/crypto/)

---

### Sax

The **Sax** module provides high-performance data serialization.

It includes:

* JSON reader and writer
* MessagePack reader and writer
* SAX-style event-driven parsing
* optimized numeric conversions
* ...

👉 See: [Sax Module](/docs/modules/sax/)

---

### Thread

The **Thread** module provides multithreading utilities and abstractions.

It includes:

* thread management
* mutexes (standard and recursive)
* condition variables and semaphores
* thread pools
* ...

👉 See: [Thread Module](/docs/modules/thread/)

---

## Internal Structure

The framework code is internally organized with dependencies between modules:

```text
 ├─ Core (foundation)
 ├─ Crypto
 ├─ Network
 ├─ Sax
 └─ Thread
```

---

## Next Steps

* Start with the [Core Module](/docs/modules/core/)
* Explore each module documentation for details
* Refer to the [Doxygen documentation](https://joinframework.github.io/join/) for API reference
