---

title: "DoT Resolver"
weight: 55
---

# DoT Resolver

The **Dot::Resolver** class is a DNS-over-TLS resolver. It shares the full instance API of `Dns::Resolver` but transports queries over a persistent TLS connection with RFC 7858 framing (2-byte length prefix). System name servers are reached over plain UDP by `Dns::Resolver`.

---

## Construction

```cpp
// Connect to a specific DoT server, default port 853
Dot::Resolver resolver("1.1.1.1");

// Custom port and reactor
Dot::Resolver resolver("dns.google", 853, &myReactor);

// Default constructor
Dot::Resolver resolver;
```

`Dot::Resolver` is neither copyable nor movable.

---

## Host resolution (A / AAAA)

All instance methods are identical to `Dns::Resolver`:

```cpp
Dot::Resolver resolver("1.1.1.1");

IpAddress     ip  = resolver.resolveAddress("example.com", AF_INET);
IpAddress     ip6 = resolver.resolveAddress("example.com", AF_INET6);
IpAddress     ip  = resolver.resolveAddress("example.com");

IpAddressList v4  = resolver.resolveAllAddress("example.com", AF_INET);
IpAddressList v6  = resolver.resolveAllAddress("example.com", AF_INET6);
IpAddressList all = resolver.resolveAllAddress("example.com");

// Custom timeout
IpAddress ip = resolver.resolveAddress("example.com", AF_INET,
                                        std::chrono::milliseconds(3000));
```

⚠️ The first query triggers a TLS handshake. Subsequent queries reuse the same connection.

---

## Reverse DNS (PTR)

```cpp
std::string name    = resolver.resolveName("1.1.1.1");
AliasList   aliases = resolver.resolveAllName("1.1.1.1");
```

---

## Name servers (NS)

```cpp
std::string ns  = resolver.resolveNameServer("example.com");
ServerList  nsl = resolver.resolveAllNameServer("example.com");
```

---

## Start of Authority (SOA)

```cpp
std::string soa = resolver.resolveAuthority("example.com");
```

---

## Mail exchangers (MX)

```cpp
std::string   mx  = resolver.resolveMailExchanger("example.com");
ExchangerList mxl = resolver.resolveAllMailExchanger("example.com");
```

---

## Static methods

All `lookup*` static methods are **deleted** on `Dot::Resolver`. Use `Dns::Resolver::lookup*` for system-DNS queries, then use a `Dot::Resolver` instance for privacy-sensitive lookups:

```cpp
// Resolve server address via plain DNS first
IpAddress dotServer = Dns::Resolver::lookupAddress("dns.google", AF_INET);

// Then query over TLS
Dot::Resolver resolver(dotServer.toString());
IpAddress ip = resolver.resolveAddress("example.com");
```

---

## Service name resolution

`resolveService` is inherited from `BasicDatagramResolver` and remains available as a static method (it reads `/etc/services` locally, no network):

```cpp
uint16_t port = Dot::Resolver::resolveService("https"); // 443
```

---

## Debug callbacks

Same as `Dns::Resolver` — pre-wired in `DEBUG` builds, `nullptr` in release:

```cpp
resolver.onSuccess = [](const DnsPacket& p) { /* ... */ };
resolver.onFailure = [](const DnsPacket& p) { /* ... */ };
```

---

## Error handling

Same error codes as `Dns::Resolver`, plus:

| Code | Cause |
|------|-------|
| `Errc::TimedOut` | TLS handshake or query timeout |
| `Errc::MessageTooLong` | Frame payload exceeds `maxMsgSize` (16384 bytes) |
| `Errc::TemporaryError` | Partial read/write — internal, triggers retry |

On TLS reconnection the resolver sets ALPN to `"dot"` before the handshake.

---

## Protocol details

- Transport: TLS over TCP, default port 853, max message size 16384 bytes
- Framing: 2-byte big-endian length prefix per message (RFC 7858)
- ALPN: `"dot"`
- Connection is established lazily on first query and reused for subsequent queries
- Reconnection is attempted automatically if the connection is found closed

---

## Summary

| Feature | Supported |
| ------- | :-------: |
| Host resolution (A/AAAA) | ✅ |
| Reverse DNS (PTR) | ✅ |
| Name servers (NS) | ✅ |
| SOA | ✅ |
| Mail exchangers (MX) | ✅ |
| Static `lookup*` methods | ❌ (deleted) |
| `resolveService` | ✅ (local, no network) |
| TLS transport | ✅ |
| RFC 7858 framing | ✅ |
| ALPN `"dot"` | ✅ |
| Custom timeout | ✅ |
| Custom reactor | ✅ |
