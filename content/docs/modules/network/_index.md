---
title: "Network"
weight: 3
bookCollapseSection: true
---

# Network

The **Network** module provides comprehensive networking capabilities for building networked applications, from low-level sockets to high-level HTTP and SMTP protocols.

---

### Acceptor

Server socket abstraction for accepting incoming connections.

**Features:**

* Template-based for different protocols (Tcp, Tls, UnixStream)
* Non-blocking accept operations
* Reactor integration

---

### ARP

Address Resolution Protocol implementation.

**Features:**

* ARP request/reply handling
* MAC address resolution
* Network layer utilities

---

### ChunkStream

HTTP chunked transfer encoding support.

**Features:**

* Chunked encoding/decoding
* Stream-based interface
* HTTP/1.1 compliance

---

### Endpoint

Network endpoint abstraction (IP address + port).

**Features:**

* IPv4 and IPv6 support
* Address family handling
* Endpoint comparison and formatting

---

### HttpClient

HTTP/HTTPS client implementation.

**Features:**

* GET, POST, PUT, DELETE, HEAD, PATCH methods
* TLS/SSL support
* Keep-alive connections

---

### HttpMessage

HTTP request and response message handling.

**Classes:**

* **HttpRequest** - HTTP request message
* **HttpResponse** - HTTP response message

**Features:**

* Header management
* Body handling
* Status codes and methods

---

### HttpServer

HTTP/HTTPS server implementation.

**Features:**

* Request handling callbacks
* Multi-threaded support
* TLS/SSL support

---

### Interface

Network interface information and management.

**Features:**

* Interface enumeration
* IP address assignment
* MTU and flags

---

### InterfaceManager

System network interface management.

**Features:**

* Interface discovery
* Address family filtering
* Interface status monitoring

---

### IpAddress

IP address abstraction (IPv4/IPv6).

**Features:**

* IPv4 and IPv6 support
* Address parsing and formatting
* Network/broadcast address calculation

---

### MacAddress

MAC (Media Access Control) address handling.

**Features:**

* 48-bit MAC address representation
* Parsing and formatting
* Address comparison

---

### MailMessage

Email message construction for SMTP.

**Features:**

* MIME message building
* Header management
* Attachment support

---

### Protocol

Protocol definitions and socket types.

**Protocol Types:**

* **Tcp** - TCP stream sockets
* **Udp** - UDP datagram sockets
* **Tls** - TLS/SSL encrypted sockets
* **UnixStream** - Unix domain stream sockets
* **UnixDgram** - Unix domain datagram sockets
* **Raw** - Raw IP sockets
* **Icmp** - ICMP sockets
* **Netlink** - Netlink sockets

---

### Resolver

DNS resolution and hostname lookup.

**Features:**

* Hostname to IP resolution
* Service name resolution
* IPv4/IPv6 support

---

### SmtpClient

SMTP/SMTPS email client.

**Features:**

* SMTP protocol implementation
* STARTTLS support
* Authentication mechanisms

---

### Socket

Low-level socket abstraction.

**Features:**

* Template-based for different protocols
* Non-blocking I/O
* Socket options (SO_REUSEADDR, SO_KEEPALIVE, etc.)

---

### SocketStream

Stream interface for sockets.

**Features:**

* std::iostream integration
* Buffered I/O
* Stream operators (<<, >>)

---

## API Reference

For detailed API documentation, see:

🔗 [Doxygen Network Module Reference](https://joinframework.github.io/join/)
