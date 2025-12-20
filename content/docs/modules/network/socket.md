---

title: "Socket"
weight: 5
---

# Socket

Join provides a **comprehensive socket API** for network programming.
Sockets are template classes parameterized by protocol type and integrate seamlessly with the Join reactor.

Sockets are:

* **non‑blocking by default**
* **protocol‑agnostic** — work with any protocol
* **event‑driven** — integrate with the reactor
* **type‑safe** — compile‑time protocol checking

Three socket hierarchies are available:

* **BasicSocket** — base socket class
* **BasicDatagramSocket** — connectionless datagram sockets
* **BasicStreamSocket** — connection‑oriented stream sockets
* **BasicTlsSocket** — encrypted stream sockets with TLS/SSL

---

## Socket modes

Sockets can operate in blocking or non‑blocking mode.

### Non‑blocking mode (default)

Operations return immediately with an error if they would block.

```cpp
#include <join/socket.hpp>

using join;

Tcp::Socket socket;  // Non-blocking by default
```

### Blocking mode

Operations wait until they complete or timeout.

```cpp
#include <join/socket.hpp>

using join;

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
#include <join/socket.hpp>

using join;

Tcp protocol;
BasicSocket<Tcp> socket;

if (socket.open(protocol) == -1) {
    // Handle error
}
```

### Binding to an endpoint

```cpp
Tcp::Endpoint endpoint("127.0.0.1", 8080);

if (socket.bind(endpoint) == -1) {
    // Handle error
}
```

### Reading and writing

```cpp
char buffer[1024];

// Read data
int bytesRead = socket.read(buffer, sizeof(buffer));

// Write data
const char* data = "Hello";
int bytesWritten = socket.write(data, 5);
```

### Waiting for I/O readiness

```cpp
// Wait until data is available for reading
if (socket.waitReadyRead(5000)) {  // 5 second timeout
    int available = socket.canRead();
}

// Wait until socket is ready for writing
if (socket.waitReadyWrite(5000)) {
    socket.write(data, size);
}
```

---

## BasicDatagramSocket

Connectionless datagram sockets for UDP, ICMP, and Unix datagram protocols.

### Creating a UDP socket

```cpp
#include <join/socket.hpp>

using join;

Udp::Socket socket;
Udp::Endpoint local("0.0.0.0", 8080);

socket.bind(local);
```

### Sending and receiving datagrams

```cpp
// Receive from any endpoint
char buffer[1024];
Udp::Endpoint remote;
int bytesRead = socket.readFrom(buffer, sizeof(buffer), &remote);

// Send to specific endpoint
Udp::Endpoint dest("192.168.1.100", 9000);
socket.writeTo(data, size, dest);
```

### Connected datagram socket

Datagrams can be "connected" to a specific peer:

```cpp
Udp::Socket socket;
Udp::Endpoint remote("192.168.1.100", 9000);

socket.connect(remote);

// Now use regular read/write
socket.write(data, size);
socket.read(buffer, sizeof(buffer));

// Disconnect when done
socket.disconnect();
```

### Binding to a network interface

```cpp
socket.bindToDevice("eth0");
```

### Multicast options

```cpp
// Set TTL for multicast packets
socket.setOption(BasicSocket<Udp>::Option::MulticastTtl, 10);

// Enable/disable multicast loopback
socket.setOption(BasicSocket<Udp>::Option::MulticastLoop, 1);
```

---

## BasicStreamSocket

Connection‑oriented stream sockets for TCP and Unix stream protocols.

### Creating a TCP client

```cpp
#include <join/socket.hpp>

using join;

Tcp::Socket socket;
Tcp::Endpoint server("example.com", 80);

if (socket.connect(server) == -1) {
    // Handle error
}

// Wait for connection to complete (non-blocking mode)
if (socket.waitConnected(5000)) {
    // Connected
}
```

### Reading and writing streams

```cpp
// Regular read/write
socket.write(data, size);
socket.read(buffer, sizeof(buffer));

// Read exact number of bytes
if (socket.readExactly(buffer, 100, 5000) == 0) {
    // Successfully read 100 bytes
}

// Write all data
if (socket.writeExactly(data, size, 5000) == 0) {
    // All data written
}
```

