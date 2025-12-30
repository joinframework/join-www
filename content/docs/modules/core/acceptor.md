---

title: "Acceptor"
weight: 9
---

# Acceptor

Join provides **acceptor classes** for building network servers that accept incoming connections.
Acceptors handle the listening socket and produce connected client sockets when new connections arrive.

Acceptors are:

* **protocol‑agnostic** — work with any stream protocol
* **event‑driven** — integrate with the reactor
* **simple to use** — minimal boilerplate code
* **secure** — built‑in TLS/SSL support

Two acceptor types are available:

* **BasicStreamAcceptor** — for TCP and Unix stream connections
* **BasicTlsAcceptor** — for encrypted TLS/SSL connections

---

## BasicStreamAcceptor

The base acceptor class for connection‑oriented protocols.

### Creating a TCP server

```cpp
#include <join/acceptor.hpp>

using join;

Tcp::Acceptor acceptor;
Tcp::Endpoint endpoint("0.0.0.0", 8080);

if (acceptor.create(endpoint) == -1) {
    // Handle error
}
```

The `create()` method:
* Creates the listening socket
* Binds to the specified endpoint
* Starts listening with maximum backlog (`SOMAXCONN`)

### Accepting connections

```cpp
// Accept and get a socket
Tcp::Socket client = acceptor.accept();

if (client.connected()) {
    // Handle client connection
}
```

Accepted sockets are automatically configured:
* Set to **non‑blocking mode**
* TCP_NODELAY enabled (for TCP sockets)
* Ready to use immediately

### Accepting as a stream

```cpp
// Accept and get a stream wrapper
Tcp::Stream stream = acceptor.acceptStream();

if (stream.connected()) {
    stream << "Welcome!\n";
}
```

---

## BasicTlsAcceptor

Acceptor for encrypted TLS/SSL connections.

### Creating a secure server

```cpp
#include <join/acceptor.hpp>

using join;

Tls::Acceptor acceptor;

// Set server certificate and key
if (acceptor.setCertificate("server.pem", "server-key.pem") == -1) {
    // Handle error
}

Tls::Endpoint endpoint("0.0.0.0", 8443);
acceptor.create(endpoint);
```

⚠️ Server certificate and private key must be set before accepting connections.

### Accepting plaintext connections

```cpp
// Accept without TLS encryption (for STARTTLS)
Tls::Socket client = acceptor.accept();

if (client.connected()) {
    // Connection established but not encrypted
    // Client can call startEncryption() later
}
```

### Accepting encrypted connections

```cpp
// Accept with immediate TLS handshake
Tls::Socket client = acceptor.acceptEncrypted();

if (client.connected()) {
    // TLS handshake initiated
    // Client should call waitEncrypted() to complete handshake
}
```

The `acceptEncrypted()` method:
* Accepts the TCP connection
* Initializes TLS handshake state
* Returns socket ready for handshake completion

### Accepting as an encrypted stream

```cpp
Tls::Stream stream = acceptor.acceptStreamEncrypted();

if (stream.connected()) {
    if (stream.waitEncrypted(5000)) {
        // Secure connection established
    }
}
```

---

## Certificate configuration

### Server certificate and key

```cpp
// Certificate and key in same file
acceptor.setCertificate("server.pem");

// Certificate and key in separate files
acceptor.setCertificate("cert.pem", "key.pem");
```

The acceptor verifies that the private key matches the certificate.

### Client certificate verification

```cpp
// Enable client certificate verification
acceptor.setVerify(true);

// Set trusted CA certificates
acceptor.setCaCertificate("ca-bundle.pem");
```

When verification is enabled:
* Clients must present a valid certificate
* Certificate must be signed by a trusted CA
* Handshake fails if verification fails

### Verification depth

```cpp
// Limit certificate chain depth
acceptor.setVerify(true, 5);  // Maximum 5 levels
```

---

## TLS configuration

### Cipher suites

