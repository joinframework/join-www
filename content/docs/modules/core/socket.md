---

title: "Socket"
weight: 80
---

# Socket

Join provides a **comprehensive socket API** for network programming.
Sockets are template classes parameterized by protocol type and integrate seamlessly with the Join reactor.

Sockets are:

* **non‑blocking by default**
* **protocol‑agnostic** — work with any protocol
* **event‑driven** — integrate with the reactor
* **type‑safe** — compile‑time protocol checking

Four socket classes are available:

* **BasicSocket** — base socket class with fundamental operations
* **BasicDatagramSocket** — connectionless datagram sockets (UDP, ICMP, UnixDgram)
* **BasicStreamSocket** — connection‑oriented stream sockets (TCP, UnixStream)
* **BasicTlsSocket** — encrypted stream sockets with TLS/SSL

---

## Socket modes

Sockets can operate in blocking or non‑blocking mode.

### Non‑blocking mode (default)

Operations return immediately with an error if they would block.

```cpp
#include <join/socket.hpp>

using namespace join;

Tcp::Socket socket;  // non-blocking by default
```

### Blocking mode

Operations wait until they complete or timeout.

```cpp
Tcp::Socket socket(BasicSocket<Tcp>::Mode::Blocking);
```

You can change the mode at runtime:

```cpp
socket.setMode(BasicSocket<Tcp>::Mode::NonBlocking);
```

---

## BasicSocket

The base socket class providing fundamental socket operations.

### Opening a socket

```cpp
using namespace join;

if (socket.open(Tcp()) == -1)
{
    // check join::lastError
}
```

### Binding to an endpoint

```cpp
Tcp::Endpoint endpoint("127.0.0.1", 8080);

if (socket.bind(endpoint) == -1)
{
    // check join::lastError
}
```

### Reading and writing

```cpp
char buffer[1024];
int bytesRead = socket.read(buffer, sizeof(buffer));

const char* data = "Hello";
int bytesWritten = socket.write(data, 5);
```

### Waiting for I/O readiness

```cpp
// wait up to 5 seconds until data is available
if (socket.waitReadyRead(5000))
{
    int available = socket.canRead();
}

// wait up to 5 seconds until socket is ready for writing
if (socket.waitReadyWrite(5000))
{
    socket.write(data, size);
}
```

---

## BasicDatagramSocket

Connectionless datagram sockets for UDP, ICMP, and Unix datagram protocols.

### Creating a UDP socket

```cpp
using namespace join;

Udp::Socket socket;
Udp::Endpoint local("0.0.0.0", 8080);

socket.bind(local);
```

### Sending and receiving datagrams

```cpp
char buffer[1024];
Udp::Endpoint remote;

// receive and capture sender endpoint
int bytesRead = socket.readFrom(buffer, sizeof(buffer), &remote);

// send to a specific endpoint
Udp::Endpoint dest("192.168.1.100", 9000);
socket.writeTo(data, size, dest);
```

### Connected datagram socket

A datagram socket can be "connected" to a specific peer to use regular `read`/`write`:

```cpp
Udp::Socket socket;
Udp::Endpoint remote("192.168.1.100", 9000);

socket.connect(remote);
socket.write(data, size);
socket.read(buffer, sizeof(buffer));
socket.disconnect();
```

### Binding to a network interface

```cpp
socket.bindToDevice("eth0");
```

### MTU and TTL

```cpp
int mtu = socket.mtu();  // AF_INET and AF_INET6 only
int ttl = socket.ttl();
```

### Multicast options

```cpp
socket.setOption(BasicSocket<Udp>::Option::MulticastTtl, 10);
socket.setOption(BasicSocket<Udp>::Option::MulticastLoop, 1);
```

---

## BasicStreamSocket

Connection‑oriented stream sockets for TCP and Unix stream protocols.

### Creating a TCP client

```cpp
using namespace join;

Tcp::Socket socket;
Tcp::Endpoint server("example.com", 80);

if (socket.connect(server) == -1)
{
    if (lastError != std::errc::operation_in_progress)
    {
        // fatal error
    }
}

// wait for connection to complete (non-blocking)
if (socket.waitConnected(5000))
{
    // connected
}
```

### Reading and writing streams

```cpp
// partial read/write
socket.write(data, size);
socket.read(buffer, sizeof(buffer));

// guaranteed read/write — loops until all bytes are transferred
if (socket.readExactly(buffer, 100, 5000) == 0)
{
    // read exactly 100 bytes
}

if (socket.writeExactly(data, size, 5000) == 0)
{
    // all data written
}
```

