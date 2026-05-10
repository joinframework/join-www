---

title: "Protocol"
weight: 60
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
* **Application protocols** (HTTP, SMTP, DNS, DoT, mDNS)
* **Low‑level protocols** (Netlink, Raw packets)

---

## Unix domain protocols

Unix domain sockets provide **local inter‑process communication** with filesystem‑based addressing.

### UnixDgram

Connectionless datagram protocol using `AF_UNIX` and `SOCK_DGRAM`.

```cpp
#include <join/protocol.hpp>

using namespace join;

UnixDgram::Socket socket;
UnixDgram::Endpoint endpoint("/tmp/socket");
```

### UnixStream

Connection‑oriented stream protocol using `AF_UNIX` and `SOCK_STREAM`.

```cpp
UnixStream::Socket   socket;
UnixStream::Stream   stream;
UnixStream::Acceptor acceptor;
```

---

## Internet protocols

### UDP

User Datagram Protocol for **connectionless** packet transmission.

```cpp
Udp::Socket socket4(Udp::v4());
Udp::Socket socket6(Udp::v6());
```

### TCP

Transmission Control Protocol for **reliable stream** communication.

```cpp
Tcp::Socket   socket4(Tcp::v4());
Tcp::Stream   stream;
Tcp::Acceptor acceptor;

Tcp::Socket   socket6(Tcp::v6());
```

### ICMP

Internet Control Message Protocol for **network diagnostics** (ping, traceroute).

```cpp
Icmp::Socket icmp4(Icmp::v4());
Icmp::Socket icmp6(Icmp::v6());
```

⚠️ ICMP sockets typically require `CAP_NET_RAW`.

---

## Secure protocols

### TLS

Transport Layer Security for **encrypted TCP** connections.

```cpp
Tls::Socket   socket(Tls::v4());
Tls::Stream   stream;
Tls::Acceptor acceptor;
```

---

## Application protocols

### HTTP / HTTPS

```cpp
Http::Client  client;
Http::Server  server;
Http::Worker  worker;

Https::Client secureClient;
Https::Server secureServer;
```

### SMTP / SMTPS

```cpp
Smtp::Client  client(Smtp::v4());
Smtps::Client secureClient(Smtps::v4());
```

### DNS (over UDP)

DNS protocol over UDP. Default port 53, max message size 8192 bytes.

```cpp
Dns::Socket     socket(Dns::v4());
Dns::Resolver   resolver("8.8.8.8");      // BasicDatagramResolver<Dns>
Dns::NameServer nameServer;               // BasicDatagramNameServer<Dns>
```

Both IPv4 and IPv6 are supported via `Dns::v4()` / `Dns::v6()`.

See [Dns::Resolver]({{< ref "dns-resolver" >}}) and [Dns::NameServer]({{< ref "dns-nameserver" >}}) for full documentation.

### DoT — DNS over TLS

DNS-over-TLS protocol. Default port 853, max message size 16384 bytes, RFC 7858 framing.

```cpp
Dot::Socket   socket(Dot::v4());
Dot::Resolver resolver("1.1.1.1");        // BasicTlsResolver<Dot>
```

`Dot` uses `SOCK_STREAM` / `IPPROTO_TCP` under the hood. Both IPv4 and IPv6 are supported.

See [Dot::Resolver]({{< ref "dot-resolver" >}}) for full documentation.

### mDNS (Multicast DNS)

Multicast DNS protocol. Default port 5353, max message size 8192 bytes.

```cpp
Mdns::Socket socket(Mdns::v4());
Mdns::Peer   peer("eth0");                // BasicDatagramPeer<Mdns>

// Multicast group addresses
IpAddress v4group = Mdns::multicastAddress(AF_INET);   // 224.0.0.251
IpAddress v6group = Mdns::multicastAddress(AF_INET6);  // ff02::fb
```

Both IPv4 and IPv6 multicast groups are supported via `Mdns::v4()` / `Mdns::v6()`.

See [Mdns::Peer]({{< ref "mdns-peer" >}}) for full documentation.

---

## Low‑level protocols

### Netlink

Linux kernel communication protocol for **routing, netfilter, and more**.

