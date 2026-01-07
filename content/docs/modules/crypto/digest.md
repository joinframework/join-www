---

title: "Digest"
weight: 2
---

# Digest

Join provides **cryptographic hash functions** (message digests) using OpenSSL.
The Digest class offers both simple static methods and stream‑based hashing for various algorithms.

Digest features:

* **multiple algorithms** — MD5, SHA‑1, SHA‑2 family, SM3
* **simple API** — static methods for one‑shot hashing
* **stream support** — efficient for large or incremental data
* **dual output** — binary (BytesArray) or hex (string)
* **OpenSSL‑backed** — industry‑standard implementation

Use cases include:

* Data integrity verification
* Password hashing
* File checksums
* Digital signatures
* Content addressing

---

## Supported algorithms

| Algorithm | Output Size | Security Status       |
| --------- | ----------- | --------------------- |
| MD5       | 128 bits    | ⚠️ Broken (collisions) |
| SHA‑1     | 160 bits    | ⚠️ Deprecated          |
| SHA‑224   | 224 bits    | ✅ Secure              |
| SHA‑256   | 256 bits    | ✅ Secure              |
| SHA‑384   | 384 bits    | ✅ Secure              |
| SHA‑512   | 512 bits    | ✅ Secure              |
| SM3       | 256 bits    | ✅ Secure (Chinese)    |

⚠️ **Do not use MD5 or SHA‑1 for security‑sensitive applications.** Use SHA‑256 or stronger.

---

## Quick start

### SHA‑256 hash (hex)

```cpp
#include <join/digest.hpp>

using join;

std::string data = "Hello, World!";
std::string hash = Digest::sha256hex(data);

std::cout << hash << std::endl;
// dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f
```

### SHA‑256 hash (binary)

```cpp
BytesArray hash = Digest::sha256bin(data);

// Convert to hex if needed
std::string hexHash = bin2hex(hash);
```

---

## Static methods

Each algorithm provides both binary and hex output methods.

### MD5

```cpp
// Binary output
BytesArray hash = Digest::md5bin("data");

// Hex output
std::string hash = Digest::md5hex("data");
```

### SHA‑1

```cpp
BytesArray hash = Digest::sha1bin("data");
std::string hash = Digest::sha1hex("data");
```

### SHA‑224

```cpp
BytesArray hash = Digest::sha224bin("data");
std::string hash = Digest::sha224hex("data");
```

### SHA‑256

```cpp
BytesArray hash = Digest::sha256bin("data");
std::string hash = Digest::sha256hex("data");
```

### SHA‑384

```cpp
BytesArray hash = Digest::sha384bin("data");
std::string hash = Digest::sha384hex("data");
```

### SHA‑512

```cpp
BytesArray hash = Digest::sha512bin("data");
std::string hash = Digest::sha512hex("data");
```

### SM3

```cpp
BytesArray hash = Digest::sm3bin("data");
std::string hash = Digest::sm3hex("data");
```

---

## Input types

All static methods support multiple input types.

### String input

```cpp
std::string data = "Hello";
std::string hash = Digest::sha256hex(data);
```

### Byte array input

```cpp
BytesArray data = {0x48, 0x65, 0x6C, 0x6C, 0x6F};
std::string hash = Digest::sha256hex(data);
```

### Raw buffer input

```cpp
const char* data = "Hello";
size_t length = 5;
std::string hash = Digest::sha256hex(data, length);
```

---

## Stream‑based hashing

For large data or incremental hashing, use the `Digest` stream.

### Hashing with streams

```cpp
Digest digest(Digest::SHA256);

digest << "First chunk";
digest << "Second chunk";
digest << "Third chunk";

BytesArray hash = digest.finalize();
std::string hexHash = bin2hex(hash);
```

### Stream state checking

```cpp
Digest digest(Digest::SHA256);
digest << data;

BytesArray hash = digest.finalize();

if (digest.fail())
{
    std::cerr << "Hashing failed" << std::endl;
}
```

---

## Usage examples

### File checksum

```cpp
#include <join/digest.hpp>
#include <fstream>
#include <iostream>

using join;

std::string sha256File(const std::string& filename)
{
    std::ifstream file(filename, std::ios::binary);

    if (!file)
    {
        return "";
    }

    Digest digest(Digest::SHA256);
    char buffer[4096];

    while (file.read(buffer, sizeof(buffer)) || file.gcount() > 0)
    {
        digest.write(buffer, file.gcount());
    }

    return bin2hex(digest.finalize());
}

int main()
{
    std::string checksum = sha256File("document.pdf");
    std::cout << "SHA-256: " << checksum << std::endl;
}
```

### Password hashing

