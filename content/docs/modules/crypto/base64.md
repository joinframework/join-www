---

title: "Base64"
weight: 1
---

# Base64

Join provides **Base64 encoding and decoding** functionality using OpenSSL.
The Base64 class offers simple static methods for encoding binary data and decoding Base64 strings.

Base64 features:

* **simple API** — static encode/decode methods
* **stream‑based** — efficient for large data
* **OpenSSL‑backed** — reliable implementation
* **multiple input types** — strings, byte arrays, raw buffers

Use cases include:

* Encoding binary data for text protocols
* Email attachments (MIME)
* Data URLs
* Authentication tokens
* Configuration files

---

## Encoding

### Encoding strings

```cpp
#include <join/base64.hpp>

using join;

std::string data = "Hello, World!";
std::string encoded = Base64::encode(data);

std::cout << encoded << std::endl;  // SGVsbG8sIFdvcmxkIQ==
```

### Encoding byte arrays

```cpp
BytesArray data = {0x48, 0x65, 0x6C, 0x6C, 0x6F};
std::string encoded = Base64::encode(data);

std::cout << encoded << std::endl;  // SGVsbG8=
```

### Encoding raw buffers

```cpp
const char* data = "Binary data";
size_t length = 11;

std::string encoded = Base64::encode(data, length);
```

---

## Decoding

### Decoding to byte array

```cpp
std::string encoded = "SGVsbG8sIFdvcmxkIQ==";
BytesArray decoded = Base64::decode(encoded);

// Convert to string
std::string text(decoded.begin(), decoded.end());
std::cout << text << std::endl;  // Hello, World!
```

### Converting to hex

```cpp
std::string encoded = "AQIDBA==";
BytesArray decoded = Base64::decode(encoded);

// Display as hex
std::string hex = bin2hex(decoded);
std::cout << hex << std::endl;  // 01020304
```

---

## Stream‑based encoding

For large data or incremental encoding, use the `Encoder` stream.

### Encoding with streams

```cpp
Encoder encoder;

encoder << "First chunk";
encoder << "Second chunk";
encoder << "Third chunk";

std::string encoded = encoder.get();
```

### Stream state checking

```cpp
Encoder encoder;
encoder << data;

std::string encoded = encoder.get();

if (encoder.fail())
{
    std::cerr << "Encoding failed" << std::endl;
}
```

---

## Stream‑based decoding

For large data or incremental decoding, use the `Decoder` stream.

### Decoding with streams

```cpp
Decoder decoder;

decoder << "SGVsbG8s";
decoder << "IFdvcmxk";
decoder << "IQ==";

BytesArray decoded = decoder.get();
```

### Stream state checking

```cpp
Decoder decoder;
decoder << encodedData;

BytesArray decoded = decoder.get();

if (decoder.fail())
{
    std::cerr << "Decoding failed" << std::endl;
}
```

---

## Usage examples

### Encoding binary file

```cpp
#include <join/base64.hpp>
#include <fstream>
#include <iostream>

using join;

std::string encodeFile(const std::string& filename)
{
    std::ifstream file(filename, std::ios::binary);

    if (!file)
    {
        return "";
    }

    // Read entire file
    std::string content(
        (std::istreambuf_iterator<char>(file)),
        std::istreambuf_iterator<char>()
    );

    return Base64::encode(content);
}
```

### Decoding to file

```cpp
#include <join/base64.hpp>
#include <fstream>

using join;

bool decodeToFile(const std::string& encoded, const std::string& filename)
{
    BytesArray decoded = Base64::decode(encoded);

    if (decoded.empty())
    {
        return false;
    }

    std::ofstream file(filename, std::ios::binary);

    if (!file)
    {
        return false;
    }

    file.write(
        reinterpret_cast<const char*>(decoded.data()),
        decoded.size()
    );

    return true;
}
```

### Base64 data URL

```cpp
#include <join/base64.hpp>

using join;

std::string createDataUrl(const std::string& mimeType, const BytesArray& data)
{
    std::string encoded = Base64::encode(data);
    return "data:" + mimeType + ";base64," + encoded;
}

// Usage
BytesArray imageData = loadImage("icon.png");
std::string dataUrl = createDataUrl("image/png", imageData);

// Result: data:image/png;base64,iVBORw0KGgo...
```

### HTTP Basic Authentication

```cpp
#include <join/base64.hpp>

using join;

std::string createAuthHeader(const std::string& username, const std::string& password)
{
    std::string credentials = username + ":" + password;
    std::string encoded = Base64::encode(credentials);
    return "Authorization: Basic " + encoded;
}

// Usage
std::string header = createAuthHeader("user", "pass");
// Result: Authorization: Basic dXNlcjpwYXNz
```

