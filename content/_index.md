---
title: "Join Framework"
---

# Welcome to Join Framework

**Join** is a **modular C++ network runtime framework for Linux**, designed for **low-latency**, **high-throughput**, and **system-level networking**.

It provides a set of composable libraries covering networking primitives, concurrency, serialization, cryptography, and Linux network fabric management.

## 🎯 Design Goals

- Linux-native networking (sockets, netlink, raw sockets)
- Event-driven and reactor-based architecture
- Strong separation of concerns via modular libraries
- High test coverage and correctness-first design
- Suitable for infrastructure, control-plane, and runtime components

## 🚀 Why Join?

Join focuses on providing **robust, efficient building blocks** for:
- Network runtimes
- System services
- Control planes
- High-performance servers
- Infrastructure tooling

## 📦 Modular Architecture

The framework is a collection of specialized modules that build upon one another:

| Module | Purpose | Highlights |
| :--- | :--- | :--- |
| **[`core`]({{< ref "core" >}})** | **Foundation** | Epoll Reactor, TCP/UDP/TLS, Unix Sockets, Thread Pools, Mutexes |
| **[`fabric`]({{< ref "fabric" >}})** | **Network Control** | Netlink Interface Manager, ARP client, DNS Resolver |
| **[`crypto`]({{< ref "crypto" >}})** | **Security** | OpenSSL Wrappers, HMAC, Digital Signatures, Base64 |
| **[`data`]({{< ref "data" >}})** | **Serialization** | High-perf JSON (DOM/SAX), MessagePack, Zlib Streams |
| **[`services`]({{< ref "services" >}})** | **Protocols** | HTTP/1.1 (Client/Server), SMTP, Mail Parsing |

## 🛠️ Getting Started

New to Join? Start with our [Quick Start Guide]({{< ref "quickstart" >}}) to get up and running in minutes.

## 📊 Quality & Performance

* **1000+ Unit Tests** covering networking, concurrency, and data parsing
* **Security:** Continuous scanning via Codacy and GitHub Security workflows

## 📚 Resources

- **API Documentation**: [Doxygen](https://joinframework.github.io/join/index.html)
- **GitHub**: [joinframework/join](https://github.com/joinframework/join)
- **Issues**: [Report bugs and request features](https://github.com/joinframework/join/issues)

## License

Join Framework is released under the [MIT License](https://choosealicense.com/licenses/mit/), making it free for both personal and commercial use.
