---
title: "HMAC"
weight: 3
---

# HMAC

Join provides **HMAC (Hash‑based Message Authentication Code)** support using OpenSSL.
The `Hmac` class allows computing **keyed message authentication codes** to ensure
both **data integrity** and **authenticity**.

Unlike plain digests, HMAC uses a **secret key** and is **not vulnerable to
length‑extension attacks**, making it suitable for authentication and message
verification.

HMAC features:

* **Multiple algorithms** — MD5, SHA‑1, SHA‑2 family, SM3
* **Keyed security** — protects against forgery
* **Simple API** — static one‑shot helpers
* **Stream support** — incremental / large data processing
* **Binary or hex output**
* **OpenSSL‑backed** implementation

Typical use cases:

* API request signing
* Message authentication
* Token generation
* Secure cookies
* Webhooks verification

---

## Supported algorithms

| Algorithm        | Output Size | Security Status       |
| ---------------- | ----------- | --------------------- |
| HMAC‑MD5         | 128 bits    | ⚠️ Legacy only        |
| HMAC‑SHA‑1       | 160 bits    | ⚠️ Deprecated         |
| HMAC‑SHA‑224     | 224 bits    | ✅ Secure              |
| HMAC‑SHA‑256     | 256 bits    | ✅ Secure              |
| HMAC‑SHA‑384     | 384 bits    | ✅ Secure              |
| HMAC‑SHA‑512     | 512 bits    | ✅ Secure              |
| HMAC‑SM3         | 256 bits    | ✅ Secure (Chinese)    |

⚠️ **Do not use HMAC‑MD5 or HMAC‑SHA‑1 for new designs.**

---

## Quick start

### HMAC‑SHA‑256 (hex)

```cpp
// libjoin.
#include <join/hmac.hpp>

// C++.
#include <iostream>

using namespace join;

std::string data = "Hello, World!";
std::string key  = "secret-key";

std::string mac = Hmac::sha256hex(data, key);

std::cout << mac << std::endl;
```

### HMAC‑SHA‑256 (binary)

```cpp
BytesArray mac = Hmac::sha256bin(data, key);
```

---

## Static methods

Each algorithm provides binary and hexadecimal helpers, taking the **message first** and the **key second**.

### HMAC‑MD5

```cpp
BytesArray  bin = Hmac::md5bin(data, key);
std::string hex = Hmac::md5hex(data, key);
```

### HMAC‑SHA‑1

```cpp
BytesArray  bin = Hmac::sha1bin(data, key);
std::string hex = Hmac::sha1hex(data, key);
```

### HMAC‑SHA‑224

```cpp
BytesArray  bin = Hmac::sha224bin(data, key);
std::string hex = Hmac::sha224hex(data, key);
```

### HMAC‑SHA‑256

```cpp
BytesArray  bin = Hmac::sha256bin(data, key);
std::string hex = Hmac::sha256hex(data, key);
```

### HMAC‑SHA‑384

```cpp
BytesArray  bin = Hmac::sha384bin(data, key);
std::string hex = Hmac::sha384hex(data, key);
```

### HMAC‑SHA‑512

```cpp
BytesArray  bin = Hmac::sha512bin(data, key);
std::string hex = Hmac::sha512hex(data, key);
```

### HMAC‑SM3

```cpp
BytesArray  bin = Hmac::sm3bin(data, key);
std::string hex = Hmac::sm3hex(data, key);
```

---

## Input types

The message can be a `std::string`, a `BytesArray` or a raw buffer. The key is always a `std::string`.

### String input

```cpp
std::string mac = Hmac::sha256hex("message", "key");
```

### Byte array input

```cpp
BytesArray data = {0x01, 0x02, 0x03};
std::string key = "secret-key";

BytesArray mac = Hmac::sha256bin(data, key);
```

### Raw buffer input

```cpp
const char* data = "Hello, World!";
std::string key  = "secret-key";

BytesArray mac = Hmac::sha256bin(data, strlen(data), key);
```

---

## Stream‑based HMAC

Use the `Hmac` stream for incremental processing.

```cpp
Hmac hmac(Digest::SHA256, key);

hmac << "chunk1";
hmac << "chunk2";
hmac << "chunk3";

BytesArray mac = hmac.finalize();
std::string hex = bin2hex(mac);
```

### Error checking

```cpp
Hmac hmac(Digest::SHA256, key);
hmac << data;

BytesArray mac = hmac.finalize();

if (hmac.fail())
{
    std::cerr << "HMAC computation failed" << std::endl;
}
```

---

## Verification

### Constant‑time comparison

```cpp
bool verify(const BytesArray& a, const BytesArray& b)
{
    if (a.size() != b.size()) return false;

    uint8_t diff = 0;
    for (size_t i = 0; i < a.size(); ++i)
    {
        diff |= a[i] ^ b[i];
    }
    return diff == 0;
}
```

### Verifying a message

```cpp
BytesArray expected = Hmac::sha256bin(data, key);
BytesArray received = ...;

if (verify(expected, received))
{
    // valid
}
```

---

## Usage examples

### API request signing

```cpp
std::string signRequest(const std::string& key, const std::string& payload)
{
    return Hmac::sha256hex(payload, key);
}
```

### Webhook verification

```cpp
bool verifyWebhook(const std::string& key,
                   const std::string& payload,
                   const std::string& signature)
{
    std::string computed = Hmac::sha256hex(payload, key);

    // constant-time comparison (see verify() above), never use ==
    return verify(BytesArray(computed.begin(), computed.end()),
                  BytesArray(signature.begin(), signature.end()));
}
```

### Secure cookies

```cpp
std::string makeCookie(const std::string& key,
                       const std::string& data)
{
    std::string mac = Hmac::sha256hex(data, key);
    return data + "." + mac;
}
```

---

## Error handling

### Invalid algorithm

With OpenSSL 3.0 or later, an unsupported algorithm is reported by the stream state:
`finalize()` returns an empty result and `fail()` is set.
With older OpenSSL versions, the constructor throws `std::system_error` (`DigestErrc::InvalidAlgorithm`).

```cpp
try
{
    Hmac hmac(static_cast<Digest::Algorithm>(999), key);  // throws with OpenSSL < 3.0
    hmac << data;

    BytesArray mac = hmac.finalize();
    if (hmac.fail())                                       // OpenSSL >= 3.0
    {
        std::cerr << "HMAC computation failed" << std::endl;
    }
}
catch (const std::system_error& e)
{
    if (e.code() == DigestErrc::InvalidAlgorithm)
    {
        std::cerr << "Unsupported HMAC algorithm" << std::endl;
    }
}
```

---

## Security notes

* HMAC prevents **length‑extension attacks**
* Security relies on **key secrecy**
* Use **random keys** (≥ 256 bits recommended)
* Always use **constant‑time comparison**
* Prefer **SHA‑256 or stronger**
* Do not reuse HMAC keys for encryption

---

## Summary

| Feature                  | Supported |
| ------------------------ | --------- |
| HMAC‑MD5                 | ✅         |
| HMAC‑SHA‑1               | ✅         |
| HMAC‑SHA‑224             | ✅         |
| HMAC‑SHA‑256             | ✅         |
| HMAC‑SHA‑384             | ✅         |
| HMAC‑SHA‑512             | ✅         |
| HMAC‑SM3                 | ✅         |
| Binary output            | ✅         |
| Hex output               | ✅         |
| Stream processing        | ✅         |
| Keyed authentication     | ✅         |
| OpenSSL backend          | ✅         |
