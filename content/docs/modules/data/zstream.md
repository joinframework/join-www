---
title: "Zstream"
weight: 60
---

# Zstream

`Zstream` provides **transparent compression and decompression** for C++ streams using zlib.
It wraps any `std::iostream` to automatically compress writes and decompress reads, supporting
multiple compression formats with a standard stream interface.

`Zstream` is designed to be:

* **transparent** — works like any standard stream
* **format-flexible** — supports Deflate, Zlib, and Gzip
* **efficient** — buffered compression with configurable sizes
* **composable** — decorator pattern over existing streams

---

## Supported formats

`Zstream` supports three compression formats:

| Format   | Description                        | Use case                  |
|----------|------------------------------------|---------------------------|
| Deflate  | Raw deflate compression            | Custom protocols          |
| Zlib     | Deflate with zlib header/checksum  | General purpose (default) |
| Gzip     | Gzip-compatible format             | File compression, HTTP    |

---

## Construction

### Basic usage

```cpp
#include <join/zstream.hpp>

std::stringstream data;
Zstream zs(data, Zstream::Gzip);

// Write compressed data
zs << "Hello, World!";
zs.flush();

// Read decompressed data
std::string result;
zs >> result;
```

### Format selection

```cpp
// Deflate format (raw)
Zstream deflate(stream, Zstream::Deflate);

// Zlib format (default)
Zstream zlib(stream, Zstream::Zlib);
Zstream zlib_default(stream);  // Same as above

// Gzip format
Zstream gzip(stream, Zstream::Gzip);
```

---

## Writing compressed data

### Basic writing

```cpp
std::stringstream storage;
Zstream zs(storage, Zstream::Gzip);

// Write data - automatically compressed
zs << "Line 1\n";
zs << "Line 2\n";
zs << "Line 3\n";

// Flush to ensure all data is compressed
zs.flush();
```

### Binary data

```cpp
std::fstream file("data.gz", std::ios::binary | std::ios::in | std::ios::out);
Zstream zs(file, Zstream::Gzip);

// Write binary data
char buffer[1024] = {/* ... */};
zs.write(buffer, sizeof(buffer));
zs.flush();
```

### Stream operators

```cpp
Zstream zs(storage, Zstream::Zlib);

// Text formatting
zs << "Count: " << 42 << "\n";
zs << std::fixed << std::setprecision(2) << 3.14159 << "\n";

// Custom types
MyObject obj;
zs << obj;  // Requires operator<< overload

zs.flush();
```

---

## Reading compressed data

### Basic reading

```cpp
std::stringstream storage;
// ... (storage contains compressed data)

Zstream zs(storage, Zstream::Gzip);

// Read decompressed data
std::string line;
while (std::getline(zs, line))
{
    std::cout << line << "\n";
}
```

### Binary reading

```cpp
std::fstream file("data.gz", std::ios::binary | std::ios::in | std::ios::out);
Zstream zs(file, Zstream::Gzip);

// Read binary data
char buffer[1024];
zs.read(buffer, sizeof(buffer));
std::streamsize bytesRead = zs.gcount();
```

### Stream extraction

```cpp
Zstream zs(storage, Zstream::Zlib);

int value;
double decimal;
std::string text;

zs >> value >> decimal >> text;
```

---

## Bidirectional usage

`Zstream` supports both reading and writing on the same stream.

### Round-trip compression

```cpp
std::stringstream storage;
Zstream zs(storage, Zstream::Gzip);

// Write compressed data
zs << "Original data";
zs.flush();

// Rewind the underlying stream
storage.seekg(0);

// Read back decompressed data
std::string result;
zs >> result;
// result == "Original data"
```

### Sequential operations

```cpp
std::fstream file("data.gz", std::ios::binary | std::ios::in | std::ios::out);
Zstream zs(file, Zstream::Gzip);

// Append compressed data
file.seekp(0, std::ios::end);
zs << "New data\n";
zs.flush();

// Read from beginning
file.seekg(0, std::ios::beg);
std::string line;
while (std::getline(zs, line))
{
    process(line);
}
```

---

## Format compatibility

### Gzip files

```cpp
// Write gzip-compatible file
std::ofstream out("file.gz", std::ios::binary);
std::iostream outstream(out.rdbuf());
Zstream zs(outstream, Zstream::Gzip);

zs << "Compressed content\n";
zs.flush();
// Can be read by gzip, gunzip, etc.
```

### HTTP compression

```cpp
// Decompress HTTP response with gzip encoding
std::stringstream response;
// ... (response contains gzip-compressed body)

Zstream zs(response, Zstream::Gzip);

std::string body;
std::getline(zs, body, '\0');  // Read all
```

### Zlib data format

```cpp
// Standard zlib format with header and checksum
std::stringstream storage;
Zstream zs(storage, Zstream::Zlib);

// Compatible with zlib inflate/deflate
zs.write(data, length);
zs.flush();
```

---

## Error handling

### Stream state

```cpp
Zstream zs(storage, Zstream::Gzip);

zs << data;
if (!zs)
{
    // Compression failed
    if (zs.bad())
    {
        std::cerr << "Fatal stream error\n";
    }
    else if (zs.fail())
    {
        std::cerr << "Operation failed\n";
    }
}
```

### Checking operations