```cpp
Netlink::Socket routeSocket(Netlink::rt());   // NETLINK_ROUTE
Netlink::Socket nfSocket(Netlink::nf());      // NETLINK_NETFILTER

Netlink custom(NETLINK_USERSOCK);
```

### Raw

Raw packet protocol using `AF_PACKET` for **link‑layer access**.

```cpp
Raw::Socket   socket;
Raw::Endpoint endpoint;
```

⚠️ Raw sockets require `CAP_NET_RAW` and handle Ethernet frames directly.

---

## IPv4 vs IPv6

Internet protocols support both address families through static factory methods:

```cpp
Tcp::v4()   Tcp::v6()
Udp::v4()   Udp::v6()
Icmp::v4()  Icmp::v6()
Tls::v4()   Tls::v6()
Dns::v4()   Dns::v6()
Dot::v4()   Dot::v6()
Mdns::v4()  Mdns::v6()
Http::v4()  Http::v6()
```

Protocols can also be constructed with an explicit family:

```cpp
Tcp  tcpv4(AF_INET);
Tcp  tcpv6(AF_INET6);
Dns  dnsv4(AF_INET);
Mdns mdnsv6(AF_INET6);
```

---

## Protocol comparison

Protocols with family selection support `==` and `!=`:

```cpp
assert(Tcp::v4() == Tcp::v4());
assert(Tcp::v4() != Tcp::v6());
assert(Dns::v4() != Dns::v6());
assert(Netlink::rt() != Netlink::nf());
```

---

## Protocol properties

All protocol classes expose three core methods:

```cpp
protocol.family();    // AF_INET, AF_UNIX, AF_NETLINK, AF_PACKET…
protocol.type();      // SOCK_STREAM, SOCK_DGRAM, SOCK_RAW
protocol.protocol();  // IPPROTO_TCP, IPPROTO_UDP, 0…
```

DNS and mDNS also expose protocol-level constants:

```cpp
Dns::defaultPort   // 53
Dns::maxMsgSize    // 8192

Dot::defaultPort   // 853
Dot::maxMsgSize    // 16384

Mdns::defaultPort  // 5353
Mdns::maxMsgSize   // 8192
```

---

## Associated types

Each protocol defines type aliases for related components:

| Protocol   | Endpoint | Socket | Stream | Acceptor | Resolver | NameServer | Peer | Client | Server |
| ---------- | :------: | :----: | :----: | :------: | :------: | :--------: | :--: | :----: | :----: |
| UnixDgram  | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| UnixStream | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Udp        | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Tcp        | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Tls        | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Dns        | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Dot        | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Mdns       | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Http       | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Https      | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Smtp       | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Smtps      | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Netlink    | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Raw        | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Summary

| Protocol   | Family     | Type        | Use Case                        |
| ---------- | ---------- | ----------- | ------------------------------- |
| UnixDgram  | AF_UNIX    | SOCK_DGRAM  | Local datagram IPC              |
| UnixStream | AF_UNIX    | SOCK_STREAM | Local stream IPC                |
| Udp        | AF_INET*   | SOCK_DGRAM  | Internet datagrams              |
| Tcp        | AF_INET*   | SOCK_STREAM | Reliable internet streams       |
| Icmp       | AF_INET*   | SOCK_RAW    | Network diagnostics             |
| Tls        | AF_INET*   | SOCK_STREAM | Encrypted TCP                   |
| Dns        | AF_INET*   | SOCK_DGRAM  | DNS over UDP                    |
| Dot        | AF_INET*   | SOCK_STREAM | DNS over TLS                    |
| Mdns       | AF_INET*   | SOCK_DGRAM  | Multicast DNS                   |
| Http       | AF_INET*   | SOCK_STREAM | Web requests                    |
| Https      | AF_INET*   | SOCK_STREAM | Secure web requests             |
| Smtp       | AF_INET*   | SOCK_STREAM | Email transmission              |
| Smtps      | AF_INET*   | SOCK_STREAM | Secure email transmission       |
| Netlink    | AF_NETLINK | SOCK_RAW    | Kernel communication            |
| Raw        | AF_PACKET  | SOCK_RAW    | Link‑layer packet access        |

\* Supports both AF_INET (IPv4) and AF_INET6 (IPv6)
