---
title: "Signature"
weight: 4
---

# Signature

Join provides **digital signature generation and verification** using public-key cryptography.
It wraps OpenSSL's signature functions with a stream-based interface, supporting multiple digest
algorithms for signing and verifying data integrity and authenticity.

`Signature` is designed to be:

* **secure** — uses OpenSSL for cryptographic operations
* **flexible** — supports multiple digest algorithms (SHA-256, SHA-512, etc.)
* **stream-based** — integrates with C++ iostream for incremental signing
* **convenient** — static methods for one-shot operations

---

## Key concepts

| Concept            | Description                                      |
|--------------------|--------------------------------------------------|
| Digital signature  | Cryptographic proof of data authenticity         |
| Private key        | Used to sign data (must be kept secret)          |
| Public key         | Used to verify signatures (can be shared)        |
| Digest algorithm   | Hash function used before signing (SHA-256, etc.)|
| Verification       | Confirms signature matches data and public key   |

---

## Supported algorithms

The signature class supports various digest algorithms:

| Algorithm      | Security | Speed    | Signature size |
|----------------|----------|----------|----------------|
| SHA-1          | Weak     | Fast     | 160 bits       |
| SHA-224        | Good     | Medium   | 224 bits       |
| SHA-256        | Strong   | Medium   | 256 bits       |
| SHA-384        | Strong   | Slower   | 384 bits       |
| SHA-512        | Strong   | Slower   | 512 bits       |
| SHA3-256       | Strong   | Medium   | 256 bits       |
| SHA3-512       | Strong   | Slower   | 512 bits       |

**Recommendation:** Use `SHA-256` or higher for new applications.

---

## Basic usage

### Signing data

```cpp
#include <join/signature.hpp>

using join::Digest;
using join::Signature;
using join::BytesArray;

// Create signature instance
Signature sig(Digest::Sha256);

// Add data to sign
sig << "Message to sign";

// Generate signature with private key
BytesArray signature = sig.sign("private_key.pem");

if (!signature.empty())
{
    // Signature generated successfully
    saveSignature(signature);
}
```

### Verifying signature

```cpp
Signature sig(Digest::Sha256);

// Add data to verify
sig << "Message to sign";

// Verify signature with public key
bool valid = sig.verify(signature, "public_key.pem");
if (valid)
{
    // Signature is valid
    std::cout << "Signature verified!\n";
}
else
{
    // Signature invalid or verification failed
    std::cout << "Invalid signature!\n";
}
```

---

## Stream-based operations

### Incremental signing

```cpp
Signature sig(Digest::Sha256);

// Add data incrementally
sig << "Part 1\n";
sig << "Part 2\n";
sig << "Part 3\n";

// Generate signature over all data
BytesArray signature = sig.sign("private.pem");
```

### Signing large data

```cpp
Signature sig(Digest::Sha512);

// Read and sign file incrementally
std::ifstream file("large_file.dat", std::ios::binary);
char buffer[4096];

while (file.read(buffer, sizeof(buffer)))
{
    sig.write(buffer, file.gcount());
}

BytesArray signature = sig.sign("private.pem");
```

### Binary data

```cpp
Signature sig(Digest::Sha256);

// Sign binary data
std::vector<uint8_t> data = {0x01, 0x02, 0x03, 0x04};
sig.write(reinterpret_cast<const char*>(data.data()), data.size());

BytesArray signature = sig.sign("private.pem");
```

---

## Static methods

Convenient one-shot signing and verification.

### Sign data directly

```cpp
// Sign string
std::string message = "Important message";
BytesArray sig1 = Signature::sign(
    message,
    "private.pem",
    Digest::Sha256
);

// Sign binary data
BytesArray data = {0x01, 0x02, 0x03};
BytesArray sig2 = Signature::sign(
    data,
    "private.pem",
    Digest::Sha256
);

// Sign buffer
const char* buffer = "data";
BytesArray sig3 = Signature::sign(
    buffer,
    strlen(buffer),
    "private.pem",
    Digest::Sha256
);
```

### Verify data directly

```cpp
// Verify string
bool valid1 = Signature::verify(
    message,
    signature,
    "public.pem",
    Digest::Sha256
);

// Verify binary data
bool valid2 = Signature::verify(
    data,
    signature,
    "public.pem",
    Digest::Sha256
);

// Verify buffer
bool valid3 = Signature::verify(
    buffer,
    strlen(buffer),
    signature,
    "public.pem",
    Digest::Sha256
);
```

---

## Key management

### Key file formats

Signature supports PEM-encoded keys:

```cpp
// RSA private key
"-----BEGIN RSA PRIVATE KEY-----
...
-----END RSA PRIVATE KEY-----"

// RSA public key
"-----BEGIN PUBLIC KEY-----
...
-----END PUBLIC KEY-----"

// PKCS#8 private key
"-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----"
```

### Loading keys

```cpp
// Keys are loaded from file paths
BytesArray sig = Signature::sign(
    data,
    "/path/to/private_key.pem",  // Private key file
    Digest::Sha256
);

bool valid = Signature::verify(
    data,
    signature,
    "/path/to/public_key.pem",   // Public key file
    Digest::Sha256
);
```

### Key types

Supports various key types:
- RSA keys (most common)
- DSA keys
- ECDSA keys
- Ed25519 keys (EdDSA)

---

## Error handling

### Checking results

```cpp
Signature sig(Digest::Sha256);
sig << data;

BytesArray signature = sig.sign("private.pem");

if (signature.empty())
{
    // Signing failed
    std::cerr << "Sign error: " << join::lastError.message() << "\n";
}
```

### Verification errors

