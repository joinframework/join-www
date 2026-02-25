---
title: "Join Framework"
---

# ✨ Welcome to Join Framework

**Join** is a **modular C++ network runtime framework for Linux**, designed for optimized throughput and latency in system-level networking.

It provides a set of composable libraries covering networking primitives, concurrency, serialization, cryptography, and Linux network fabric management.

---

## 🚀 Design Goals

- Linux-native networking (sockets, netlink, raw sockets)
- Event-driven and reactor-based architecture
- Low-jitter event processing
- Strong separation of concerns via modular libraries
- High test coverage and correctness-first design

---

## 🎯 Target Use Cases

**Designed for:**
- Network services and microservices
- Control plane and infrastructure components
- System-level networking tools
- High-performance servers (web, RPC, messaging)

**Not designed for:**
- Sub-microsecond latency requirements (HFT, market data)
- Kernel-bypass networking (use DPDK or RDMA instead)
- Data plane packet processing at 100 Gbps

---

## 🏗 Modular Architecture

The framework is a collection of specialized modules that build upon one another:

| Module | Purpose | Highlights |
| :--- | :--- | :--- |
| **[`core`]({{< ref "core" >}})** | **Foundation** | Epoll Reactor, TCP/UDP/TLS, Unix Sockets, Thread Pools, Lock-Free Queues & Allocator |
| **[`fabric`]({{< ref "fabric" >}})** | **Network Control** | Netlink Interface Manager, ARP client, DNS Resolver |
| **[`crypto`]({{< ref "crypto" >}})** | **Security** | OpenSSL Wrappers, HMAC, Digital Signatures, Base64 |
| **[`data`]({{< ref "data" >}})** | **Serialization** | High-perf JSON (DOM/SAX), MessagePack, Zlib Streams |
| **[`services`]({{< ref "services" >}})** | **Protocols** | HTTP/1.1 (Client/Server), SMTP, Mail Parsing |

---

## 🛠️ Getting Started

New to Join? Start with our [Quick Start Guide]({{< ref "quickstart" >}}) to get up and running in minutes.

---

## 📊 Quality

Every commit is validated against an extensive test suite to ensure stability in concurrent environments:

- **1000+ unit tests** covering networking, concurrency, and data parsing
- **Continuous security scanning** via Codacy and GitHub Security workflows

---

## 📖 Resources

- **API Reference:** [Doxygen](https://joinframework.github.io/join/index.html)
- **GitHub:** [joinframework/join](https://github.com/joinframework/join)
- **Issues:** [Report bugs and request features](https://github.com/joinframework/join/issues)
- **License:** [MIT](https://choosealicense.com/licenses/mit/)