```cpp
// TLSv1.2 and below
acceptor.setCipher("ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256");

// TLSv1.3
acceptor.setCipher_1_3("TLS_AES_256_GCM_SHA384:TLS_AES_128_GCM_SHA256");
```

### Elliptic curves (OpenSSL 3.0+)

```cpp
acceptor.setCurve("P-521:P-384:P-256");
```

### Default security settings

The TLS acceptor is configured with secure defaults:
* SSLv2, SSLv3, TLSv1.0, TLSv1.1 **disabled**
* Compression **disabled**
* Server cipher preference **enabled**
* Session caching **enabled**
* Client renegotiation **disabled**
* Strong cipher suites by default

---

## Server examples

### Simple echo server

```cpp
#include <join/acceptor.hpp>

using join;

Tcp::Acceptor acceptor;
Tcp::Endpoint endpoint("0.0.0.0", 9000);
acceptor.create(endpoint);

while (true) {
    Tcp::Socket client = acceptor.accept();
    
    if (client.connected()) {
        char buffer[1024];
        int n = client.read(buffer, sizeof(buffer));
        if (n > 0) {
            client.write(buffer, n);
        }
        client.disconnect();
    }
}
```

### Multi‑threaded server

```cpp
#include <join/acceptor.hpp>
#include <thread>

using join;

void handleClient(Tcp::Socket client) {
    char buffer[1024];
    while (true) {
        int n = client.read(buffer, sizeof(buffer));
        if (n <= 0) break;
        client.write(buffer, n);
    }
    client.disconnect();
}

int main() {
    Tcp::Acceptor acceptor;
    Tcp::Endpoint endpoint("0.0.0.0", 9000);
    acceptor.create(endpoint);
    
    while (true) {
        Tcp::Socket client = acceptor.accept();
        if (client.connected()) {
            std::thread(handleClient, std::move(client)).detach();
        }
    }
}
```

### HTTPS server

```cpp
#include <join/acceptor.hpp>

using join;

Https::Acceptor acceptor;

// Configure TLS
acceptor.setCertificate("server.pem", "server-key.pem");
acceptor.setCipher("ECDHE-RSA-AES256-GCM-SHA384");

Https::Endpoint endpoint("0.0.0.0", 8443);
acceptor.create(endpoint);

while (true) {
    Https::Socket client = acceptor.acceptEncrypted();
    
    if (client.connected() && client.waitEncrypted(5000)) {
        // Handle HTTPS request
        std::string response = 
            "HTTP/1.1 200 OK\r\n"
            "Content-Type: text/plain\r\n"
            "Content-Length: 13\r\n\r\n"
            "Hello, HTTPS!";
        
        client.writeExactly(response.c_str(), response.size());
        client.disconnect();
    }
}
```

### Unix domain socket server

```cpp
#include <join/acceptor.hpp>

using join;

UnixStream::Acceptor acceptor;
UnixStream::Endpoint endpoint("/tmp/server.sock");

acceptor.create(endpoint);

while (true) {
    UnixStream::Socket client = acceptor.accept();
    
    if (client.connected()) {
        // Handle local IPC connection
    }
}
```

---

## Reactor integration

Acceptors inherit from `EventHandler` and can be registered with the reactor.

### Event‑driven server

```cpp
#include <join/acceptor.hpp>
#include <join/reactor.hpp>

using join;

class Server : public Tcp::Acceptor {
protected:
    void onReceive() override {
        Tcp::Socket client = accept();
        if (client.connected()) {
            // Handle new connection
        }
    }
};

int main() {
    Server server;
    Tcp::Endpoint endpoint("0.0.0.0", 9000);
    server.create(endpoint);
    
    Reactor::instance()->addHandler(&server);
    Reactor::instance()->run();
}
```

The reactor will call `onReceive()` whenever a new connection is ready to accept.

---

## Querying acceptor state

### Check if listening

```cpp
if (acceptor.opened()) {
    // Acceptor is listening
}
```

### Get local endpoint

```cpp
auto endpoint = acceptor.localEndpoint();
std::cout << "Listening on " << endpoint.ip() 
          << ":" << endpoint.port() << std::endl;
```