### Graceful disconnect

`disconnect()` performs a lingering close: sends `SHUT_WR`, drains remaining data, then closes.

```cpp
socket.disconnect();

// or wait for the peer to complete its shutdown (non-blocking)
if (socket.waitDisconnected(5000))
{
    // connection fully closed
}
```

### TCP options

```cpp
socket.setOption(BasicSocket<Tcp>::Option::NoDelay, 1);    // disable Nagle
socket.setOption(BasicSocket<Tcp>::Option::KeepAlive, 1);  // enable keepalive
socket.setOption(BasicSocket<Tcp>::Option::KeepIdle, 60);
socket.setOption(BasicSocket<Tcp>::Option::KeepIntvl, 10);
socket.setOption(BasicSocket<Tcp>::Option::KeepCount, 5);
```

---

## BasicTlsSocket

Encrypted stream sockets using OpenSSL for TLS/SSL connections.

### Creating a TLS client

```cpp
using namespace join;

Tls::Socket socket;
Tls::Endpoint server("example.com", 443);

// connect and initiate TLS handshake
if (socket.connectEncrypted(server) == -1)
{
    if (lastError != Errc::TemporaryError)
    {
        // fatal error
    }
}

// wait for handshake to complete (non-blocking)
if (socket.waitEncrypted(5000))
{
    // TLS connection established
}
```

### STARTTLS pattern

`BasicTlsSocket` has no constructor accepting a plain socket. To upgrade an existing connection, connect with `startEncryption()` after the plaintext exchange:

```cpp
Tls::Socket socket;
Tls::Endpoint server("smtp.example.com", 587);

// connect without TLS
if (socket.connect(server) == -1) { /* ... */ }
socket.waitConnected(5000);

// ... exchange SMTP plaintext ...

// upgrade to TLS
socket.startEncryption();
socket.waitEncrypted(5000);
```

### Certificate verification

```cpp
// enable peer verification (disabled by default)
socket.setVerify(true);

// trusted CA bundle — must be a regular file
socket.setCaFile("/etc/ssl/certs/ca-bundle.crt");

// or a directory of PEM certificates
socket.setCaPath("/etc/ssl/certs/");
```

⚠️ Peer verification is **disabled** by default.

### Client certificate

```cpp
if (socket.setCertificate("client.pem", "client-key.pem") == -1)
{
    // check join::lastError
}
```

### Configuring cipher suites

```cpp
// TLSv1.2 and below
socket.setCipher("ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256");

// TLSv1.3
socket.setCipher_1_3("TLS_AES_256_GCM_SHA384:TLS_AES_128_GCM_SHA256");
```

### Custom TLS context

`BasicTlsSocket` takes a `SslCtxPtr` by move. To share a context across multiple sockets, increment the reference count with `SSL_CTX_up_ref` before passing:

```cpp
join::SslCtxPtr ctx(SSL_CTX_new(TLS_client_method()));

// socket1 takes ownership
Tls::Socket socket1(std::move(ctx));

// to create socket2 from the same context, use SSL_CTX_up_ref first
SSL_CTX_up_ref(socket1_ctx_ptr);  // keep a raw pointer before the move
Tls::Socket socket2(join::SslCtxPtr(raw_ctx_ptr));
```

In practice it is simpler to create each socket with its own context from the same configuration.

---

## Socket options

```cpp
using Option = BasicSocket<Protocol>::Option;

// socket-level (all sockets)
socket.setOption(Option::ReuseAddr,  1);
socket.setOption(Option::ReusePort,  1);
socket.setOption(Option::SndBuffer,  65536);
socket.setOption(Option::RcvBuffer,  65536);
socket.setOption(Option::Broadcast,  1);      // UDP only
socket.setOption(Option::TimeStamp,  1);
socket.setOption(Option::AuxData,    1);      // raw packet sockets

// IP-level (datagram sockets)
socket.setOption(Option::Ttl,              64);
socket.setOption(Option::MulticastTtl,     10);
socket.setOption(Option::MulticastLoop,     1);
socket.setOption(Option::PathMtuDiscover,   1);
socket.setOption(Option::RcvError,          1);

// TCP-level (stream sockets)
socket.setOption(Option::NoDelay,    1);
socket.setOption(Option::KeepAlive,  1);
socket.setOption(Option::KeepIdle,  60);
socket.setOption(Option::KeepIntvl, 10);
socket.setOption(Option::KeepCount,  5);
```