### Graceful disconnect

```cpp
// Initiate shutdown
socket.disconnect();

// Wait for shutdown to complete
if (socket.waitDisconnected(5000)) {
    // Connection closed gracefully
}
```

### TCP options

```cpp
// Disable Nagle's algorithm
socket.setOption(BasicSocket<Tcp>::Option::NoDelay, 1);

// Enable TCP keepalive
socket.setOption(BasicSocket<Tcp>::Option::KeepAlive, 1);
socket.setOption(BasicSocket<Tcp>::Option::KeepIdle, 60);
socket.setOption(BasicSocket<Tcp>::Option::KeepIntvl, 10);
socket.setOption(BasicSocket<Tcp>::Option::KeepCount, 5);
```

---

## BasicTlsSocket

Encrypted stream sockets using OpenSSL for TLS/SSL connections.

### Creating a TLS client

```cpp
#include <join/socket.hpp>

using join;

Tls::Socket socket;
Tls::Endpoint server("example.com", 443);

// Connect and encrypt in one step
if (socket.connectEncrypted(server) == -1) {
    // Handle error
}

// Wait for TLS handshake to complete
if (socket.waitEncrypted(5000)) {
    // TLS connection established
}
```

### Upgrading existing connection (STARTTLS)

```cpp
Tcp::Socket plainSocket;
plainSocket.connect(server);

// ... exchange plaintext ...

// Upgrade to TLS
Tls::Socket tlsSocket(std::move(plainSocket));
tlsSocket.startEncryption();
tlsSocket.waitEncrypted(5000);
```

### Certificate verification

```cpp
// Enable peer verification
socket.setVerify(true);

// Set trusted CA certificates
socket.setCaFile("/etc/ssl/certs/ca-bundle.crt");
socket.setCaPath("/etc/ssl/certs/");
```

⚠️ By default, peer verification is **disabled**. Always enable it for production clients.

### Setting client certificate

```cpp
// Set certificate and private key
if (socket.setCertificate("client.pem", "client-key.pem") == -1) {
    // Handle error
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

```cpp
// Create shared context
join::SslCtxPtr context(SSL_CTX_new(TLS_client_method()));
SSL_CTX_set_options(context.get(), SSL_OP_NO_TLSv1);

// Create multiple sockets with same context
Tls::Socket socket1(context);
Tls::Socket socket2(context);
```

### Reading and writing encrypted data

```cpp
// Same API as BasicStreamSocket
socket.write(data, size);
socket.read(buffer, sizeof(buffer));

// Check encryption status
if (socket.encrypted()) {
    // Connection is encrypted
}
```

---

## Socket options

Common options available across socket types:

```cpp
using Option = BasicSocket<Protocol>::Option;

// Socket‑level options
socket.setOption(Option::ReuseAddr, 1);      // Allow address reuse
socket.setOption(Option::ReusePort, 1);      // Allow port reuse
socket.setOption(Option::SndBuffer, 65536);  // Set send buffer size
socket.setOption(Option::RcvBuffer, 65536);  // Set receive buffer size
socket.setOption(Option::Broadcast, 1);      // Allow broadcast (UDP)
socket.setOption(Option::TimeStamp, 1);      // Receive timestamps

// IP‑level options (datagram sockets)
socket.setOption(Option::Ttl, 64);           // Set packet TTL
socket.setOption(Option::PathMtuDiscover, 1); // Enable PMTU discovery
socket.setOption(Option::RcvError, 1);        // Receive ICMP errors

// TCP‑level options (stream sockets)
socket.setOption(Option::NoDelay, 1);        // Disable Nagle
socket.setOption(Option::KeepAlive, 1);      // Enable keepalive
```

---

## Socket state inspection

### Check socket state

```cpp
if (socket.opened()) {
    // Socket is open
}

if (socket.connected()) {
    // Socket is connected
}

if (socket.connecting()) {
    // Socket is in connecting state
}

if (socket.encrypted()) {
    // Socket has TLS encryption (TlsSocket only)
}
```

### Query endpoints

```cpp
// Get local endpoint
auto local = socket.localEndpoint();
std::cout << local.ip() << ":" << local.port() << std::endl;

