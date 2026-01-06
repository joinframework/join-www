---

title: "Socket Stream"
weight: 8
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

using join;

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
if (stream.good()) {
    // Stream is ready for I/O
}

if (stream.fail()) {
    // I/O operation failed
}

if (stream.eof()) {
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

using join;

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
* Waits for encryption to complete (using timeout)

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

if (stream.good()) {
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
std::cout << "Timeout: " << ms << " ms" << std::endl;
```

Timeouts apply to:
* Connection establishment
* Read operations
* Write operations
* TLS handshake
* Graceful disconnect

---

## Connection management

### Connecting

```cpp
Tcp::Stream stream;
Tcp::Endpoint server("192.168.1.100", 8080);

stream.connect(server);

if (stream.fail()) {
    std::cerr << "Connection failed" << std::endl;
}
```

### Binding local endpoint

```cpp
Tcp::Stream stream;
Tcp::Endpoint local("0.0.0.0", 5000);
stream.bind(local);

Tcp::Endpoint server("example.com", 80);
stream.connect(server);
```

### Disconnecting

```cpp
// Graceful shutdown
stream.disconnect();

// Immediate close
stream.close();
```

The `disconnect()` method:
* Flushes buffered data
* Performs graceful shutdown
* Waits for peer acknowledgment (up to timeout)

### Connection state

```cpp
if (stream.opened()) {
    // Socket is open
}

if (stream.connected()) {
    // Socket is connected
}

if (stream.encrypted()) {
    // Connection is encrypted (TLS streams only)
}
```

---

## Buffering

Streams use **4 KB buffers** for both input and output operations.

### Flushing output

```cpp
stream << "Hello\n";
stream.flush();  // Ensure data is sent immediately
```

Automatic flushing occurs when:
* Buffer is full
* `std::endl` is used
* `flush()` is called
* `sync()` is called
* Stream is destroyed

### Synchronizing

```cpp
// Flush and sync with underlying socket
stream.sync();
```

---

## Stream examples

### HTTP client

```cpp
#include <join/socketstream.hpp>
#include <iostream>

using join;

Tcp::Stream stream;
Tcp::Endpoint server("example.com", 80);

stream.connect(server);

// Send request
stream << "GET / HTTP/1.1\r\n"
       << "Host: example.com\r\n"
       << "Connection: close\r\n"
       << "\r\n"
       << std::flush;

// Read response
std::string line;
while (std::getline(stream, line)) {
    std::cout << line << std::endl;
}
```

### HTTPS client

```cpp
#include <join/socketstream.hpp>
#include <iostream>

using join;

Tls::Stream stream;
stream.setVerify(true);
stream.setCaFile("/etc/ssl/certs/ca-bundle.crt");

Tls::Endpoint server("example.com", 443);
stream.connectEncrypted(server);

// Send request
stream << "GET / HTTP/1.1\r\n"
       << "Host: example.com\r\n"
       << "Connection: close\r\n"
       << "\r\n"
       << std::flush;

// Read response
std::string line;
while (std::getline(stream, line)) {
    std::cout << line << std::endl;
}
```

### Echo client

```cpp
#include <join/socketstream.hpp>
#include <iostream>

using join;

Tcp::Stream stream;
Tcp::Endpoint server("localhost", 9000);

stream.connect(server);
stream.timeout(5000);

std::string message;
while (std::getline(std::cin, message)) {
    stream << message << "\n" << std::flush;
    
    std::string response;
    std::getline(stream, response);
    std::cout << "Echo: " << response << std::endl;
}
```

### Unix domain stream

```cpp
#include <join/socketstream.hpp>

using join;

UnixStream::Stream stream;
UnixStream::Endpoint server("/tmp/server.sock");

stream.connect(server);

stream << "Hello from client\n" << std::flush;

std::string response;
std::getline(stream, response);
```

### Line‑based protocol

```cpp
#include <join/socketstream.hpp>
#include <sstream>

using join;

Tcp::Stream stream;
stream.connect(server);

// Send command
stream << "COMMAND arg1 arg2\n" << std::flush;

// Parse response
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

try {
    stream.connect(server);
    stream << "Hello\n" << std::flush;
} catch (const std::ios_base::failure& e) {
    std::cerr << "Stream error: " << e.what() << std::endl;
}
```

### Without exceptions

```cpp
stream.connect(server);

if (stream.fail()) {
    std::cerr << "Connection failed" << std::endl;
    return;
}

stream << "Hello\n" << std::flush;

if (stream.fail()) {
    std::cerr << "Write failed" << std::endl;
}
```

---

## Endpoint queries

### Local endpoint

```cpp
auto local = stream.localEndpoint();
std::cout << "Local: " << local.ip() 
          << ":" << local.port() << std::endl;
```

### Remote endpoint

```cpp
auto remote = stream.remoteEndpoint();
std::cout << "Remote: " << remote.ip() 
          << ":" << remote.port() << std::endl;
```

---

## Accessing underlying socket

Direct access to the socket is available when low‑level operations are needed.

```cpp
// Get socket reference
Tcp::Socket& sock = stream.socket();

// Use socket methods
sock.setOption(BasicSocket<Tcp>::Option::NoDelay, 1);
sock.setOption(BasicSocket<Tcp>::Option::KeepAlive, 1);

// Check connection state
if (sock.connected()) {
    // ...
}
```

---

## Binary I/O

Streams support binary data transfer.

### Writing binary data

```cpp
struct Header {
    uint32_t length;
    uint16_t type;
};

Header hdr = {1024, 42};
stream.write(reinterpret_cast<char*>(&hdr), sizeof(hdr));
stream.flush();
```

### Reading binary data

```cpp
Header hdr;
stream.read(reinterpret_cast<char*>(&hdr), sizeof(hdr));

if (stream.gcount() == sizeof(hdr)) {
    // Successfully read header
}
```

---

## Formatted I/O

Streams support all standard formatting manipulators.

```cpp
#include <iomanip>

stream << std::hex << std::setw(8) << std::setfill('0') << 255 << "\n";
stream << std::fixed << std::setprecision(2) << 3.14159 << "\n";
stream << std::boolalpha << true << "\n";
stream << std::flush;
```

---

## Performance considerations

### Buffering

* Default buffer size is **4 KB**
* Automatic buffering reduces system calls
* Manual flushing provides control over latency

### Timeout tuning

```cpp
// High-latency networks
stream.timeout(60000);  // 60 seconds

// Low-latency networks
stream.timeout(1000);   // 1 second

// Real-time applications
stream.timeout(100);    // 100 ms
```

### TCP options

```cpp
// Disable Nagle for low-latency
stream.socket().setOption(
    BasicSocket<Tcp>::Option::NoDelay, 1
);

// Increase buffer sizes for throughput
stream.socket().setOption(
    BasicSocket<Tcp>::Option::SndBuffer, 262144
);
stream.socket().setOption(
    BasicSocket<Tcp>::Option::RcvBuffer, 262144
);
```

---

## Move semantics

Streams are movable but not copyable.

```cpp
Tcp::Stream createStream() {
    Tcp::Stream stream;
    stream.connect(server);
    return stream;  // Move
}

Tcp::Stream stream1;
Tcp::Stream stream2 = std::move(stream1);  // Move assignment

std::vector<Tcp::Stream> streams;
streams.push_back(std::move(stream2));  // Move into container
```

---

## Best practices

* Use **streams for text‑based protocols** (HTTP, SMTP, etc.)
* Use **raw sockets for binary protocols** or when you need precise control
* Always check stream state after I/O operations
* Set appropriate timeouts for your use case
* Enable exceptions for cleaner error handling
* Flush explicitly when immediate sending is required
* Use `disconnect()` instead of `close()` for graceful shutdown
* For TLS, always enable peer verification in production
* Consider socket buffer sizes for high‑throughput applications

---

## Common patterns

### Request‑response protocol

```cpp
void sendRequest(Tcp::Stream& stream, const std::string& request) {
    stream << request << "\n" << std::flush;
}

std::string receiveResponse(Tcp::Stream& stream) {
    std::string response;
    std::getline(stream, response);
    return response;
}
```

### Chunked reading

```cpp
std::string readAll(Tcp::Stream& stream) {
    std::ostringstream buffer;
    buffer << stream.rdbuf();
    return buffer.str();
}
```

### Timeout‑based reading

```cpp
bool readWithTimeout(Tcp::Stream& stream, std::string& line, int ms) {
    stream.timeout(ms);
    std::getline(stream, line);
    return stream.good();
}
```

---

## Summary

| Feature                  | BasicSocketStream | BasicTlsStream |
| ------------------------ | ----------------- | -------------- |
| Text I/O                 | ✅                 | ✅              |
| Binary I/O               | ✅                 | ✅              |
| Stream operators         | ✅                 | ✅              |
| Buffering                | ✅                 | ✅              |
| Timeouts                 | ✅                 | ✅              |
| TLS/SSL encryption       | ❌                 | ✅              |
| Certificate verification | ❌                 | ✅              |
| STARTTLS                 | ❌                 | ✅              |
| Graceful shutdown        | ✅                 | ✅              |

| Protocol   | Stream Type       | Use Case                    |
| ---------- | ----------------- | --------------------------- |
| UnixStream | BasicSocketStream | Local IPC                   |
| Tcp        | BasicSocketStream | HTTP, custom text protocols |
| Tls        | BasicTlsStream    | Secure TCP                  |
