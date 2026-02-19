---

title: "Acceptor"
weight: 100
---

# Acceptor

Join provides **acceptor classes** for building network servers that accept incoming connections.
Acceptors handle the listening socket and produce connected client sockets when new connections arrive.

Acceptors are:

* **protocol-agnostic** — work with any stream protocol
* **event-driven** — integrate with the reactor
* **simple to use** — minimal boilerplate code
* **secure** — built-in TLS/SSL support

Two acceptor types are available:

* **BasicStreamAcceptor** — for TCP and Unix stream connections
* **BasicTlsAcceptor** — for encrypted TLS/SSL connections

---

## BasicStreamAcceptor

The base acceptor class for connection-oriented protocols such as TCP and Unix stream.

### Creating a TCP server

```cpp
#include <join/acceptor.hpp>

using namespace join;

Tcp::Acceptor acceptor;
Tcp::Endpoint endpoint("0.0.0.0", 8080);

if (acceptor.create(endpoint) == -1)
{
    // check join::lastError
}
```

The `create()` method creates the listening socket, binds to the specified endpoint, and starts listening with maximum backlog (`SOMAXCONN`).

### Accepting connections

```cpp
Tcp::Socket client = acceptor.accept();

if (client.connected())
{
    // handle client
}
```

Accepted sockets are set to non-blocking mode and, for TCP, have `TCP_NODELAY` enabled.

### Accepting as a stream

```cpp
Tcp::Stream stream = acceptor.acceptStream();

if (stream.connected())
{
    stream << "Welcome!\n";
}
```

---

## BasicTlsAcceptor

Acceptor for encrypted TLS/SSL connections.

### Creating a secure server

```cpp
#include <join/acceptor.hpp>

using namespace join;

Tls::Acceptor acceptor;

if (acceptor.setCertificate("server.pem", "server-key.pem") == -1)
{
    // check join::lastError
}

Tls::Endpoint endpoint("0.0.0.0", 8443);
acceptor.create(endpoint);
```

⚠️ Server certificate and private key must be set **before** accepting connections.

### Accepting plaintext connections (STARTTLS)

```cpp
Tls::Socket client = acceptor.accept();

if (client.connected())
{
    // connection established but not yet encrypted
    // client can call startEncryption() later
}
```

### Accepting encrypted connections

```cpp
Tls::Socket client = acceptor.acceptEncrypted();

if (client.connected())
{
    // TLS handshake initiated
    // call waitEncrypted() to complete it
}
```

### Accepting as an encrypted stream

```cpp
Tls::Stream stream = acceptor.acceptStreamEncrypted();

if (stream.connected())
{
    if (stream.waitEncrypted(5000))
    {
        // secure connection established
    }
}
```

---

## Certificate configuration

### Server certificate and key

```cpp
// certificate and key in the same file
acceptor.setCertificate("server.pem");

// certificate and key in separate files
acceptor.setCertificate("cert.pem", "key.pem");
```

### Client certificate verification

```cpp
acceptor.setVerify(true);
acceptor.setCaCertificate("ca-bundle.pem");
```

When verification is enabled, clients must present a certificate signed by a trusted CA; the handshake fails otherwise.

### Verification depth

```cpp
acceptor.setVerify(true, 5);  // maximum 5 chain levels
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

### Elliptic curves (OpenSSL ≥ 3.0)

```cpp
acceptor.setCurve("P-521:P-384:P-256");
```

`setCurve()` is only available when compiled against OpenSSL 3.0 or later.

### Default security settings

The TLS acceptor applies secure defaults out of the box: SSLv2, SSLv3, TLSv1.0, and TLSv1.1 are disabled; compression is disabled; server cipher preference is enabled; session caching is enabled; client renegotiation is disabled.

---

## Reactor integration

Acceptors inherit from `EventHandler` and integrate with the reactor via `ReactorThread` or a custom `Reactor`.

### Event-driven server with ReactorThread

The simplest approach — `ReactorThread` manages the event loop automatically:

```cpp
#include <join/acceptor.hpp>

using namespace join;

class Server : public Tcp::Acceptor
{
protected:
    void onReceive() override
    {
        Tcp::Socket client = accept();
        if (client.connected())
        {
            // handle new connection
        }
    }
};

Server server;
Tcp::Endpoint endpoint("0.0.0.0", 9000);
server.create(endpoint);