```cpp
#include <join/digest.hpp>
#include <join/utils.hpp>

using join;

struct HashedPassword
{
    BytesArray salt;
    BytesArray hash;
};

HashedPassword hashPassword(const std::string& password)
{
    HashedPassword result;

    // Generate random salt
    result.salt.resize(32);
    for (auto& byte : result.salt)
    {
        byte = randomize<uint8_t>();
    }

    // Hash password with salt
    Digest digest(Digest::SHA256);
    digest.write(
        reinterpret_cast<const char*>(result.salt.data()),
        result.salt.size()
    );
    digest.write(password.c_str(), password.size());

    result.hash = digest.finalize();

    return result;
}

bool verifyPassword(const std::string& password, const HashedPassword& stored)
{
    Digest digest(Digest::SHA256);
    digest.write(
        reinterpret_cast<const char*>(stored.salt.data()),
        stored.salt.size()
    );
    digest.write(password.c_str(), password.size());

    BytesArray computed = digest.finalize();

    return computed == stored.hash;
}
```

⚠️ For production password hashing, use **dedicated algorithms** like Argon2, bcrypt, or scrypt with key stretching.

### Content‑addressable storage

```cpp
#include <join/digest.hpp>

using join;

class ContentStore
{
public:
    std::string store(const std::string& content)
    {
        // Generate content hash
        std::string hash = Digest::sha256hex(content);

        // Store content by hash
        storage[hash] = content;

        return hash;
    }

    std::string retrieve(const std::string& hash)
    {
        auto it = storage.find(hash);
        return it != storage.end() ? it->second : "";
    }

private:
    std::map<std::string, std::string> storage;
};
```

### Data integrity verification

```cpp
#include <join/digest.hpp>

using join;

struct DataPacket
{
    std::string data;
    std::string checksum;
};

DataPacket createPacket(const std::string& data)
{
    DataPacket packet;
    packet.data = data;
    packet.checksum = Digest::sha256hex(data);
    return packet;
}

bool verifyPacket(const DataPacket& packet)
{
    std::string computed = Digest::sha256hex(packet.data);
    return computed == packet.checksum;
}
```

### Merkle tree node

```cpp
#include <join/digest.hpp>

using join;

class MerkleNode
{
public:
    std::string hash() const
    {
        if (isLeaf)
        {
            return Digest::sha256hex(data);
        }

        // Hash of concatenated child hashes
        std::string combined = leftHash + rightHash;
        return Digest::sha256hex(combined);
    }

private:
    bool isLeaf;
    std::string data;
    std::string leftHash;
    std::string rightHash;
};
```

### Git‑style object hashing

```cpp
#include <join/digest.hpp>
#include <sstream>

using join;

std::string hashGitObject(const std::string& type, const std::string& content)
{
    // Git format: "type size\0content"
    std::ostringstream oss;
    oss << type << " " << content.size() << '\0' << content;

    return Digest::sha1hex(oss.str());
}

// Usage
std::string blobHash = hashGitObject("blob", fileContent);
std::string commitHash = hashGitObject("commit", commitData);
```

### Deduplication

```cpp
#include <join/digest.hpp>
#include <set>

using join;

class Deduplicator
{
public:
    bool isDuplicate(const std::string& data)
    {
        std::string hash = Digest::sha256hex(data);

        if (seen.count(hash))
        {
            return true;
        }

        seen.insert(hash);
        return false;
    }

private:
    std::set<std::string> seen;
};
```

### ETag generation

```cpp
#include <join/digest.hpp>

using join;

std::string generateETag(const std::string& content)
{
    // Weak ETag
    std::string hash = Digest::md5hex(content);
    return "W/\"" + hash + "\"";
}

std::string generateStrongETag(const std::string& content)
{
    // Strong ETag
    std::string hash = Digest::sha256hex(content);
    return "\"" + hash + "\"";
}
```

---

## Algorithm selection

### Security level

For cryptographic security:
* ✅ **SHA‑256** — widely supported, secure
* ✅ **SHA‑384** — higher security margin
* ✅ **SHA‑512** — maximum security
* ✅ **SM3** — Chinese standard

For checksums only (not security):
* ⚠️ **MD5** — fast but insecure
* ⚠️ **SHA‑1** — deprecated

### Performance

Relative performance (fastest to slowest):
1. MD5
2. SHA‑1
3. SHA‑256
4. SHA‑224
5. SM3
6. SHA‑512
7. SHA‑384

### Compatibility

Most compatible:
* **SHA‑256** — universal support
* **MD5** — legacy systems only

Specialized:
* **SM3** — Chinese cryptography requirements

---

## Error handling

### Invalid algorithm

```cpp
try
{
    Digest digest(static_cast<Digest::Algorithm>(999));
}
catch (const std::system_error& e)
{
    if (e.code() == DigestErrc::InvalidAlgorithm)
    {
        std::cerr << "Unsupported algorithm" << std::endl;
    }
}
```