```cpp
Zstream zs(storage, Zstream::Gzip);

zs.write(buffer, size);
if (zs.fail())
{
    // Write failed
    return -1;
}

zs.flush();
if (zs.fail())
{
    // Flush failed
    return -1;
}
```

### Recovery

```cpp
Zstream zs(storage, Zstream::Gzip);

if (!zs.good())
{
    // Clear error state
    zs.clear();

    // Attempt to continue
    zs.seekg(0);
}
```

---

## Performance characteristics

### Buffering

- Internal buffer size: **16 KB** (configurable via `_bufsize`)
- Four internal buffers:
  - Input buffer for reading compressed data
  - Output buffer for writing compressed data
  - Decompression working buffer
  - Compression working buffer

### Compression ratio

Typical compression ratios (depends on data):

| Data type        | Compression ratio |
|------------------|-------------------|
| Text (English)   | 2.5:1 to 4:1     |
| JSON/XML         | 3:1 to 6:1       |
| Binary (random)  | ~1:1 (no gain)   |
| Binary (struct)  | 1.5:1 to 3:1     |

### Overhead

```cpp
// Minimal overhead per operation
zs.put(c);        // ~50-100ns (buffered)
zs.write(buf, n); // ~100ns + compression time

// Compression/decompression
// Typically 50-200 MB/s depending on:
// - Compression level (default: Z_DEFAULT_COMPRESSION)
// - Data compressibility
// - CPU speed
```

---

## Best practices

### Always flush writes

```cpp
// Good: Ensures data is compressed and written
Zstream zs(storage, Zstream::Gzip);
zs << data;
zs.flush();

// Bad: May lose data if stream is destroyed
Zstream zs(storage, Zstream::Gzip);
zs << data;
// Missing flush!
```

### Use appropriate format

```cpp
// For files: Use Gzip (standard format)
std::fstream file("data.gz", std::ios::binary | ...);
Zstream zs(file, Zstream::Gzip);

// For network protocols: Use Deflate or Zlib
Zstream zs(socket_stream, Zstream::Deflate);

// For custom protocols: Use Zlib (includes checksum)
Zstream zs(custom_stream, Zstream::Zlib);
```

### Buffer writes

```cpp
// Good: Batch writes for better compression
Zstream zs(storage, Zstream::Gzip);
for (const auto& item : items)
{
    zs << item << "\n";
}
zs.flush();  // Single flush at end

// Less efficient: Frequent flushes
for (const auto& item : items)
{
    zs << item << "\n";
    zs.flush();  // Don't do this!
}
```

### Binary mode for files

```cpp
// Good: Binary mode for compressed files
std::fstream file("data.gz",
    std::ios::binary | std::ios::in | std::ios::out);
Zstream zs(file, Zstream::Gzip);

// Bad: Text mode corrupts compressed data
std::fstream file("data.gz", std::ios::in | std::ios::out);
```

### Reuse streams

```cpp
// Good: Reuse stream for multiple operations
Zstream zs(storage, Zstream::Gzip);

zs << "First batch";
zs.flush();

zs << "Second batch";
zs.flush();

// Stream automatically resets compression state
```

---

## Implementation details

### Decorator pattern

`Zstream` uses the decorator pattern:

```cpp
class Zstream : public std::iostream
{
protected:
    Zstreambuf _zbuf;  // Wraps underlying streambuf
};
```

### Lazy initialization

Buffers are allocated on first use:

```cpp
// Get area allocated on first read
virtual int_type underflow() override;

// Put area allocated on first write
virtual int_type overflow(int_type c) override;
```

### Stream state management

```cpp
// Compression stream automatically resets on sync
virtual int_type sync() override
{
    overflow();           // Flush compressed data
    deflateReset(...);    // Reset compressor state
    return innerbuf->pubsync();
}
```

---

## Common patterns

### Compress file

```cpp
void compressFile(const std::string& input, const std::string& output)
{
    std::ifstream in(input, std::ios::binary);
    std::ofstream out(output, std::ios::binary);
    std::iostream outstream(out.rdbuf());

    Zstream zs(outstream, Zstream::Gzip);
    zs << in.rdbuf();
    zs.flush();
}
```

### Decompress file

```cpp
std::string decompressFile(const std::string& filename)
{
    std::ifstream in(filename, std::ios::binary);
    std::iostream instream(in.rdbuf());

    Zstream zs(instream, Zstream::Gzip);
    std::stringstream result;
    result << zs.rdbuf();

    return result.str();
}
```

### Compress string

```cpp
std::string compress(const std::string& data)
{
    std::stringstream storage;
    Zstream zs(storage, Zstream::Zlib);

    zs << data;
    zs.flush();

    return storage.str();
}
```

### Decompress string

```cpp
std::string decompress(const std::string& compressed)
{
    std::stringstream storage(compressed);
    Zstream zs(storage, Zstream::Zlib);

    std::string result;
    std::getline(zs, result, '\0');

    return result;
}
```

---

## Summary

| Feature                    | Supported |
|----------------------------|-----------|
| Deflate compression        | ✅        |
| Zlib format                | ✅        |
| Gzip format                | ✅        |
| Bidirectional streams      | ✅        |
| Standard iostream API      | ✅        |
| Automatic buffering        | ✅        |
| Binary and text data       | ✅        |
| Stream composition         | ✅        |
| Error handling             | ✅        |
| Format compatibility       | ✅        |
