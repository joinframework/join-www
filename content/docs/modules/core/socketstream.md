---

title: "Socket Stream"
weight: 90
---

# Socket Stream

Join provides **C++ iostream wrappers** for network sockets, enabling standard stream I/O operations.
Socket streams use `std::streambuf` internally and integrate seamlessly with C++ I/O facilities.

Socket streams are:

* **standard‑compliant** — work with all `std::iostream` features
* **buffered** — automatic buffering for efficiency
* **timeout‑aware** — configurable I/O timeouts
* **type‑safe** — support stream operators (`<<`, `>>`)

Two stream types are available:

* **BasicSocketStream** — for TCP and Unix stream connections
* **BasicTlsStream** — for encrypted TLS/SSL connections

---

## BasicSocketStream

Standard iostream wrapper for stream sockets.

### Creating a TCP stream

```cpp
#include <join/socketstream.hpp>

using namespace join;

Tcp::Stream stream;
Tcp::Endpoint server("example.com", 80);

stream.connect(server);
```

### Writing data

```cpp
// Using stream operators
stream << "GET / HTTP/1.1\r\n";
stream << "Host: example.com\r\n";
stream << "\r\n";
stream.flush();

// Using write methods
stream.write("Hello", 5);
```

### Reading data

```cpp
// Using stream operators
std::string line;
std::getline(stream, line);

// Reading formatted data
int value;
stream >> value;

// Reading raw data
char buffer[1024];
stream.read(buffer, sizeof(buffer));
```

### Stream state

```cpp
if (stream.good())
{
    // Stream is ready for I/O
}

if (stream.fail())
{
    // I/O operation failed
}

if (stream.eof())
{
    // End of stream reached
}

// Clear error state
stream.clear();
```

---

## BasicTlsStream

Encrypted iostream wrapper for TLS/SSL connections.

### Creating a secure stream

```cpp
#include <join/socketstream.hpp>

using namespace join;

Tls::Stream stream;

// Configure TLS
stream.setVerify(true);
stream.setCaFile("/etc/ssl/certs/ca-bundle.crt");

Tls::Endpoint server("example.com", 443);
stream.connectEncrypted(server);
```

The `connectEncrypted()` method:
* Establishes TCP connection
* Performs TLS handshake
* Waits for encryption to complete (using the stream timeout)

### STARTTLS pattern

```cpp
Tls::Stream stream;
Tls::Endpoint server("mail.example.com", 587);

// Connect without encryption
stream.connect(server);

// Exchange plaintext
stream << "EHLO client.example.com\r\n";
stream.flush();

// ... wait for STARTTLS response ...

// Upgrade to TLS
stream.startEncryption();

if (stream.good())
{
    // Now encrypted
}
```

### Certificate configuration

```cpp
// Set client certificate
stream.setCertificate("client.pem", "client-key.pem");

// Set trusted CA certificates
stream.setCaFile("/etc/ssl/certs/ca-bundle.crt");
stream.setCaPath("/etc/ssl/certs/");

// Enable peer verification
stream.setVerify(true);
```

### Cipher configuration

```cpp
// TLSv1.2 and below
stream.setCipher("ECDHE-RSA-AES256-GCM-SHA384");

// TLSv1.3
stream.setCipher_1_3("TLS_AES_256_GCM_SHA384");
```

---

## Timeout configuration

Streams have a default timeout of **30 seconds** for all I/O operations.

### Setting timeout

```cpp
// Set 5 second timeout
stream.timeout(5000);

// Set infinite timeout (blocking)
stream.timeout(0);
```

### Getting current timeout

```cpp
int ms = stream.timeout();
```

Timeouts apply to connection establishment, read and write operations, TLS handshake, and graceful disconnect.

---

## Connection management

### Connecting

```cpp
Tcp::Stream stream;
Tcp::Endpoint server("192.168.1.100", 8080);

stream.connect(server);

if (stream.fail())
{
    std::cerr << "Connection failed\n";
}
```

### Binding local endpoint

```cpp
Tcp::Stream stream;
stream.bind(Tcp::Endpoint("0.0.0.0", 5000));
stream.connect(Tcp::Endpoint("example.com", 80));
```

### Disconnecting

```cpp
// Graceful shutdown: flushes buffer, shuts down socket, waits for peer
stream.disconnect();

// Immediate close
stream.close();
```

### Connection state

```cpp
if (stream.opened())    { /* socket fd is open */ }
if (stream.connected()) { /* socket is connected */ }
if (stream.encrypted()) { /* TLS handshake completed (TLS streams only) */ }
```

---

## Buffering

Streams use **4 KB buffers** for both input and output.

### Flushing output

```cpp
stream << "Hello\n";
stream.flush();  // ensure data is sent immediately
```

Automatic flushing occurs when the buffer is full, `std::endl` is used, `flush()` or `sync()` is called, or the stream is destroyed.

> **Note:** On I/O errors, `underflow()` and `overflow()` close the underlying socket in addition to setting `failbit`.

---

## Stream examples

### HTTP client

```cpp
#include <join/socketstream.hpp>
#include <iostream>

using namespace join;

Tcp::Stream stream;
stream.connect(Tcp::Endpoint("example.com", 80));

stream << "GET / HTTP/1.1\r\n"
       << "Host: example.com\r\n"
       << "Connection: close\r\n"
       << "\r\n"
       << std::flush;

std::string line;
while (std::getline(stream, line))
{
    std::cout << line << "\n";
}
```

### HTTPS client

