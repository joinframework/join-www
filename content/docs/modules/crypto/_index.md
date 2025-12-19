---
title: "Crypto"
weight: 2
bookCollapseSection: true
---

# Crypto

The **Crypto** module provides cryptographic operations and security features built on OpenSSL.

---

### Base64

Base64 encoding and decoding with stream support.

**Features:**

* Stream-based encoding/decoding (Encoder/Decoder)
* One-shot encode/decode operations
* Binary-to-hex conversion utilities

---

### Digest

Cryptographic hash functions with stream interface.

**Algorithms:**

* MD5, SHA-1, SHA-224/256/384/512, SM3

**Features:**

* Stream-based hashing (Digestbuf)
* One-shot hash functions (md5hex, sha256bin, etc.)
* Binary and hex output formats

---

### HMAC

Hash-based Message Authentication Code with stream support.

**Features:**

* Stream-based HMAC computation (Hmacbuf)
* Support for all Digest algorithms
* One-shot HMAC functions with binary/hex output

---

### OpenSSL

OpenSSL library management and smart pointers.

**Features:**

* Library initialization (initializeOpenSSL)
* Smart pointer wrappers (EvpPkeyPtr, SslCtxPtr, etc.)
* Default cipher and curve configurations

---

### Signature

Digital signature operations with stream interface.

**Features:**

* Stream-based signing and verification (Signaturebuf)
* Support for RSA, DSA, ECDSA, EdDSA via EVP_PKEY
* One-shot sign/verify operations

---

### TLSKey

TLS key management for public and private keys.

**Features:**

* PEM format key loading (public/private)
* EVP_PKEY wrapper with RAII
* Key length and type queries

---

## API Reference

For detailed API documentation, see:

🔗 [Doxygen Crypto Module Reference](https://joinframework.github.io/join/)
