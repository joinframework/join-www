---
title: "Modules"
weight: 20
---

# Modules

Join is organized into five specialized modules, each addressing specific needs in building high-performance networked applications.

This modular organization provides:

* clear separation of concerns
* easy navigation through the codebase
* logical grouping of related functionality

---

## 🏗️ Core Module

**Foundation components and runtime primitives**

The core module provides essential building blocks including the epoll-based reactor, socket abstractions (TCP, UDP, TLS, Unix), threading primitives, lock-free queues, a lock-free arena allocator, timers, and utilities.

**Key Components:**
- Reactor pattern with epoll
- TCP/UDP/TLS sockets
- Thread pools and synchronization
- Lock-free shared memory queues
- Lock-free arena allocator (slab pools)
- High-precision timers

👉 See: [Core Module]({{< ref "core" >}})

---

## 🌐 Fabric Module

**Network control and Linux fabric management**

The fabric module provides full control over the Linux network stack via Netlink: interface, route, and neighbor cache management, ARP resolution, and DNS/mDNS resolution and serving.

**Key Components:**
- Netlink-based interface manager with link and address notifications
- Route manager with route notifications
- Neighbor (ARP/NDP) cache manager with neighbor notifications
- ARP client (IPv4 MAC resolution)
- DNS/DoT resolver (`Dns::Resolver`, `Dot::Resolver`)
- DNS name server (`Dns::NameServer`)
- mDNS peer (`Mdns::Peer`)

👉 See: [Fabric Module]({{< ref "fabric" >}})

---

## 🔐 Crypto Module

**Security and cryptographic operations**

The crypto module offers cryptographic functions built on OpenSSL, including hashing, HMAC, digital signatures, and encoding utilities.

**Key Components:**
- Hash functions (MD5, SHA-1/224/256/384/512)
- HMAC with stream support
- Digital signatures (RSA, DSA, ECDSA, EdDSA)
- Base64 encoding/decoding

👉 See: [Crypto Module]({{< ref "crypto" >}})

---

## 📊 Data Module

**High-performance serialization**

The data module provides fast JSON and MessagePack parsers with both DOM and SAX-style interfaces, plus compression support.

**Key Components:**
- High-performance JSON parser (DOM/SAX)
- MessagePack binary format
- Zlib compression streams
- Dynamic value containers

👉 See: [Data Module]({{< ref "data" >}})

---

## 🚀 Services Module

**Application protocols**

The services module implements common application-layer protocols including HTTP/HTTPS client and server, SMTP/SMTPS client, and chunked transfer encoding.

**Key Components:**
- HTTP/1.1 client and server
- SMTP/SMTPS email client
- Chunked transfer encoding
- Mail message construction

👉 See: [Services Module]({{< ref "services" >}})

---

## Internal Structure

The framework code is internally organized with dependencies between modules:

```text
 ├─ Core (foundation)
 ├─ Crypto
 ├─ Fabric
 ├─ Data
 └─ Services
```

---

## Next Steps

* Start with the [Core Module]({{< ref "core" >}})
* Explore each module documentation for details
* Refer to the [Doxygen documentation](https://joinframework.github.io/join/) for API reference