ReactorThread::reactor()->addHandler(&server);
// ReactorThread runs the event loop in a background thread automatically
```

### Event-driven server with a custom Reactor

When you need full control over the event loop thread — for example to set affinity or priority — use a standalone `Reactor` and register the acceptor manually:

```cpp
#include <join/acceptor.hpp>
#include <join/threadpool.hpp>

using namespace join;

Reactor reactor;

class Server : public Tcp::Acceptor
{
protected:
    void onReceive() override
    {
        Tcp::Socket client = accept();
        if (client.connected())
        {
            // handle new connection
        }
    }
};

Server server;
Tcp::Endpoint endpoint("0.0.0.0", 9000);
server.create(endpoint);

reactor.addHandler(&server, false);

ThreadPool pool;
pool.push([&reactor]() {
    Thread::affinity(pthread_self(), 2);
    Thread::priority(pthread_self(), 60);
    reactor.run();
});

// ... application runs ...

reactor.stop();
reactor.delHandler(&server);
```

The reactor calls `onReceive()` whenever a new connection is ready to accept.

---

## Server examples

### Simple echo server

```cpp
Tcp::Acceptor acceptor;
Tcp::Endpoint endpoint("0.0.0.0", 9000);
acceptor.create(endpoint);

while (true)
{
    Tcp::Socket client = acceptor.accept();
    if (client.connected())
    {
        char buffer[1024];
        int n = client.read(buffer, sizeof(buffer));
        if (n > 0) client.write(buffer, n);
        client.disconnect();
    }
}
```

### Unix domain socket server

```cpp
UnixStream::Acceptor acceptor;
UnixStream::Endpoint endpoint("/tmp/server.sock");
acceptor.create(endpoint);

while (true)
{
    UnixStream::Socket client = acceptor.accept();
    if (client.connected())
    {
        // handle local IPC connection
    }
}
```

### STARTTLS pattern

```cpp
Tls::Acceptor acceptor;
acceptor.setCertificate("server.pem", "server-key.pem");

Tls::Endpoint endpoint("0.0.0.0", 587);
acceptor.create(endpoint);

Tls::Socket client = acceptor.accept();

// exchange plaintext
client.write("220 SMTP Server Ready\r\n", 23);

// ... wait for STARTTLS command ...

// upgrade to TLS
client.startEncryption();
if (client.waitEncrypted(5000))
{
    // now encrypted
}
```

---

## Querying acceptor state

```cpp
// check if listening
if (acceptor.opened()) { }

// get the bound endpoint (useful when port 0 was used)
auto ep = acceptor.localEndpoint();

// protocol information
int family = acceptor.family();    // AF_INET, AF_INET6, AF_UNIX
int type   = acceptor.type();      // SOCK_STREAM
int proto  = acceptor.protocol();  // IPPROTO_TCP
```

---

## Closing acceptors

```cpp
acceptor.close();
```

Closes the listening socket and stops accepting new connections. Existing client connections are not affected.

---

## Error handling

Methods return `-1` on failure and set `join::lastError`:

```cpp
if (acceptor.create(endpoint) == -1)
{
    std::cerr << join::lastError.message() << "\n";
}
```

---

## IPv6 / dual-stack

By default, IPv6 acceptors accept both IPv4 and IPv6 connections (`IPV6_V6ONLY` is disabled):

```cpp
Tcp::Endpoint endpoint("::", 8080);
acceptor.create(endpoint);
```

---

## Best practices

* Always check return values — methods return `-1` on failure
* Set certificates **before** calling `create()` for TLS acceptors
* Use `acceptEncrypted()` for immediate TLS handshake
* Use `accept()` + `startEncryption()` for STARTTLS patterns
* Use `ReactorThread` for straightforward event-driven servers
* Use a custom `Reactor` with `pool.push()` when you need affinity or real-time priority on the dispatcher
* Close acceptors explicitly when done

---

## Summary

| Feature                  | BasicStreamAcceptor | BasicTlsAcceptor |
| ------------------------ | :-----------------: | :--------------: |
| TCP connections          | ✅                   | ✅                |
| Unix domain connections  | ✅                   | ✅                |
| TLS/SSL encryption       | ❌                   | ✅                |
| Client certificates      | ❌                   | ✅                |
| STARTTLS support         | ❌                   | ✅                |
| Cipher configuration     | ❌                   | ✅                |
| Reactor integration      | ✅                   | ✅                |
| IPv4/IPv6 dual-stack     | ✅                   | ✅                |
