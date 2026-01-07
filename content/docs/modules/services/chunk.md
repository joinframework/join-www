---
title: "Chunk Stream"
weight: 2
---

# Chunk Stream

Join provides **HTTP chunked transfer encoding** for streams.
It transparently encodes data into chunks when writing and decodes chunks when reading,
implementing the HTTP/1.1 chunked transfer encoding specification.

`Chunkstream` is designed to be:

* **transparent** — works like any standard stream
* **automatic** — handles chunk encoding/decoding
* **efficient** — configurable chunk sizes
* **standard** — implements RFC 7230

---

## Basic usage

### Writing chunked data

```cpp
#include <join/chunkstream.hpp>

std::stringstream storage;
Chunkstream stream(storage);

// Write data - automatically chunked
stream << "Hello, ";
stream << "World!";
stream.flush();  // Sends final chunk

// Storage now contains:
// 7\r\n
// Hello, \r\n
// 6\r\n
// World!\r\n
// 0\r\n
// \r\n
```

### Reading chunked data

```cpp
std::stringstream storage(chunkedData);
Chunkstream stream(storage);

// Read data - automatically dechunked
std::string line;
std::getline(stream, line);

// Or read entire stream
std::string data;
std::getline(stream, data, '\0');
```

---

## Construction

```cpp
// Default chunk size (16 KB)
std::iostream& base = ...;
Chunkstream stream(base);

// Custom chunk size
Chunkstream stream(base, 4096);  // 4 KB chunks
```

---

## Chunk format

Chunks follow the HTTP/1.1 specification:

```
<chunk-size-hex>\r\n
<chunk-data>\r\n
...
0\r\n
\r\n
```

Example:
```
5\r\n
Hello\r\n
7\r\n
, World\r\n
0\r\n
\r\n
```

---

## Writing data

### Basic writing

```cpp
Chunkstream stream(storage);

// Write string
stream << "Data to send";

// Write binary
char buffer[1024] = {...};
stream.write(buffer, sizeof(buffer));

// Flush to send final chunk
stream.flush();
```

### Streaming data

```cpp
Chunkstream stream(storage);

// Stream data continuously
for (const auto& chunk : dataChunks)
{
    stream << chunk;
}

// Send terminating chunk
stream.flush();
```

---

## Reading data

### Basic reading

```cpp
Chunkstream stream(storage);

// Read line by line
std::string line;
while (std::getline(stream, line))
{
    process(line);
}
```

### Binary reading

```cpp
Chunkstream stream(storage);

char buffer[1024];
while (stream.read(buffer, sizeof(buffer)))
{
    size_t bytesRead = stream.gcount();
    process(buffer, bytesRead);
}
```

---

## HTTP usage

### Server sending chunked response

```cpp
// Send response headers
HttpResponse res;
res.response("200", "OK");
res.header("Transfer-Encoding", "chunked");
res.header("Content-Type", "text/plain");
res.writeHeaders(clientStream);

// Wrap stream with Chunkstream
Chunkstream chunked(clientStream);

// Send data in chunks
chunked << "Processing...\n";
chunked.flush();

// More processing...
chunked << "Still working...\n";
chunked.flush();

// Final data
chunked << "Done!\n";
chunked.flush();  // Sends terminating chunk
```

### Client reading chunked response

```cpp
// Read response headers
HttpResponse res;
res.readHeaders(serverStream);

if (res.header("Transfer-Encoding").find("chunked") != std::string::npos)
{
    // Wrap with Chunkstream
    Chunkstream chunked(serverStream);

    // Read all data
    std::string data;
    std::getline(chunked, data, '\0');

    process(data);
}
```

---

## Chunk size configuration

```cpp
// Small chunks for low latency
Chunkstream stream(base, 1024);  // 1 KB

// Large chunks for throughput
Chunkstream stream(base, 65536);  // 64 KB

// Default (balanced)
Chunkstream stream(base);  // 16 KB
```