### JSON Web Token (JWT) parsing

```cpp
#include <join/base64.hpp>
#include <sstream>

using join;

struct JWT
{
    std::string header;
    std::string payload;
    std::string signature;
};

JWT parseJWT(const std::string& token)
{
    JWT jwt;
    std::istringstream iss(token);

    std::getline(iss, jwt.header, '.');
    std::getline(iss, jwt.payload, '.');
    std::getline(iss, jwt.signature);

    return jwt;
}

std::string decodeJWTPayload(const std::string& token)
{
    JWT jwt = parseJWT(token);

    BytesArray decoded = Base64::decode(jwt.payload);

    return std::string(decoded.begin(), decoded.end());
}
```

### Email attachment encoding

```cpp
#include <join/base64.hpp>
#include <fstream>

using join;

std::string createMimeAttachment(const std::string& filename)
{
    std::ifstream file(filename, std::ios::binary);

    std::string content(
        (std::istreambuf_iterator<char>(file)),
        std::istreambuf_iterator<char>()
    );

    std::string encoded = Base64::encode(content);

    std::ostringstream mime;
    mime << "Content-Type: application/octet-stream\r\n";
    mime << "Content-Disposition: attachment; filename=\""
         << filename << "\"\r\n";
    mime << "Content-Transfer-Encoding: base64\r\n\r\n";
    mime << encoded << "\r\n";

    return mime.str();
}
```

### Configuration file with binary data

```cpp
#include <join/base64.hpp>
#include <fstream>
#include <sstream>

using join;

void saveConfig(const std::string& filename, const BytesArray& binaryData)
{
    std::string encoded = Base64::encode(binaryData);

    std::ofstream config(filename);
    config << "binary_data=" << encoded << "\n";
}

BytesArray loadConfig(const std::string& filename)
{
    std::ifstream config(filename);
    std::string line;

    while (std::getline(config, line))
    {
        if (line.find("binary_data=") == 0)
        {
            std::string encoded = line.substr(12);
            return Base64::decode(encoded);
        }
    }

    return {};
}
```

### Large file streaming

```cpp
#include <join/base64.hpp>
#include <fstream>

using join;

void encodeFileStreaming(const std::string& inputFile, const std::string& outputFile)
{
    std::ifstream in(inputFile, std::ios::binary);
    std::ofstream out(outputFile);

    Encoder encoder;
    char buffer[4096];

    while (in.read(buffer, sizeof(buffer)) || in.gcount() > 0)
    {
        encoder.write(buffer, in.gcount());
    }

    out << encoder.get();
}

void decodeFileStreaming(const std::string& inputFile, const std::string& outputFile)
{
    std::ifstream in(inputFile);
    std::ofstream out(outputFile, std::ios::binary);

    Decoder decoder;
    std::string line;

    while (std::getline(in, line))
    {
        decoder << line;
    }

    BytesArray decoded = decoder.get();
    out.write(
        reinterpret_cast<const char*>(decoded.data()),
        decoded.size()
    );
}
```

---

## Helper functions

### Binary to hex conversion

```cpp
BytesArray data = {0xDE, 0xAD, 0xBE, 0xEF};
std::string hex = bin2hex(data);

std::cout << hex << std::endl;  // deadbeef
```

The `bin2hex()` function converts byte arrays to hexadecimal strings.

---

## Error handling

### Encoding errors

Encoding generally does not fail unless memory allocation fails.

```cpp
std::string encoded = Base64::encode(data);

if (encoded.empty())
{
    std::cerr << "Encoding failed" << std::endl;
}
```

### Decoding errors

Decoding can fail if the input is not valid Base64.

```cpp
BytesArray decoded = Base64::decode(invalidBase64);

if (decoded.empty())
{
    if (lastError == Errc::InvalidParam)
    {
        std::cerr << "Invalid Base64 input" << std::endl;
    }
}
```

Invalid Base64 includes:
* Non‑Base64 characters
* Incorrect padding
* Truncated data

---

## Base64 format

### Character set

Base64 uses 64 characters:
* `A-Z` (values 0-25)
* `a-z` (values 26-51)
* `0-9` (values 52-61)
* `+` (value 62)
* `/` (value 63)
* `=` (padding)

### Encoding process

1. Split input into 3‑byte groups
2. Convert each group to 4 Base64 characters
3. Pad with `=` if needed

Example: `Man` → `TWFu`
```
M       a       n
01001101 01100001 01101110
010011 010110 000101 101110
T      W      F      u
```

### Padding