---

## Socket state inspection

```cpp
socket.opened()     // socket file descriptor is open
socket.connected()  // socket is in Connected state
socket.connecting() // socket is in Connecting state (stream only)
socket.encrypted()  // TLS handshake completed (TLS only)
```

### Query endpoints

```cpp
auto local  = socket.localEndpoint();
auto remote = socket.remoteEndpoint();  // datagram/stream sockets
```

### Protocol information

```cpp
int family = socket.family();    // AF_INET, AF_INET6, AF_UNIX
int type   = socket.type();      // SOCK_STREAM, SOCK_DGRAM
int proto  = socket.protocol();  // IPPROTO_TCP, IPPROTO_UDP
```

---

## Error handling

Methods return `-1` on failure and set `join::lastError`:

```cpp
if (socket.connect(endpoint) == -1)
{
    if (lastError == std::errc::operation_in_progress)
    {
        // non-blocking connect in progress — call waitConnected()
    }
    else
    {
        std::cerr << lastError.message() << "\n";
    }
}
```

### Common error codes

* `Errc::TemporaryError` — operation would block, try again
* `Errc::ConnectionClosed` — peer closed the connection
* `Errc::TimedOut` — wait timeout expired
* `Errc::InUse` — socket already open or connected
* `TlsErrc::TlsCloseNotifyAlert` — TLS close_notify alert received
* `TlsErrc::TlsProtocolError` — TLS protocol error

---

## Checksum calculation

Static utility for computing the standard 1s-complement checksum (useful for ICMP):

```cpp
uint16_t sum = BasicSocket<Protocol>::checksum(
    reinterpret_cast<const uint16_t*>(data),
    length
);
```

---

## Protocol examples

### UDP echo server

```cpp
using namespace join;

Udp::Socket server;
server.bind(Udp::Endpoint("0.0.0.0", 9000));

char buffer[1024];
Udp::Endpoint client;

while (true)
{
    int n = server.readFrom(buffer, sizeof(buffer), &client);
    if (n > 0)
        server.writeTo(buffer, n, client);
}
```

### TCP echo server

```cpp
using namespace join;

Tcp::Acceptor acceptor;
acceptor.create(Tcp::Endpoint("0.0.0.0", 9000));

Tcp::Socket client = acceptor.accept();
char buffer[1024];

while (true)
{
    int n = client.read(buffer, sizeof(buffer));
    if (n <= 0) break;
    client.writeExactly(buffer, n);
}
```

### HTTPS GET request

```cpp
using namespace join;

Tls::Socket socket;
socket.setVerify(true);
socket.setCaFile("/etc/ssl/certs/ca-bundle.crt");

socket.connectEncrypted(Tls::Endpoint("example.com", 443));
socket.waitEncrypted(5000);

std::string request =
    "GET / HTTP/1.1\r\n"
    "Host: example.com\r\n"
    "Connection: close\r\n\r\n";

socket.writeExactly(request.c_str(), request.size());

char buffer[4096];
while (socket.read(buffer, sizeof(buffer)) > 0)
{
    // process response
}
```

---

## Best practices

* Always check return values — methods return `-1` on failure
* Use **non‑blocking mode** with the reactor for scalable I/O
* Use **blocking mode** for simple synchronous operations
* Enable **TCP_NODELAY** for low‑latency applications
* Enable **peer verification** for TLS clients in production
* Use **readExactly / writeExactly** for framing protocols
* Handle **TemporaryError** by calling the appropriate `wait*` method
* Call **disconnect()** before closing stream sockets for graceful shutdown

---

## Summary

| Socket Type          | Use Case                         | Protocol Examples    |
| -------------------- | -------------------------------- | -------------------- |
| BasicSocket          | Raw socket operations            | Any                  |
| BasicDatagramSocket  | Connectionless communication     | UDP, ICMP, UnixDgram |
| BasicStreamSocket    | Connection‑oriented streams      | TCP, UnixStream      |
| BasicTlsSocket       | Encrypted communication          | TLS, HTTPS, SMTPS    |

| Feature              | Supported |
| -------------------- | :-------: |
| Non‑blocking I/O     | ✅         |
| Blocking I/O         | ✅         |
| IPv4/IPv6            | ✅         |
| Unix domain sockets  | ✅         |
| TLS/SSL encryption   | ✅         |
| Certificate verify   | ✅         |
| Reactor integration  | ✅         |
| Move semantics       | ✅         |
