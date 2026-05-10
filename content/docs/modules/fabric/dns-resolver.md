---

title: "DNS Resolver"
weight: 50
---

# DNS Resolver

The **Dns::Resolver** class is a DNS resolver over UDP. It sends standard DNS queries to a specific server and returns parsed results. Each instance is connected to one server; static `lookup*` methods iterate over the system-configured servers from `/etc/resolv.conf`.

---

## Construction

```cpp
// Connect to a specific server (IP or hostname), default port 53
Dns::Resolver resolver("8.8.8.8");

// Custom port and reactor
Dns::Resolver resolver("8.8.8.8", 5353, &myReactor);

// Default constructor — server must be set via connect() before use
Dns::Resolver resolver;
```

`Dns::Resolver` is neither copyable nor movable.

---

## Host resolution (A / AAAA)

### Instance methods — query a specific server

```cpp
Dns::Resolver resolver("8.8.8.8");

// First IPv4 address
IpAddress ip = resolver.resolveAddress("example.com", AF_INET);

// First IPv6 address
IpAddress ip6 = resolver.resolveAddress("example.com", AF_INET6);

// First address, any family
IpAddress ip = resolver.resolveAddress("example.com");

// All addresses for a given family
IpAddressList v4 = resolver.resolveAllAddress("example.com", AF_INET);
IpAddressList v6 = resolver.resolveAllAddress("example.com", AF_INET6);

// All addresses, both families
IpAddressList all = resolver.resolveAllAddress("example.com");

// Custom timeout
IpAddress ip = resolver.resolveAddress("example.com", AF_INET,
                                        std::chrono::milliseconds(2000));
```

### Static methods — use system name servers

```cpp
// First address
IpAddress ip = Dns::Resolver::lookupAddress("example.com", AF_INET);
IpAddress ip = Dns::Resolver::lookupAddress("example.com");

// All addresses
IpAddressList all = Dns::Resolver::lookupAllAddress("example.com", AF_INET);
IpAddressList all = Dns::Resolver::lookupAllAddress("example.com");
```

Static `lookup*` methods try each system name server in order and return on the first non-empty result.

---

## Reverse DNS (PTR)

### Instance methods

```cpp
// First hostname for an IP
std::string name = resolver.resolveName("8.8.8.8");

// All hostnames
AliasList aliases = resolver.resolveAllName("8.8.8.8");

// Custom timeout
std::string name = resolver.resolveName("8.8.8.8", std::chrono::milliseconds(2000));
```

### Static methods

```cpp
std::string name   = Dns::Resolver::lookupName("8.8.8.8");
AliasList aliases  = Dns::Resolver::lookupAllName("8.8.8.8");
```

---

## Name servers (NS)

### Instance methods

```cpp
std::string        ns  = resolver.resolveNameServer("example.com");
ServerList         nsl = resolver.resolveAllNameServer("example.com");
```

### Static methods

```cpp
std::string        ns  = Dns::Resolver::lookupNameServer("example.com");
ServerList         nsl = Dns::Resolver::lookupAllNameServer("example.com");
```

---

## Start of Authority (SOA)

### Instance method

```cpp
std::string soa = resolver.resolveAuthority("example.com");
```

### Static method

```cpp
std::string soa = Dns::Resolver::lookupAuthority("example.com");
```

---

## Mail exchangers (MX)

### Instance methods

```cpp
std::string      mx  = resolver.resolveMailExchanger("example.com");
ExchangerList    mxl = resolver.resolveAllMailExchanger("example.com");
```

### Static methods

```cpp
std::string      mx  = Dns::Resolver::lookupMailExchanger("example.com");
ExchangerList    mxl = Dns::Resolver::lookupAllMailExchanger("example.com");
```

---

## System name servers

```cpp
IpAddressList servers = Dns::Resolver::nameServers();
for (const auto& s : servers)
{
    std::cout << s.toString() << "\n";
}
```

Reads `/etc/resolv.conf` via `res_ninit`.

---

## Service name resolution

```cpp
uint16_t port = Dns::Resolver::resolveService("http");   // 80
uint16_t port = Dns::Resolver::resolveService("https");  // 443
uint16_t port = Dns::Resolver::resolveService("ssh");    // 22
```

Queries `/etc/services` via `getservbyname_r`. Returns 0 if not found.

---

## Debug callbacks

In `DEBUG` builds, `onSuccess` and `onFailure` are pre-wired to print dig-style output. In release builds they are `nullptr`. They can be overridden on any instance:

```cpp
resolver.onSuccess = [](const DnsPacket& p) {
    for (const auto& a : p.answers)
        std::cout << a.host << " -> " << a.addr.toString() << "\n";
};

resolver.onFailure = [](const DnsPacket& p) {
    std::cerr << "Query failed: " << lastError.message() << "\n";
};
```

---

## Error handling

Instance methods return a wildcard `IpAddress`, empty string, or empty list on failure. Check `lastError`:

| Code | Cause |
|------|-------|
| `Errc::TimedOut` | No response within timeout |
| `Errc::InvalidParam` | Empty host, bad server address, or serialization error |
| `Errc::MessageTooLong` | Response truncated (TC bit set) |
| `Errc::OperationFailed` | Duplicate pending request id |

DNS-level errors (NXDOMAIN, SERVFAIL, REFUSED…) are also mapped to `lastError` via `DnsMessage::decodeError`.

---

## Protocol details

- Transport: UDP, default port 53, max message size 8192 bytes
- One socket per instance, connected to the target server
- Queries carry a random 16-bit transaction ID matched against responses
- Recursion desired (`RD`) flag set on all queries

---

## Summary

| Method family | Instance | Static (`lookup*`) |
| ------------- | :------: | :----------------: |
| `resolveAddress` / `lookupAddress` | ✅ | ✅ |
| `resolveAllAddress` / `lookupAllAddress` | ✅ | ✅ |
| `resolveName` / `lookupName` | ✅ | ✅ |
| `resolveAllName` / `lookupAllName` | ✅ | ✅ |
| `resolveNameServer` / `lookupNameServer` | ✅ | ✅ |
| `resolveAllNameServer` / `lookupAllNameServer` | ✅ | ✅ |
| `resolveAuthority` / `lookupAuthority` | ✅ | ✅ |
| `resolveMailExchanger` / `lookupMailExchanger` | ✅ | ✅ |
| `resolveAllMailExchanger` / `lookupAllMailExchanger` | ✅ | ✅ |
| `nameServers` | — | ✅ (static) |
| `resolveService` | — | ✅ (static) |
