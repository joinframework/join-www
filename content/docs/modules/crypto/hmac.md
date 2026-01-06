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
#include <join/hmac.hpp>

using join;

std::string key  = "secret-key";
std::string data = "Hello, World!";

std::string mac = Hmac::sha256hex(key, data);

std::cout << mac << std::endl;
```

### HMAC‑SHA‑256 (binary)

```cpp
BytesArray mac = Hmac::sha256bin(key, data);
```

---

## Static methods

Each algorithm provides binary and hexadecimal helpers.

### HMAC‑MD5

```cpp
BytesArray mac = Hmac::md5bin(key, data);
std::string mac = Hmac::md5hex(key, data);
```

### HMAC‑SHA‑1

```cpp
BytesArray mac = Hmac::sha1bin(key, data);
std::string mac = Hmac::sha1hex(key, data);
```

### HMAC‑SHA‑224

```cpp
BytesArray mac = Hmac::sha224bin(key, data);
std::string mac = Hmac::sha224hex(key, data);
```

### HMAC‑SHA‑256

```cpp
BytesArray mac = Hmac::sha256bin(key, data);
std::string mac = Hmac::sha256hex(key, data);
```

### HMAC‑SHA‑384

```cpp
BytesArray mac = Hmac::sha384bin(key, data);
std::string mac = Hmac::sha384hex(key, data);
```

### HMAC‑SHA‑512

```cpp
BytesArray mac = Hmac::sha512bin(key, data);
std::string mac = Hmac::sha512hex(key, data);
```

### HMAC‑SM3

```cpp
BytesArray mac = Hmac::sm3bin(key, data);
std::string mac = Hmac::sm3hex(key, data);
```

---

## Input types

All static methods accept the same input variants.

### String input

```cpp
std::string mac = Hmac::sha256hex("key", "message");
```

### Byte array input

```cpp
BytesArray key  = {...};
BytesArray data = {...};

BytesArray mac = Hmac::sha256bin(key, data);
```

### Raw buffer input

```cpp
const char* key  = "...";
const char* data = "...";
size_t keyLen  = ...;
size_t dataLen = ...;

BytesArray mac = Hmac::sha256bin(key, keyLen, data, dataLen);
```

---

## Stream‑based HMAC

Use the `Hmac` stream for incremental processing.

```cpp
Hmac hmac(Hmac::SHA256, key);

hmac << "chunk1";
hmac << "chunk2";
hmac << "chunk3";

BytesArray mac = hmac.finalize();
std::string hex = bin2hex(mac);
```

### Error checking

```cpp
Hmac hmac(Hmac::SHA256, key);
hmac << data;

BytesArray mac = hmac.finalize();

if (hmac.fail()) {
    std::cerr << "HMAC computation failed" << std::endl;
}
```

---

## Verification

### Constant‑time comparison

```cpp
bool verify(const BytesArray& a, const BytesArray& b) {
    if (a.size() != b.size()) return false;

    uint8_t diff = 0;
    for (size_t i = 0; i < a.size(); ++i) {
        diff |= a[i] ^ b[i];
    }
    return diff == 0;
}
```

### Verifying a message

```cpp
BytesArray expected = Hmac::sha256bin(key, data);
BytesArray received = ...;

if (verify(expected, received)) {
    // valid
}
```

---

## Usage examples

### API request signing

```cpp
std::string signRequest(const std::string& key,
                        const std::string& payload) {
    return Hmac::sha256hex(key, payload);
}
```

### Webhook verification

```cpp
bool verifyWebhook(const std::string& key,
                   const std::string& payload,
                   const std::string& signature) {
    std::string computed = Hmac::sha256hex(key, payload);
    return computed == signature;
}
```

### Secure cookies

```cpp
std::string makeCookie(const std::string& key,
                       const std::string& data) {
    std::string mac = Hmac::sha256hex(key, data);
    return data + "." + mac;
}
```

---

## Error handling

### Invalid algorithm

```cpp
try {
    Hmac hmac(static_cast<Hmac::Algorithm>(999), key);
} catch (const std::system_error& e) {
    if (e.code() == DigestErrc::InvalidAlgorithm) {
        std::cerr << "Unsupported HMAC algorithm" << std::endl;
    }
}
```

### Invalid key

```cpp
try {
    Hmac hmac(Hmac::SHA256, "");
} catch (const std::system_error& e) {
    if (e.code() == DigestErrc::InvalidKey) {
        std::cerr << "Invalid HMAC key" << std::endl;
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
