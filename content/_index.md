---
title: "Join Framework"
description: "A lightweight C++ network framework library"
---

# Welcome to Join Framework

**Join** is a modern, lightweight C++ framework designed for building high-performance network applications. Built with simplicity and efficiency in mind, Join provides a comprehensive set of tools for network programming, cryptography, multithreading, and data serialization.

## Why Join?

- **High Performance**: Zero-copy operations and efficient memory management
- **Modern C++**: Leverages contemporary C++ features for clean, expressive code
- **Production Ready**: Thoroughly tested with high code coverage
- **MIT Licensed**: Free to use in both open source and commercial projects

## Key Features

- **Asynchronous I/O**: Powerful reactor pattern for handling thousands of concurrent connections
- **TLS/SSL Support**: Secure network communication with OpenSSL integration
- **HTTP/HTTPS**: Built-in client and server implementations
- **Thread-Safe**: Lock-free queues and thread pool for concurrent programming
- **JSON & MessagePack**: Fast serialization and deserialization

## Getting Started

New to Join? Start with our [Quick Start Guide]({{< ref "docs/quickstart" >}}) to get up and running in minutes.

## Explore the Modules

Join is organized into five core modules, each addressing specific needs:

- [**Core**]({{< ref "docs/modules/core" >}}): Essential utilities, reactor pattern, timers, thread-safe queues and more ...
- [**Network**]({{< ref "docs/modules/network" >}}): Socket abstractions, HTTP/SMTP clients and servers, DNS resolution
- [**Crypto**]({{< ref "docs/modules/crypto" >}}): Cryptographic functions including hashing, HMAC, signatures, and Base64
- [**Sax**]({{< ref "docs/modules/sax" >}}): High-performance JSON and MessagePack parsers
- [**Thread**]({{< ref "docs/modules/thread" >}}): Threading primitives and thread pool

## Community & Support

- **GitHub**: [joinframework/join](https://github.com/joinframework/join)
- **API Documentation**: [Doxygen](https://joinframework.github.io/join/index.html)
- **Issues**: Report bugs and request features on [GitHub Issues](https://github.com/joinframework/join/issues)

## License

Join Framework is released under the [MIT License](https://choosealicense.com/licenses/mit/), making it free for both personal and commercial use.
