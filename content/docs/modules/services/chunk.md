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
// libjoin.
#include <join/chunkstream.hpp>

// C++.
#include <sstream>

using namespace join;

std::stringstream storage;
Chunkstream stream(storage);

// Write data - automatically chunked
stream << "Hello, ";
stream << "World!";
stream.flush();  // Sends the pending data and the final chunk

// Storage now contains:
// d\r\n
// Hello, World!\r\n
// 0\r\n
// \r\n
```

Data is buffered: a chunk is sent each time the buffer is full (the chunk size), and `flush()` sends what remains followed by the **final chunk**.

### Reading chunked data

```cpp
std::stringstream storage("d\r\nHello, World!\r\n0\r\n\r\n");
Chunkstream stream(storage);

// Read data - automatically dechunked
std::string data(std::istreambuf_iterator<char>(stream), {});  // "Hello, World!"
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
char buffer[1024] = {};
stream.write(buffer, sizeof(buffer));

// Flush once, at the end: sends the final chunk
stream.flush();
```

⚠️ `flush()` **ends the chunked body**: it always sends the final chunk. Call it only once, after the last write.

### Streaming data

```cpp
Chunkstream stream(storage);

// Stream data continuously: full chunks are sent as the buffer fills up
for (const auto& part : parts)
{
    stream << part;
}

// Send the remaining data and the final chunk
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
    std::cout << line << "\n";
}
```

### Binary reading

```cpp
Chunkstream stream(storage);

char buffer[1024];
while (stream.read(buffer, sizeof(buffer)) || stream.gcount() > 0)
{
    std::streamsize bytesRead = stream.gcount();
    // process bytesRead bytes from buffer
}
```

The last block is usually shorter than the buffer: `gcount()` gives its size even when `read()` reached the end.

---

## HTTP usage

`Http::Server` and `Http::Client` handle chunked transfer encoding **automatically**:
set the `Transfer-Encoding: chunked` header and write the body as usual.

### Server sending chunked response

```cpp
server.addExecute(HttpMethod::Get, "/api/", "report", [](Http::Worker* worker) {
    worker->header("Content-Type", "text/plain");
    worker->header("Transfer-Encoding", "chunked");
    worker->sendHeaders();

    // Write the body - automatically chunked
    *worker << "Processing...\n";
    *worker << "Done!\n";

    // Send the final chunk
    worker->flush();
});
```

### Client reading chunked response

```cpp
Http::Client client("example.com");

HttpRequest req(HttpMethod::Get);
req.path("/api/report");

client << req;

HttpResponse res;
client >> res;

// The body is automatically dechunked: read it until the final chunk
std::string data(std::istreambuf_iterator<char>(client), {});
client.clear();  // ready for the next request
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

A malformed chunk stops the reading like the end of the body does, and sets `join::lastError`
(`Errc::InvalidParam` or `Errc::MessageTooLong`). Reset it before reading, then check it.
Note that input cut short in the middle of a chunk simply ends the data, without error.

```cpp
Chunkstream stream(storage);

join::lastError = {};

std::string data(std::istreambuf_iterator<char>(stream), {});

if (join::lastError)
{
    std::error_code ec = join::lastError;

    if (ec == Errc::InvalidParam)
    {
        // Invalid chunk format
    }
    else if (ec == Errc::MessageTooLong)
    {
        // Chunk exceeds the configured chunk size
    }
}
```

---

## Common patterns

### Streaming a large response

```cpp
server.addExecute(HttpMethod::Get, "/api/", "items", [](Http::Worker* worker) {
    worker->header("Content-Type", "application/json");
    worker->header("Transfer-Encoding", "chunked");
    worker->sendHeaders();

    *worker << "[";
    for (int i = 0; i < 1000; ++i)
    {
        if (i > 0) *worker << ",";
        *worker << i;  // full chunks are sent as the buffer fills up
    }
    *worker << "]";

    worker->flush();  // Final chunk
});
```

### Streaming file upload

```cpp
Http::Client client("example.com");

HttpRequest req(HttpMethod::Post);
req.path("/upload/file");
req.header("Transfer-Encoding", "chunked");

client << req;

// Write the file - automatically chunked
std::ifstream file("data.bin", std::ios::binary);
client << file.rdbuf();
client.flush();  // Final chunk

HttpResponse res;
client >> res;
```

---

## Best practices

### Flush once, at the end

```cpp
Chunkstream stream(storage);

// Write all the data
stream << data;

// Then send the final chunk
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

Always call `flush()` after the last write: the destructor only sends the final chunk when unsent data remains in the buffer.

```cpp
{
    Chunkstream stream(base);
    stream << data;
    stream.flush();  // Final chunk
}
```

---

## Integration with HTTP

### With compression

To send compressed and chunked data, compress first, then chunk:
the `Zstream` writes into the `Chunkstream`, which writes into the base stream.

```cpp
std::iostream& base = ...;
Chunkstream chunked(base);
Zstream compressed(chunked, Zstream::Gzip);

compressed << data;
compressed.flush();  // Ends compression and sends the final chunk
```

### With HTTP client

```cpp
// Client automatically handles chunked encoding
Http::Client client("example.com");

HttpRequest req(HttpMethod::Post);
req.path("/upload/data");
req.header("Transfer-Encoding", "chunked");

client << req;

// Write body - automatically chunked
client << data;
client.flush();  // Final chunk

HttpResponse res;
client >> res;
```

---

## Limitations

- Maximum chunk size when reading: 16 KB (default) or as configured
- Received chunks larger than the configured size are rejected (`Errc::MessageTooLong`)
- `flush()` always ends the chunked body
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
