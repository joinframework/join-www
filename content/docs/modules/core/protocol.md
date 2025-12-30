---

title: "Protocol"
weight: 5
---

# Protocol

Join provides **protocol classes** that encapsulate network protocol specifications for socket programming.
Each protocol class defines the address family, socket type, and protocol number needed to create sockets.

Protocols are:

* **type‑safe** — compile‑time protocol selection
* **lightweight** — zero‑overhead abstractions
* **composable** — work with endpoints, sockets, and streams

Available protocols span multiple network layers:

* **Unix domain** (local IPC)
* **Internet protocols** (TCP, UDP, ICMP)
* **Secure protocols** (TLS, HTTPS, SMTPS)
* **Application protocols** (HTTP, SMTP)
* **Low‑level protocols** (Netlink, Raw packets)

---

## Unix domain protocols

Unix domain sockets provide **local inter‑process communication** with filesystem‑based addressing.

### UnixDgram

Connectionless datagram protocol using `AF_UNIX` and `SOCK_DGRAM`.

```cpp
#include <join/protocol.hpp>

using join;

UnixDgram protocol;
UnixDgram::Socket socket;
UnixDgram::Endpoint endpoint("/tmp/socket");
```

### UnixStream

Connection‑oriented stream protocol using `AF_UNIX` and `SOCK_STREAM`.

```cpp
#include <join/protocol.hpp>

using join;

UnixStream protocol;
UnixStream::Socket socket;
UnixStream::Stream stream;
UnixStream::Acceptor acceptor;
```

---

## Internet protocols

### UDP

User Datagram Protocol for **connectionless** packet transmission.

```cpp
#include <join/protocol.hpp>

using join;

// IPv4 UDP
Udp::Socket socket4(Udp::v4());

// IPv6 UDP
Udp::Socket socket6(Udp::v6());
```

UDP supports both IPv4 and IPv6 address families.

### TCP

Transmission Control Protocol for **reliable stream** communication.

```cpp
#include <join/protocol.hpp>

using join;

// IPv4 TCP
Tcp::Socket socket4(Tcp::v4());
Tcp::Stream stream4;
Tcp::Acceptor acceptor4;

// IPv6 TCP
Tcp::Socket socket6(Tcp::v6());
```

TCP provides connection‑oriented, ordered, and error‑checked delivery.

### ICMP

Internet Control Message Protocol for **network diagnostics** (ping, traceroute).

```cpp
#include <join/protocol.hpp>

using join;

// IPv4 ICMP
Icmp::Socket icmp4(Icmp::v4());

// IPv6 ICMP (ICMPv6)
Icmp::Socket icmp6(Icmp::v6());
```

⚠️ ICMP sockets typically require elevated privileges.

---

## Secure protocols

### TLS

Transport Layer Security for **encrypted TCP** connections.

```cpp
#include <join/protocol.hpp>

using join;

Tls::Socket socket(Tls::v4());
Tls::Stream stream;
Tls::Acceptor acceptor;
```

TLS wraps TCP with encryption, authentication, and integrity verification.

---

## Application protocols

### HTTP

Hypertext Transfer Protocol for **web communication**.

```cpp
#include <join/protocol.hpp>

using join;

Http::Client client;
Http::Server server;
Http::Worker worker;
```

HTTP provides request/response semantics over TCP.

### HTTPS

HTTP over TLS for **secure web communication**.

```cpp
#include <join/protocol.hpp>

using join;

Https::Client client;
Https::Server server;
Https::Worker worker;
```

### SMTP

Simple Mail Transfer Protocol for **email transmission**.

```cpp
#include <join/protocol.hpp>

using join;

Smtp::Client client(Smtp::v4());
```

SMTP supports STARTTLS for opportunistic encryption.

### SMTPS

SMTP over TLS for **secure email transmission**.

```cpp
#include <join/protocol.hpp>

using join;

Smtps::Client client(Smtps::v4());
```

---

## Low‑level protocols

### Netlink

Linux kernel communication protocol for **routing, netfilter, and more**.

```cpp
#include <join/protocol.hpp>

using join;

// Route subsystem (default)
Netlink::Socket routeSocket(Netlink::rt());

// Netfilter subsystem
Netlink::Socket nfSocket(Netlink::nf());

// Custom subsystem
Netlink custom(NETLINK_USERSOCK);
```

Netlink provides kernel‑to‑userspace communication for network configuration.

### Raw

Raw packet protocol using `AF_PACKET` for **link‑layer access**.