```cpp
bool valid = sig.verify(signature, "public.pem");

if (!valid)
{
    std::error_code ec = join::lastError;

    if (ec == DigestErrc::InvalidSignature)
    {
        // Signature doesn't match
        std::cerr << "Signature verification failed\n";
    }
    else if (ec == DigestErrc::InvalidAlgorithm)
    {
        // Algorithm mismatch or error
        std::cerr << "Algorithm error\n";
    }
}
```

### Common errors

| Error                  | Cause                                    |
|------------------------|------------------------------------------|
| InvalidSignature       | Signature doesn't match data             |
| InvalidAlgorithm       | Algorithm not supported                  |
| InvalidKey             | Incorrect key format                     |

---

## Use cases

### API request signing

```cpp
class ApiClient
{
    std::string privateKey;

public:
    std::string signRequest(const std::string& method, const std::string& path, const std::string& body)
    {
        // Create canonical request
        std::string canonical = method + "\n" + path + "\n" + body;

        // Sign request
        BytesArray sig = Signature::sign(
            canonical,
            privateKey,
            Digest::Sha256
        );

        // Return base64-encoded signature
        return base64Encode(sig);
    }
};
```

### Document signing

```cpp
class DocumentSigner
{
public:
    bool signDocument(const std::string& docPath, const std::string& keyPath)
    {
        // Read document
        std::ifstream doc(docPath, std::ios::binary);

        // Create signature
        Signature sig(Digest::Sha256);
        sig << doc.rdbuf();

        // Generate signature
        BytesArray signature = sig.sign(keyPath);

        if (signature.empty())
        {
            return false;
        }

        // Save signature alongside document
        std::ofstream sigFile(docPath + ".sig", std::ios::binary);
        sigFile.write(
            reinterpret_cast<const char*>(signature.data()),
            signature.size()
        );

        return true;
    }
};
```

### License verification

```cpp
class LicenseManager
{
public:
    bool verifyLicense(const std::string& licenseData, const BytesArray& signature)
    {
        // Verify with vendor's public key
        bool valid = Signature::verify(
            licenseData,
            signature,
            "vendor_public.pem",
            Digest::Sha256
        );

        if (!valid)
        {
            return false;
        }

        // Parse license data
        return parseLicense(licenseData);
    }
};
```

### Software update verification

```cpp
class UpdateManager
{
public:
    bool verifyUpdate(const std::string& updateFile)
    {
        // Read update file
        std::ifstream update(updateFile, std::ios::binary);
        Signature sig(Digest::Sha512);
        sig << update.rdbuf();

        // Read signature file
        BytesArray signature = readSignatureFile(updateFile + ".sig");

        // Verify with publisher's public key
        return sig.verify(signature, "publisher_public.pem");
    }
};
```

---

## Security considerations

### Private key protection

```cpp
// Good: Restrict key file permissions
// chmod 600 private_key.pem

// Good: Store keys securely
const std::string keyPath = getSecureKeyPath();
BytesArray sig = Signature::sign(data, keyPath, Digest::Sha256);

// Bad: Hardcoded keys in source code
const std::string key = "-----BEGIN PRIVATE KEY-----...";
```

### Algorithm selection

```cpp
// Good: Use strong algorithms
Signature sig(Digest::Sha256);  // Recommended
Signature sig(Digest::Sha512);  // More secure

// Avoid: Weak algorithms
Signature sig(Digest::Sha1);    // Deprecated
Signature sig(Digest::Md5);     // Broken
```

### Signature verification

```cpp
// Good: Always verify return value
bool valid = sig.verify(signature, pubKey);
if (!valid)
{
    // Reject data
    return false;
}

// Bad: Ignoring verification result
sig.verify(signature, pubKey);
// Proceeding without checking!
```

### Key size recommendations

| Key type | Minimum size | Recommended size |
|----------|--------------|------------------|
| RSA      | 2048 bits    | 3072-4096 bits   |
| ECDSA    | 256 bits     | 384-521 bits     |
| Ed25519  | 256 bits     | 256 bits (fixed) |

---

## Best practices

### Use appropriate algorithms

```cpp
// Modern applications
Signature sig(Digest::Sha256);    // Good balance

// High security requirements
Signature sig(Digest::Sha512);
```

### Verify signatures immediately

```cpp
// Good: Verify before processing
bool valid = Signature::verify(data, sig, pubKey, Digest::Sha256);
if (valid)
{
    processData(data);
}

// Bad: Process then verify
processData(data);
if (!Signature::verify(data, sig, pubKey, Digest::Sha256))
{
    // Too late!
}
```

### Include context in signatures

```cpp
// Good: Sign data with context
std::string toSign =
    "v1" + "\n" +
    timestamp + "\n" +
    userId + "\n" +
    actualData;

BytesArray sig = Signature::sign(toSign, key, Digest::Sha256);

// Prevents signature reuse across contexts
```

### Handle errors properly

```cpp
BytesArray signature = Signature::sign(data, key, Digest::Sha256);

if (signature.empty())
{
    // Log error with context
    std::cerr << "Failed to sign data: " << join::lastError.message() << "\n";
    return false;
}
```

### Separate key storage

```cpp
// Good: Keys in separate secure location
class SecureConfig
{
    std::string getPrivateKeyPath()
    {
        return "/etc/secure/keys/private.pem";
    }
};

// Bad: Keys with application code
// ./app/private.pem
```

---

## Summary

| Feature                    | Supported |
|----------------------------|-----------|
| RSA signatures             | ✅        |
| DSA signatures             | ✅        |
| ECDSA signatures           | ✅        |
| Multiple digest algorithms | ✅        |
| Stream-based signing       | ✅        |
| Static one-shot methods    | ✅        |
| PEM key format             | ✅        |
| Incremental data signing   | ✅        |
| Binary data support        | ✅        |
| Error handling             | ✅        |