* No padding: 3n bytes → 4n characters
* 1 pad: 3n+2 bytes → 4n+3 characters + `=`
* 2 pads: 3n+1 bytes → 4n+2 characters + `==`

---

## Performance considerations

### Memory usage

* Encoded size: approximately **133%** of input
* Decoded size: approximately **75%** of input
* Internal buffering: **256 bytes** per stream

### Large data

For large data:
* Use stream‑based encoding/decoding
* Process in chunks to reduce memory usage
* Consider file‑backed streams

### Optimization

```cpp
// Efficient: single call
std::string encoded = Base64::encode(largeData);

// Less efficient: multiple concatenations
Encoder encoder;
for (const auto& chunk : chunks)
{
    encoder << chunk;
}
std::string encoded = encoder.get();
```

---

## Common patterns

### Encoding binary protocol messages

```cpp
struct Message
{
    uint32_t type;
    uint32_t length;
    uint8_t data[256];
};

std::string encodeMessage(const Message& msg)
{
    return Base64::encode(
        reinterpret_cast<const char*>(&msg),
        sizeof(Message)
    );
}
```

### Secure token generation

```cpp
#include <join/base64.hpp>
#include <join/utils.hpp>

std::string generateToken(size_t length = 32)
{
    BytesArray random(length);

    for (auto& byte : random)
    {
        byte = randomize<uint8_t>();
    }

    return Base64::encode(random);
}
```

### Safe filename encoding

```cpp
std::string encodeFilename(const std::string& filename)
{
    std::string encoded = Base64::encode(filename);

    // Replace URL-unsafe characters
    std::replace(encoded.begin(), encoded.end(), '+', '-');
    std::replace(encoded.begin(), encoded.end(), '/', '_');

    // Remove padding
    encoded.erase(
        std::find(encoded.begin(), encoded.end(), '='),
        encoded.end()
    );

    return encoded;
}
```

---

## Best practices

* Use **static methods** for simple encode/decode operations
* Use **stream objects** for large or incremental data
* Always check return values for empty results
* Handle `lastError` when decoding fails
* Consider URL‑safe Base64 variants for web use
* Remove newlines from encoded output if needed
* Validate Base64 input before decoding
* Use appropriate buffer sizes for streaming
* Avoid encoding sensitive data without encryption

---

## Comparison with alternatives

### vs Manual implementation

* ✅ OpenSSL‑backed reliability
* ✅ Optimized performance
* ✅ Standards‑compliant
* ✅ Well‑tested

### vs Other libraries

* ✅ Integrated with Join
* ✅ Consistent error handling
* ✅ Stream support
* ✅ No external dependencies beyond OpenSSL

---

## URL‑safe Base64

Standard Base64 uses `+` and `/`, which are not URL‑safe. For URLs:

```cpp
std::string urlSafeEncode(const std::string& data)
{
    std::string encoded = Base64::encode(data);

    // Replace characters
    std::replace(encoded.begin(), encoded.end(), '+', '-');
    std::replace(encoded.begin(), encoded.end(), '/', '_');

    // Optionally remove padding
    encoded.erase(
        std::find(encoded.begin(), encoded.end(), '='),
        encoded.end()
    );

    return encoded;
}

std::string urlSafeDecode(std::string data)
{
    // Restore characters
    std::replace(data.begin(), data.end(), '-', '+');
    std::replace(data.begin(), data.end(), '_', '/');

    // Add padding if needed
    while (data.length() % 4)
    {
        data += '=';
    }

    return Base64::decode(data);
}
```

---

## Summary

| Feature                | Supported |
| ---------------------- | --------- |
| String encoding        | ✅         |
| Byte array encoding    | ✅         |
| Raw buffer encoding    | ✅         |
| String decoding        | ✅         |
| Stream encoding        | ✅         |
| Stream decoding        | ✅         |
| Error detection        | ✅         |
| OpenSSL backend        | ✅         |
| URL‑safe variant       | ⚠️ manual  |

| Method                    | Input Type    | Output Type | Use Case              |
| ------------------------- | ------------- | ----------- | --------------------- |
| `Base64::encode(string)`  | String        | String      | Text encoding         |
| `Base64::encode(bytes)`   | BytesArray    | String      | Binary encoding       |
| `Base64::encode(ptr,len)` | Raw buffer    | String      | Buffer encoding       |
| `Base64::decode(string)`  | String        | BytesArray  | Base64 decoding       |
| `Encoder` stream          | Any data      | String      | Incremental encoding  |
| `Decoder` stream          | String chunks | BytesArray  | Incremental decoding  |
| `bin2hex(bytes)`          | BytesArray    | String      | Hex representation    |