```cpp
#include <join/protocol.hpp>

using join;

Raw protocol;
Raw::Socket socket;
Raw::Endpoint endpoint;
```

⚠️ Raw sockets require elevated privileges and handle Ethernet frames directly.

---

## IPv4 vs IPv6

Internet protocols support both address families through **static factory methods**:

```cpp
// IPv4
Tcp::v4()
Udp::v4()
Icmp::v4()
Tls::v4()
Http::v4()

// IPv6
Tcp::v6()
Udp::v6()
Icmp::v6()
Tls::v6()
Http::v6()
```

Protocols can also be constructed with an explicit family:

```cpp
Tcp tcpv4(AF_INET);
Tcp tcpv6(AF_INET6);
```

---

## Protocol comparison

Protocols can be compared for equality:

```cpp
if (Tcp::v4() == Tcp::v4()) {
    // Same protocol
}

if (Tcp::v4() != Tcp::v6()) {
    // Different address families
}
```

⚠️ Only protocols with family selection (TCP, UDP, ICMP, TLS, HTTP, HTTPS, SMTP, SMTPS, Netlink) support comparison operators.

---

## Protocol properties

All protocol classes expose three core methods:

```cpp
protocol.family();    // Address family (AF_INET, AF_UNIX, etc.)
protocol.type();      // Socket type (SOCK_STREAM, SOCK_DGRAM, etc.)
protocol.protocol();  // Protocol number (IPPROTO_TCP, etc.)
```

These values are used internally when creating sockets.

---

## Associated types

Each protocol defines type aliases for related components:

| Protocol   | Endpoint | Socket | Stream | Acceptor | Client | Server |
| ---------- | -------- | ------ | ------ | -------- | ------ | ------ |
| UnixDgram  | ✅        | ✅      | ❌      | ❌        | ❌      | ❌      |
| UnixStream | ✅        | ✅      | ✅      | ✅        | ❌      | ❌      |
| Udp        | ✅        | ✅      | ❌      | ❌        | ❌      | ❌      |
| Tcp        | ✅        | ✅      | ✅      | ✅        | ❌      | ❌      |
| Tls        | ✅        | ✅      | ✅      | ✅        | ❌      | ❌      |
| Http       | ✅        | ✅      | ✅      | ✅        | ✅      | ✅      |
| Https      | ✅        | ✅      | ✅      | ✅        | ✅      | ✅      |
| Smtp       | ✅        | ✅      | ✅      | ❌        | ✅      | ❌      |
| Smtps      | ✅        | ✅      | ✅      | ❌        | ✅      | ❌      |

Example usage:

```cpp
Http::Endpoint endpoint("example.com", 80);
Http::Socket socket;
Http::Client client;
```

---

## Best practices

* Use **Tcp** or **Tls** for reliable data transfer
* Use **Udp** for low‑latency, lossy‑tolerant communication
* Use **UnixStream** for local IPC when possible (faster than TCP loopback)
* Prefer **v4()** and **v6()** factory methods over direct construction
* Use **Https/Smtps** instead of HTTP/SMTP for sensitive data
* Be aware that **ICMP** and **Raw** sockets require root privileges

---

## Summary

| Protocol   | Family     | Type        | Use Case                   |
| ---------- | ---------- | ----------- | -------------------------- |
| UnixDgram  | AF_UNIX    | SOCK_DGRAM  | Local datagram IPC         |
| UnixStream | AF_UNIX    | SOCK_STREAM | Local stream IPC           |
| Udp        | AF_INET*   | SOCK_DGRAM  | Internet datagrams         |
| Tcp        | AF_INET*   | SOCK_STREAM | Reliable internet streams  |
| Icmp       | AF_INET*   | SOCK_RAW    | Network diagnostics        |
| Tls        | AF_INET*   | SOCK_STREAM | Encrypted TCP              |
| Http       | AF_INET*   | SOCK_STREAM | Web requests               |
| Https      | AF_INET*   | SOCK_STREAM | Secure web requests        |
| Smtp       | AF_INET*   | SOCK_STREAM | Email transmission         |
| Smtps      | AF_INET*   | SOCK_STREAM | Secure email transmission  |
| Netlink    | AF_NETLINK | SOCK_RAW    | Kernel communication       |
| Raw        | AF_PACKET  | SOCK_RAW    | Link‑layer packet access   |

\* Supports both AF_INET (IPv4) and AF_INET6 (IPv6)