```cpp
#include <join/socketstream.hpp>
#include <iostream>

using namespace join;

Tls::Stream stream;
stream.setVerify(true);
stream.setCaFile("/etc/ssl/certs/ca-bundle.crt");
stream.connectEncrypted(Tls::Endpoint("example.com", 443));

stream << "GET / HTTP/1.1\r\n"
       << "Host: example.com\r\n"
       << "Connection: close\r\n"
       << "\r\n"
       << std::flush;

std::string line;
while (std::getline(stream, line))
{
    std::cout << line << "\n";
}
```

### Echo client

```cpp
#include <join/socketstream.hpp>
#include <iostream>

using namespace join;

Tcp::Stream stream;
stream.connect(Tcp::Endpoint("localhost", 9000));
stream.timeout(5000);

std::string message;
while (std::getline(std::cin, message))
{
    stream << message << "\n" << std::flush;

    std::string response;
    std::getline(stream, response);
    std::cout << "Echo: " << response << "\n";
}
```

### Unix domain stream

```cpp
#include <join/socketstream.hpp>

using namespace join;

UnixStream::Stream stream;
stream.connect(UnixStream::Endpoint("/tmp/server.sock"));

stream << "Hello from client\n" << std::flush;

std::string response;
std::getline(stream, response);
```

### Line‑based protocol

```cpp
using namespace join;

Tcp::Stream stream;
stream.connect(server);

stream << "COMMAND arg1 arg2\n" << std::flush;

std::string line;
std::getline(stream, line);

std::istringstream iss(line);
std::string status, message;
iss >> status;
std::getline(iss, message);
```

---

## Exception handling

Streams can throw `std::ios_base::failure` when exceptions are enabled.

### Enabling exceptions

```cpp
stream.exceptions(std::ios_base::failbit | std::ios_base::badbit);

try
{
    stream.connect(server);
    stream << "Hello\n" << std::flush;
}
catch (const std::ios_base::failure& e)
{
    std::cerr << "Stream error: " << e.what() << "\n";
}
```

### Without exceptions

```cpp
stream.connect(server);

if (stream.fail())
{
    std::cerr << "Connection failed\n";
    return;
}

stream << "Hello\n" << std::flush;

if (stream.fail())
{
    std::cerr << "Write failed\n";
}
```

---

## Endpoint queries

```cpp
auto local  = stream.localEndpoint();
auto remote = stream.remoteEndpoint();
```

---

## Accessing the underlying socket

```cpp
Tcp::Socket& sock = stream.socket();

sock.setOption(BasicSocket<Tcp>::Option::NoDelay, 1);
sock.setOption(BasicSocket<Tcp>::Option::KeepAlive, 1);
```

---

## Binary I/O

```cpp
struct Header { uint32_t length; uint16_t type; };

// Write
Header hdr = {1024, 42};
stream.write(reinterpret_cast<char*>(&hdr), sizeof(hdr));
stream.flush();

// Read
Header in;
stream.read(reinterpret_cast<char*>(&in), sizeof(in));
if (stream.gcount() == sizeof(in)) { /* success */ }
```

---

## Common patterns

### Request‑response protocol

```cpp
void sendRequest(Tcp::Stream& stream, const std::string& request)
{
    stream << request << "\n" << std::flush;
}

std::string receiveResponse(Tcp::Stream& stream)
{
    std::string response;
    std::getline(stream, response);
    return response;
}
```

### Read all available data

```cpp
std::string readAll(Tcp::Stream& stream)
{
    std::ostringstream buf;
    buf << stream.rdbuf();
    return buf.str();
}
```

---

## Performance considerations

* Default buffer size is **4 KB** — reduces system calls automatically
* Flush explicitly when low latency matters
* Disable Nagle for latency-sensitive applications via `stream.socket().setOption(Option::NoDelay, 1)`
* Increase socket buffer sizes for high-throughput via `SndBuffer` / `RcvBuffer` options

---

## Move semantics

Streams are movable but not copyable:

```cpp
Tcp::Stream s1;
Tcp::Stream s2 = std::move(s1);

std::vector<Tcp::Stream> v;
v.push_back(std::move(s2));
```

---

## Best practices

* Use **streams for text‑based protocols** (HTTP, SMTP, etc.)
* Use **raw sockets** for binary protocols or when precise control is needed
* Always check stream state after I/O operations
* Set appropriate timeouts for your use case
* Enable exceptions for cleaner error handling in small programs
* Flush explicitly when immediate sending is required
* Use `disconnect()` instead of `close()` for graceful shutdown
* For TLS, always enable peer verification in production

---

## Summary

| Feature                  | BasicSocketStream | BasicTlsStream |
| ------------------------ | :---------------: | :------------: |
| Text I/O                 | ✅                 | ✅              |
| Binary I/O               | ✅                 | ✅              |
| Stream operators         | ✅                 | ✅              |
| Buffering (4 KB)         | ✅                 | ✅              |
| Timeouts (default 30s)   | ✅                 | ✅              |
| TLS/SSL encryption       | ❌                 | ✅              |
| Certificate verification | ❌                 | ✅              |
| STARTTLS                 | ❌                 | ✅              |
| Graceful shutdown        | ✅                 | ✅              |

| Protocol   | Stream Type       | Use Case                    |
| ---------- | ----------------- | --------------------------- |
| UnixStream | BasicSocketStream | Local IPC                   |
| Tcp        | BasicSocketStream | HTTP, custom text protocols |
| Tls        | BasicTlsStream    | Secure TCP                  |