// Get remote endpoint (datagram/stream sockets)
auto remote = socket.remoteEndpoint();
```

### Protocol information

```cpp
int family = socket.family();      // AF_INET, AF_INET6, AF_UNIX
int type = socket.type();          // SOCK_STREAM, SOCK_DGRAM
int proto = socket.protocol();     // IPPROTO_TCP, IPPROTO_UDP
```

### MTU discovery

```cpp
// Get path MTU (datagram sockets)
int mtu = socket.mtu();
```

---

## Error handling

Join uses `std::error_code` for error reporting through the global `lastError` variable.

```cpp
if (socket.connect(endpoint) == -1) {
    if (lastError == std::errc::operation_in_progress) {
        // Non-blocking connect in progress
    } else if (lastError == Errc::ConnectionClosed) {
        // Connection closed by peer
    } else {
        std::cerr << "Error: " << lastError.message() << std::endl;
    }
}
```

### Common error codes

* `Errc::TemporaryError` — operation would block (try again)
* `Errc::ConnectionClosed` — peer closed connection
* `Errc::TimedOut` — operation timed out
* `Errc::InUse` — resource already in use
* `TlsErrc::TlsCloseNotifyAlert` — TLS close notify received
* `TlsErrc::TlsProtocolError` — TLS protocol error

---

## Checksum calculation

Static utility for computing checksums (useful for ICMP):

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
Udp::Socket server;
Udp::Endpoint local("0.0.0.0", 9000);
server.bind(local);

char buffer[1024];
Udp::Endpoint client;

while (true) {
    int n = server.readFrom(buffer, sizeof(buffer), &client);
    if (n > 0) {
        server.writeTo(buffer, n, client);
    }
}
```

### TCP echo server

```cpp
Tcp::Acceptor acceptor;
Tcp::Endpoint local("0.0.0.0", 9000);
acceptor.listen(local);

Tcp::Socket client = acceptor.accept();
char buffer[1024];

while (true) {
    int n = client.read(buffer, sizeof(buffer));
    if (n <= 0) break;
    client.writeExactly(buffer, n);
}
```

### HTTPS GET request

```cpp
Tls::Socket socket;
socket.setVerify(true);
socket.setCaFile("/etc/ssl/certs/ca-bundle.crt");

Tls::Endpoint server("example.com", 443);
socket.connectEncrypted(server);
socket.waitEncrypted(5000);

std::string request = 
    "GET / HTTP/1.1\r\n"
    "Host: example.com\r\n"
    "Connection: close\r\n\r\n";

socket.writeExactly(request.c_str(), request.size());

char buffer[4096];
while (socket.read(buffer, sizeof(buffer)) > 0) {
    // Process response
}
```

---

## Best practices

* Always check return values for `-1` errors
* Use **non‑blocking mode** with the reactor for scalable I/O
* Use **blocking mode** for simple synchronous operations
* Enable **TCP_NODELAY** for low‑latency applications
* Enable **peer verification** for TLS clients in production
* Use **readExactly/writeExactly** for framing protocols
* Handle **TemporaryError** by calling wait methods
* Call **disconnect()** before closing stream sockets for graceful shutdown
* Reuse **TLS contexts** when creating multiple secure connections

---

## Summary

| Socket Type          | Use Case                         | Protocol Examples    |
| -------------------- | -------------------------------- | -------------------- |
| BasicSocket          | Raw socket operations            | Any                  |
| BasicDatagramSocket  | Connectionless communication     | UDP, ICMP, UnixDgram |
| BasicStreamSocket    | Connection‑oriented streams      | TCP, UnixStream      |
| BasicTlsSocket       | Encrypted communication          | TLS, HTTPS, SMTPS    |

| Feature              | Supported |
| -------------------- | --------- |
| Non‑blocking I/O     | ✅         |
| Blocking I/O         | ✅         |
| IPv4/IPv6            | ✅         |
| Unix domain sockets  | ✅         |
| TLS/SSL encryption   | ✅         |
| Certificate verify   | ✅         |
| Reactor integration  | ✅         |
| Move semantics       | ✅         |
