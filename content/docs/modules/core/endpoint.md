---
title: "Network Endpoints"
weight: 70
---

# Network Endpoints

Join provides **endpoint classes** that encapsulate network addresses.
Endpoints combine an **address** with **protocol-specific information** (port, device, PID, etc.).

Endpoint features:

* **protocol-aware** — each protocol has its endpoint type
* **type-safe** — compile-time endpoint validation
* **URL parsing** — automatic hostname resolution
* **comparison** — sortable for use in maps/sets

---

## Endpoint types

### Internet endpoints

IP address + port:

```cpp
Tcp::Endpoint tcpEndpoint("192.168.1.1", 8080);
Udp::Endpoint udpEndpoint("2001:db8::1", 53);
```

### Unix endpoints

Filesystem path:

```cpp
UnixStream::Endpoint unixEndpoint("/tmp/socket");
UnixDgram::Endpoint dgramEndpoint("/var/run/app.sock");
```

### Netlink endpoints

Process ID + multicast groups:

```cpp
Netlink::Endpoint nlEndpoint(getpid(), RTMGRP_LINK);
```

### Link layer endpoints

Network interface:

```cpp
Raw::Endpoint rawEndpoint("eth0");
```

---

## Creating internet endpoints

### From IP and port

```cpp
IpAddress ip("10.0.0.1");
Tcp::Endpoint endpoint1(ip, 8080);

// Or directly
Tcp::Endpoint endpoint2("10.0.0.1", 8080);
```

### From protocol and port

```cpp
// Wildcard address for listening
Tcp::Endpoint listen(Tcp::v6(), 8080);  // [::]:8080
```

---

## Internet endpoint properties

```cpp
Tcp::Endpoint endpoint("192.168.1.100", 8080);

// IP address
IpAddress ip = endpoint.ip();
endpoint.ip(IpAddress("10.0.0.1"));

// Port
uint16_t port = endpoint.port();
endpoint.port(9090);

// Hostname (if created from URL)
std::string host = endpoint.hostname();
endpoint.hostname("example.com");

// Protocol
Tcp protocol = endpoint.protocol();  // v4() or v6()

// Device (IPv6 only, for link-local)
endpoint.device("eth0");
std::string dev = endpoint.device();
```

---

## Unix endpoints

Filesystem paths for local IPC:

```cpp
UnixStream::Endpoint server("/tmp/server.sock");
UnixDgram::Endpoint client("/tmp/client.sock");

// Get/set path
std::string path = server.device();
server.device("/var/run/new.sock");

// Protocol and length
UnixStream protocol = server.protocol();
socklen_t len = server.length();
```

---

## Netlink endpoints

Kernel communication endpoints:

```cpp
// Process ID and multicast groups
Netlink::Endpoint route(Netlink::rt(), RTMGRP_LINK | RTMGRP_IPV4_IFADDR);

// Get/set properties
uint32_t pid = route.pid();
route.pid(getpid());

uint32_t groups = route.groups();
route.groups(RTMGRP_LINK);

// Protocol
Netlink protocol = route.protocol();  // rt() or nf()
```

---

## Link layer endpoints

Network interface access:

```cpp
Raw::Endpoint eth("eth0");

// Get/set interface
std::string iface = eth.device();
eth.device("wlan0");

// Protocol
Raw protocol = eth.protocol();
socklen_t len = eth.length();
```

---

## Comparison

Endpoints are comparable and sortable:

```cpp
Tcp::Endpoint a("10.0.0.1", 80);
Tcp::Endpoint b("10.0.0.1", 443);
Tcp::Endpoint c("10.0.0.2", 80);

bool equal = (a == b);     // false (different ports)
bool less = (a < b);       // true (lower port)
bool less2 = (a < c);      // true (lower IP)

// Use in sorted containers
std::set<Tcp::Endpoint> endpoints;
std::map<Tcp::Endpoint, Connection> connections;
```

---

## Stream output

```cpp
Tcp::Endpoint endpoint("192.168.1.1", 8080);
std::cout << endpoint << "\n";  // "192.168.1.1:8080"

Tcp::Endpoint ipv6("[2001:db8::1]:443");
std::cout << ipv6 << "\n";      // "[2001:db8::1]:443"

UnixStream::Endpoint unix("/tmp/socket");
std::cout << unix << "\n";      // "/tmp/socket"

Netlink::Endpoint nl(1234, RTMGRP_LINK);
std::cout << nl << "\n";        // "pid=1234,groups=1"
```

---

## Usage patterns

### Server binding

```cpp
// Bind to specific address
Tcp::Endpoint specific("192.168.1.10", 8080);
acceptor.bind(specific);

// Bind to wildcard (all interfaces)
Tcp::Endpoint wildcard(Tcp::v4(), 8080);
acceptor.bind(wildcard);
```

### Client connection

```cpp
// Connect by hostname
Tcp::Socket socket;
Tcp::Endpoint endpoint("example.com", 80);
socket.connect(endpoint);

// Connect by IP
Tcp::Endpoint direct("93.184.216.34", 80);
socket.connect(direct);
```

### UDP sendto/recvfrom

```cpp
Udp::Socket socket;
Udp::Endpoint remote("8.8.8.8", 53);

// Send to endpoint
socket.sendTo("DNS query", remote);

// Receive from endpoint
Udp::Endpoint sender;
std::string data = socket.receiveFrom(sender);
std::cout << "From: " << sender << "\n";
```

### Link-local IPv6

```cpp
// Link-local addresses require interface specification
IpAddress linkLocal("fe80::1");
Tcp::Endpoint endpoint(linkLocal, 8080);
endpoint.device("eth0");  // Specify interface
```

---

## Low-level access

Get underlying sockaddr:

```cpp
Tcp::Endpoint endpoint("10.0.0.1", 8080);

// Mutable access
struct sockaddr* addr = endpoint.addr();
socklen_t len = endpoint.length();

// Const access
const struct sockaddr* caddr = endpoint.addr();

// Use with system calls
::connect(sockfd, endpoint.addr(), endpoint.length());
```

---

## Best practices

* **Use URLs** — simplifies hostname resolution
* **Wildcard for servers** — bind to all interfaces with `Protocol(family, port)`
* **Check resolved IPs** — verify hostname resolution succeeded
* **Specify device** — for link-local IPv6 addresses
* **Store in containers** — endpoints are comparable and copyable

---

## Summary

| Endpoint Type        | Address Type     | Additional Data        |
| -------------------- | ---------------- | ---------------------- |
| BasicUnixEndpoint    | Filesystem path  | -                      |
| BasicNetlinkEndpoint | PID + Groups     | Protocol type          |
| BasicLinkLayerEndpoint| Interface       | -                      |
| BasicInternetEndpoint| IP + Port        | Hostname, device       |

All endpoints provide:
- `protocol()` — get associated protocol
- `length()` — get sockaddr size
- `addr()` — get underlying sockaddr
- Comparison operators
- Stream insertion