### Finalize errors

```cpp
Digest digest(Digest::SHA256);
digest << data;

BytesArray hash = digest.finalize();

if (hash.empty())
{
    std::cerr << "Hashing failed: "
              << lastError.message() << std::endl;
}
```

---

## Performance considerations

### Memory usage

* Stream buffer: **256 bytes**
* Output size: depends on algorithm (16‑64 bytes)

### Large files

For large files, use streaming:

```cpp
// Efficient: streaming
Digest digest(Digest::SHA256);
char buffer[8192];
while (file.read(buffer, sizeof(buffer)) || file.gcount() > 0)
{
    digest.write(buffer, file.gcount());
}

// Inefficient: load entire file
std::string content = readEntireFile();
BytesArray hash = Digest::sha256bin(content);
```

### Multiple hashes

When computing multiple hashes:

```cpp
// Efficient: single pass
Digest sha256(Digest::SHA256);
Digest sha512(Digest::SHA512);

char buffer[4096];
while (file.read(buffer, sizeof(buffer)) || file.gcount() > 0)
{
    sha256.write(buffer, file.gcount());
    sha512.write(buffer, file.gcount());
}

// Inefficient: multiple passes
BytesArray hash256 = Digest::sha256bin(data);
BytesArray hash512 = Digest::sha512bin(data);
```

---

## Common patterns

### Hex digest comparison

```cpp
bool verifyChecksum(const std::string& data, const std::string& expectedHash)
{
    std::string computed = Digest::sha256hex(data);
    return computed == expectedHash;
}
```

### Binary digest comparison

```cpp
bool verifyBinary(const BytesArray& data, const BytesArray& expectedHash)
{
    BytesArray computed = Digest::sha256bin(data);
    return computed == expectedHash;
}
```

### Hash chain

```cpp
std::string hashChain(const std::string& data, int iterations)
{
    std::string hash = data;

    for (int i = 0; i < iterations; ++i)
    {
        hash = Digest::sha256hex(hash);
    }

    return hash;
}
```

---

## Best practices

* Use **SHA‑256 or stronger** for security applications
* Use **static methods** for simple one‑shot hashing
* Use **stream objects** for large files or incremental data
* Never use **MD5 or SHA‑1** for security (collisions exist)
* Store hashes in **binary format** to save space
* Use **hex format** for human‑readable display
* Add **salt** when hashing passwords
* Use **dedicated password hashing** (Argon2, bcrypt) not raw SHA
* Verify **empty hash results** indicate errors
* Consider **performance vs security** tradeoffs

---

## Comparison with alternatives

### vs Raw OpenSSL

* ✅ Simpler API
* ✅ RAII memory management
* ✅ Stream integration
* ✅ Consistent error handling

### vs Other libraries

* ✅ Integrated with Join
* ✅ Multiple algorithms
* ✅ Both binary and hex output
* ✅ No external dependencies beyond OpenSSL

---

## Security notes

### Hash collisions

* **MD5**: Practical collisions exist — do not use for security
* **SHA‑1**: Collisions demonstrated — deprecated
* **SHA‑2 family**: No known practical collisions
* **SM3**: No known collisions

### Length extension attacks

SHA‑256, SHA‑512, and SM3 are vulnerable to length extension attacks. For MACs, use **HMAC** instead of raw hashing.

### Rainbow tables

To prevent rainbow table attacks on password hashes:
* Use **unique salts** per password
* Use **slow hashing** (key stretching)
* Consider **Argon2, bcrypt, or scrypt**

---

## Summary

| Feature                  | Supported |
| ------------------------ | --------- |
| MD5                      | ✅         |
| SHA‑1                    | ✅         |
| SHA‑224                  | ✅         |
| SHA‑256                  | ✅         |
| SHA‑384                  | ✅         |
| SHA‑512                  | ✅         |
| SM3                      | ✅         |
| Binary output            | ✅         |
| Hex output               | ✅         |
| Stream hashing           | ✅         |
| Multiple input types     | ✅         |
| OpenSSL backend          | ✅         |

| Algorithm | Secure? | Speed  | Output Size | Use Case                |
| --------- | ------- | ------ | ----------- | ----------------------- |
| MD5       | ❌       | Fast   | 128 bits    | Checksums only          |
| SHA‑1     | ❌       | Fast   | 160 bits    | Legacy compatibility    |
| SHA‑224   | ✅       | Medium | 224 bits    | Truncated SHA‑256       |
| SHA‑256   | ✅       | Medium | 256 bits    | General purpose         |
| SHA‑384   | ✅       | Slow   | 384 bits    | High security           |
| SHA‑512   | ✅       | Slow   | 512 bits    | Maximum security        |
| SM3       | ✅       | Medium | 256 bits    | Chinese cryptography    |