### Trade-offs

| Chunk size | Latency | Throughput | Overhead |
|------------|---------|------------|----------|
| Small (1 KB)  | Low  | Lower      | Higher   |
| Medium (16 KB) | Medium | Good    | Balanced |
| Large (64 KB) | Higher | Best     | Lower    |

---

## Error handling

```cpp
Chunkstream stream(storage);

if (!stream)
{
    std::error_code ec = join::lastError;

    if (ec == Errc::InvalidParam)
    {
        // Invalid chunk format
    }
    else if (ec == Errc::MessageTooLong)
    {
        // Chunk exceeds maximum size
    }
}
```

---

## Common patterns

### Progressive response

```cpp
void sendProgressiveData(std::iostream& client)
{
    HttpResponse res;
    res.response("200", "OK");
    res.header("Transfer-Encoding", "chunked");
    res.header("Content-Type", "application/json");
    res.writeHeaders(client);

    Chunkstream stream(client);

    stream << "[\n";

    bool first = true;
    for (const auto& item : generateItems())
    {
        if (!first) stream << ",\n";
        stream << "  " << item.toJson();
        stream.flush();  // Send immediately
        first = false;
    }

    stream << "\n]\n";
    stream.flush();  // Final chunk
}
```

### Streaming file upload

```cpp
void uploadFile(const std::string& filename, std::iostream& server)
{
    HttpRequest req(HttpMethod::Post);
    req.path("/upload");
    req.header("Transfer-Encoding", "chunked");
    req.writeHeaders(server);

    Chunkstream stream(server);

    std::ifstream file(filename, std::ios::binary);
    stream << file.rdbuf();
    stream.flush();
}
```

### Server-sent events

```cpp
void sendEvents(std::iostream& client)
{
    HttpResponse res;
    res.response("200", "OK");
    res.header("Transfer-Encoding", "chunked");
    res.header("Content-Type", "text/event-stream");
    res.header("Cache-Control", "no-cache");
    res.writeHeaders(client);

    Chunkstream stream(client);

    while (running)
    {
        Event event = waitForEvent();

        stream << "event: " << event.type << "\n";
        stream << "data: " << event.data << "\n\n";
        stream.flush();
    }
}
```

---

## Best practices

### Always flush

```cpp
Chunkstream stream(storage);

// Write data
stream << data;

// Send immediately
stream.flush();
```

### Use appropriate chunk size

```cpp
// Real-time updates: small chunks
Chunkstream stream(base, 1024);

// Bulk data transfer: large chunks
Chunkstream stream(base, 65536);

// Unknown workload: use default
Chunkstream stream(base);
```

### Handle terminating chunk

```cpp
// Flush sends the terminating chunk
stream.flush();

// Or let destructor handle it
{
    Chunkstream stream(base);
    stream << data;
}  // Automatically sends terminating chunk
```

---

## Integration with HTTP

### With compression

```cpp
// Compression then chunking
std::iostream& base = ...;
Zstream compressed(base, Zstream::Gzip);
Chunkstream chunked(compressed);

chunked << data;
chunked.flush();
```

### With HttpClient

```cpp
// Client automatically handles chunked encoding
HttpClient client("example.com");

HttpRequest req(HttpMethod::Post);
req.header("Transfer-Encoding", "chunked");

client << req;

// Write body - automatically chunked
client << data;
client.flush();
```

---

## Limitations

- Maximum chunk size: 16 KB (default) or as configured
- Chunks larger than configured size return error
- Binary safe (handles null bytes correctly)
- Single stream (not thread-safe)

---

## Summary

| Feature                  | Supported |
|--------------------------|-----------|
| Chunked encoding         | ✅        |
| Chunked decoding         | ✅        |
| Configurable chunk size  | ✅        |
| Binary data              | ✅        |
| Stream interface         | ✅        |
| HTTP/1.1 compliant       | ✅        |
| Move semantics           | ✅        |