This is useful when binding to port 0 (random port assignment):

```cpp
Tcp::Endpoint endpoint("0.0.0.0", 0);
acceptor.create(endpoint);

auto actual = acceptor.localEndpoint();
std::cout << "Assigned port: " << actual.port() << std::endl;
```

### Protocol information

```cpp
int family = acceptor.family();      // AF_INET, AF_INET6, AF_UNIX
int type = acceptor.type();          // SOCK_STREAM
int proto = acceptor.protocol();     // IPPROTO_TCP
```

---

## Closing acceptors

```cpp
acceptor.close();
```

This:
* Closes the listening socket
* Stops accepting new connections
* Does not affect existing client connections

---

## Error handling

Acceptor methods return `-1` on error and set the global `lastError`:

```cpp
if (acceptor.create(endpoint) == -1) {
    std::cerr << "Failed to create acceptor: " 
              << lastError.message() << std::endl;
}

Tcp::Socket client = acceptor.accept();
if (!client.connected()) {
    if (lastError == std::errc::resource_unavailable_try_again) {
        // No connection available (non-blocking)
    } else {
        std::cerr << "Accept failed: " 
                  << lastError.message() << std::endl;
    }
}
```

---

## STARTTLS pattern

For protocols that start plaintext and upgrade to TLS:

```cpp
Tls::Acceptor acceptor;
acceptor.setCertificate("server.pem", "server-key.pem");

Tls::Endpoint endpoint("0.0.0.0", 587);  // SMTP submission
acceptor.create(endpoint);

Tls::Socket client = acceptor.accept();

// Exchange plaintext
client.write("220 SMTP Server Ready\r\n", 23);

// Wait for STARTTLS command
// ...

// Upgrade to TLS
client.startEncryption();
if (client.waitEncrypted(5000)) {
    // Now encrypted
}
```

---

## IPv6 configuration

By default, IPv6 acceptors accept both IPv4 and IPv6 connections (dual‑stack):

```cpp
Tcp::Endpoint endpoint("::", 8080);  // Listen on all interfaces
acceptor.create(endpoint);
```

The `IPV6_V6ONLY` option is automatically disabled, allowing IPv4 clients to connect to IPv6 sockets.

---

## Best practices

* Always check return values for errors
* Set certificates **before** calling `create()` for TLS acceptors
* Use `acceptEncrypted()` for immediate TLS handshake
* Use `accept()` + `startEncryption()` for STARTTLS patterns
* Enable client certificate verification for mutual TLS
* Configure strong cipher suites for production
* Use reactor integration for scalable servers
* Close acceptors explicitly when done
* Handle `SOMAXCONN` backlog automatically — no manual tuning needed
* For Unix sockets, ensure filesystem path is writable

---

## Summary

| Feature                      | BasicStreamAcceptor | BasicTlsAcceptor |
| ---------------------------- | ------------------- | ---------------- |
| TCP connections              | ✅                   | ✅                |
| Unix domain connections      | ✅                   | ✅                |
| TLS/SSL encryption           | ❌                   | ✅                |
| Client certificates          | ❌                   | ✅                |
| STARTTLS support             | ❌                   | ✅                |
| Cipher configuration         | ❌                   | ✅                |
| Reactor integration          | ✅                   | ✅                |
| IPv4/IPv6 dual‑stack         | ✅                   | ✅                |

| Protocol      | Acceptor Type         | Use Case                |
| ------------- | --------------------- | ----------------------- |
| Tcp           | BasicStreamAcceptor   | HTTP, custom protocols  |
| UnixStream    | BasicStreamAcceptor   | Local IPC               |
| Tls           | BasicTlsAcceptor      | Secure TCP              |
| Http          | BasicStreamAcceptor   | Web servers             |
| Https         | BasicTlsAcceptor      | Secure web servers      |
| Smtp          | BasicTlsAcceptor      | Email servers (STARTTLS)|
| Smtps         | BasicTlsAcceptor      | Secure email servers    |
