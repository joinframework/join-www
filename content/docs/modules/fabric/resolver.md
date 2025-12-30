---

title: "Resolver"
weight: 6
---

# Resolver

Join provides a **DNS resolver** for performing domain name lookups and reverse DNS queries.
The Resolver class implements DNS protocol operations and supports querying custom DNS servers.

The resolver supports:

* **Host resolution** — domain names to IP addresses (A/AAAA records)
* **Reverse DNS** — IP addresses to hostnames (PTR records)
* **Name servers** — authoritative DNS servers (NS records)
* **Mail exchangers** — email servers (MX records)
* **Authority records** — zone information (SOA records)
* **Service resolution** — service names to port numbers

Features include:

* IPv4 and IPv6 support
* Custom DNS server queries
* Configurable timeouts
* Static and instance methods
* Multiple result retrieval

---

## Basic usage

### Resolving hostnames

```cpp
#include <join/resolver.hpp>

using join;

// Resolve to first IP address
IpAddress ip = Resolver::resolveHost("example.com");

if (!ip.isWildcard()) {
    std::cout << "IP: " << ip.toString() << std::endl;
}
```

### Resolving all addresses

```cpp
// Get all IP addresses (IPv4 and IPv6)
IpAddressList addresses = Resolver::resolveAllHost("example.com");

for (const auto& addr : addresses) {
    std::cout << addr.toString() << std::endl;
}
```

### IPv4 or IPv6 specific

```cpp
// IPv4 only
IpAddress ipv4 = Resolver::resolveHost("example.com", AF_INET);

// IPv6 only
IpAddress ipv6 = Resolver::resolveHost("example.com", AF_INET6);
```

---

## Custom DNS servers

### Instance with specific server

```cpp
Resolver resolver;
IpAddress dnsServer("8.8.8.8");  // Google DNS

IpAddress ip = resolver.resolveHost(
    "example.com",
    dnsServer,
    53,      // port
    5000     // timeout in ms
);
```

### Binding to network interface

```cpp
// Use specific network interface
Resolver resolver("eth0");

IpAddress ip = resolver.resolveHost("example.com", dnsServer);
```

---

## Reverse DNS lookups

### Resolving IP to hostname

```cpp
IpAddress ip("8.8.8.8");

// Get first hostname
std::string hostname = Resolver::resolveAddress(ip);

std::cout << "Hostname: " << hostname << std::endl;
```

### Getting all PTR records

```cpp
IpAddress ip("8.8.8.8");

// Get all hostnames
AliasList aliases = Resolver::resolveAllAddress(ip);

for (const auto& alias : aliases) {
    std::cout << alias << std::endl;
}
```

---

## Name server queries

### Finding authoritative name servers

```cpp
// Get all name servers for domain
ServerList servers = Resolver::resolveAllNameServer("example.com");

for (const auto& server : servers) {
    std::cout << "NS: " << server << std::endl;
}
```

### Getting primary name server

```cpp
std::string ns = Resolver::resolveNameServer("example.com");
std::cout << "Primary NS: " << ns << std::endl;
```

---

## Start of Authority (SOA) records

### Querying zone authority

```cpp
std::string soa = Resolver::resolveAuthority("example.com");
std::cout << "SOA: " << soa << std::endl;
```

The SOA record identifies the primary name server for the zone.

---

## Mail exchanger (MX) records

### Finding mail servers

```cpp
// Get all mail exchangers
ExchangerList exchangers = Resolver::resolveAllMailExchanger("example.com");

for (const auto& mx : exchangers) {
    std::cout << "MX: " << mx << std::endl;
}
```

### Getting primary mail server

```cpp
std::string mx = Resolver::resolveMailExchanger("example.com");
std::cout << "Primary MX: " << mx << std::endl;
```

---

## Service name resolution

### Resolving service to port

```cpp
uint16_t port = Resolver::resolveService("http");
std::cout << "HTTP port: " << port << std::endl;  // 80

port = Resolver::resolveService("https");
std::cout << "HTTPS port: " << port << std::endl;  // 443
```

This queries `/etc/services` for standard service port mappings.

---

## System DNS configuration

### Getting configured name servers

```cpp
IpAddressList servers = Resolver::nameServers();

for (const auto& server : servers) {
    std::cout << "DNS Server: " << server.toString() << std::endl;
}
```

This reads the system's DNS configuration from `/etc/resolv.conf`.

---

## DNS record types

The resolver supports these record types:

| Type    | Value | Description                |
| ------- | ----- | -------------------------- |
| A       | 1     | IPv4 address               |
| NS      | 2     | Name server                |
| CNAME   | 5     | Canonical name (alias)     |
| SOA     | 6     | Start of authority         |
| PTR     | 12    | Pointer (reverse DNS)      |
| MX      | 15    | Mail exchanger             |
| AAAA    | 28    | IPv6 address               |

### Record type names

```cpp
std::string name = Resolver::typeName(Resolver::RecordType::A);
std::cout << name << std::endl;  // "A"

name = Resolver::typeName(Resolver::RecordType::AAAA);
std::cout << name << std::endl;  // "AAAA"
```

### Record class names

```cpp
std::string className = Resolver::className(Resolver::RecordClass::IN);
std::cout << className << std::endl;  // "IN"
```

---

## Advanced usage

### Custom timeout

```cpp
Resolver resolver;
IpAddress dnsServer("1.1.1.1");  // Cloudflare DNS

// 10 second timeout
IpAddress ip = resolver.resolveHost(
    "example.com",
    dnsServer,
    53,
    10000
);
```

### Handling failures

```cpp
IpAddress ip = Resolver::resolveHost("nonexistent.invalid");

if (ip.isWildcard()) {
    if (lastError == Errc::NotFound) {
        std::cerr << "Host not found" << std::endl;
    } else if (lastError == std::errc::timed_out) {
        std::cerr << "DNS query timed out" << std::endl;
    } else {
        std::cerr << "DNS error: " << lastError.message() << std::endl;
    }
}
```

Common error codes:
* `Errc::NotFound` — domain does not exist (NXDOMAIN)
* `std::errc::timed_out` — query timeout
* `Errc::InvalidParam` — malformed query
* `Errc::OperationFailed` — server failure
* `Errc::PermissionDenied` — query refused

---

## DNS packet structure

### DnsPacket

The `DnsPacket` structure contains complete DNS query/response data:

```cpp
struct DnsPacket {
    IpAddress src;                          // Source IP
    IpAddress dest;                         // Destination IP
    uint16_t port;                          // Port number
    std::vector<QuestionRecord> questions;  // Query records
    std::vector<AnswerRecord> answers;      // Answer records
    std::vector<AnswerRecord> authorities;  // Authority records
    std::vector<AnswerRecord> additionals;  // Additional records
};
```

### QuestionRecord

```cpp
struct QuestionRecord {
    std::string host;      // Hostname
    uint16_t type;         // Record type (A, AAAA, etc.)
    uint16_t dnsclass;     // DNS class (IN)
};
```

### AnswerRecord

```cpp
struct AnswerRecord : public QuestionRecord {
    uint32_t ttl;          // Time to live
    IpAddress addr;        // IP address (A/AAAA)
    std::string name;      // Name (CNAME, NS, PTR, MX)
    std::string mail;      // Email (SOA)
    uint32_t serial;       // Serial number (SOA)
    uint32_t refresh;      // Refresh interval (SOA)
    uint32_t retry;        // Retry interval (SOA)
    uint32_t expire;       // Expiration time (SOA)
    uint32_t minimum;      // Minimum TTL (SOA)
    uint16_t mxpref;       // MX preference
};
```

---

## Notification callbacks

### Success and failure callbacks

```cpp
Resolver resolver;

resolver._onSuccess = [](const DnsPacket& packet) {
    std::cout << "Query succeeded" << std::endl;
    for (const auto& answer : packet.answers) {
        std::cout << "Answer: " << answer.host << std::endl;
    }
};

resolver._onFailure = [](const DnsPacket& packet) {
    std::cerr << "Query failed: " << lastError.message() << std::endl;
};

IpAddress ip = resolver.resolveHost("example.com", dnsServer);
```

⚠️ Callbacks are primarily for debugging and monitoring.

---

## Usage examples

### DNS lookup tool

```cpp
#include <join/resolver.hpp>
#include <iostream>

using join;

int main(int argc, char* argv[]) {
    if (argc != 2) {
        std::cerr << "Usage: " << argv[0] << " <hostname>" << std::endl;
        return 1;
    }
    
    std::string hostname = argv[1];
    
    // IPv4 addresses
    std::cout << "IPv4 addresses:" << std::endl;
    IpAddressList ipv4 = Resolver::resolveAllHost(hostname, AF_INET);
    for (const auto& ip : ipv4) {
        std::cout << "  " << ip.toString() << std::endl;
    }
    
    // IPv6 addresses
    std::cout << "IPv6 addresses:" << std::endl;
    IpAddressList ipv6 = Resolver::resolveAllHost(hostname, AF_INET6);
    for (const auto& ip : ipv6) {
        std::cout << "  " << ip.toString() << std::endl;
    }
    
    return 0;
}
```

### Reverse DNS lookup

```cpp
#include <join/resolver.hpp>
#include <iostream>

using join;

int main(int argc, char* argv[]) {
    if (argc != 2) {
        std::cerr << "Usage: " << argv[0] << " <ip>" << std::endl;
        return 1;
    }
    
    IpAddress ip(argv[1]);
    
    AliasList aliases = Resolver::resolveAllAddress(ip);
    
    if (!aliases.empty()) {
        std::cout << "Hostnames:" << std::endl;
        for (const auto& alias : aliases) {
            std::cout << "  " << alias << std::endl;
        }
    } else {
        std::cout << "No PTR records found" << std::endl;
    }
    
    return 0;
}
```

### Mail server lookup

```cpp
#include <join/resolver.hpp>
#include <iostream>

using join;

void findMailServers(const std::string& domain) {
    std::cout << "Mail servers for " << domain << ":" << std::endl;
    
    ExchangerList mx = Resolver::resolveAllMailExchanger(domain);
    
    if (mx.empty()) {
        std::cout << "  No MX records found" << std::endl;
        return;
    }
    
    for (const auto& server : mx) {
        std::cout << "  " << server << std::endl;
        
        // Resolve mail server IP
        IpAddress ip = Resolver::resolveHost(server);
        if (!ip.isWildcard()) {
            std::cout << "    -> " << ip.toString() << std::endl;
        }
    }
}
```

### DNS diagnostics

```cpp
#include <join/resolver.hpp>
#include <iostream>

using join;

void diagnoseDomain(const std::string& domain) {
    std::cout << "DNS information for " << domain << std::endl;
    std::cout << std::string(50, '=') << std::endl;
    
    // A records
    std::cout << "\nA Records:" << std::endl;
    IpAddressList ipv4 = Resolver::resolveAllHost(domain, AF_INET);
    for (const auto& ip : ipv4) {
        std::cout << "  " << ip.toString() << std::endl;
    }
    
    // AAAA records
    std::cout << "\nAAAA Records:" << std::endl;
    IpAddressList ipv6 = Resolver::resolveAllHost(domain, AF_INET6);
    for (const auto& ip : ipv6) {
        std::cout << "  " << ip.toString() << std::endl;
    }
    
    // NS records
    std::cout << "\nName Servers:" << std::endl;
    ServerList ns = Resolver::resolveAllNameServer(domain);
    for (const auto& server : ns) {
        std::cout << "  " << server << std::endl;
    }
    
    // SOA record
    std::cout << "\nStart of Authority:" << std::endl;
    std::string soa = Resolver::resolveAuthority(domain);
    if (!soa.empty()) {
        std::cout << "  " << soa << std::endl;
    }
    
    // MX records
    std::cout << "\nMail Exchangers:" << std::endl;
    ExchangerList mx = Resolver::resolveAllMailExchanger(domain);
    for (const auto& server : mx) {
        std::cout << "  " << server << std::endl;
    }
}
```

### Custom DNS server query

```cpp
#include <join/resolver.hpp>
#include <iostream>

using join;

void queryDnsServer(const std::string& hostname, 
                    const std::string& server) {
    Resolver resolver;
    IpAddress dnsServer(server);
    
    std::cout << "Querying " << server << " for " 
              << hostname << std::endl;
    
    IpAddressList addresses = resolver.resolveAllHost(
        hostname,
        dnsServer,
        53,
        5000
    );
    
    if (!addresses.empty()) {
        for (const auto& ip : addresses) {
            std::cout << "  " << ip.toString() << std::endl;
        }
    } else {
        std::cerr << "Query failed: " 
                  << lastError.message() << std::endl;
    }
}

int main() {
    // Try different DNS servers
    queryDnsServer("example.com", "8.8.8.8");        // Google
    queryDnsServer("example.com", "1.1.1.1");        // Cloudflare
    queryDnsServer("example.com", "208.67.222.222"); // OpenDNS
}
```

---

## Protocol details

### DNS query format

Queries are sent over UDP to port 53 (default) with:
* Random 16‑bit transaction ID
* Recursion desired flag set
* Standard query operation
* Questions encoded in DNS wire format

### Response validation

Responses are validated to ensure:
* Transaction ID matches request
* Response flag is set
* Packet is well‑formed

### Timeout behavior

Default timeout is **5 seconds**. Queries that exceed this:
* Return empty results
* Set `lastError` to `std::errc::timed_out`
* Do not automatically retry

---

## Best practices

* Use static methods for simple queries with system DNS
* Create Resolver instances for custom DNS servers or timeouts
* Handle wildcard/empty results appropriately
* Check `lastError` when operations fail
* Use `resolveAllHost()` to get all addresses for load balancing
* Query specific address families (IPv4/IPv6) when needed
* Set appropriate timeouts for network conditions
* Cache results when making repeated queries
* Use MX preference values to prioritize mail servers
* Consider DNS TTL values for caching strategies

---

## Limitations

* UDP only — no TCP fallback for large responses
* No DNSSEC validation
* No DNS‑over‑TLS (DoT) or DNS‑over‑HTTPS (DoH)
* Limited to standard query types (A, AAAA, NS, MX, PTR, SOA, CNAME)
* No automatic retry on timeout
* Single query per lookup operation

---

## Security considerations

* **DNS spoofing** — responses are not authenticated
* **Cache poisoning** — no DNSSEC support
* **Privacy** — queries sent in plaintext
* **Amplification** — be cautious with open resolvers

For security‑sensitive applications:
* Use trusted DNS servers
* Validate responses when possible
* Consider DNS‑over‑HTTPS alternatives
* Monitor for suspicious responses

---

## Summary

| Feature                | Supported |
| ---------------------- | --------- |
| Host resolution (A)    | ✅         |
| IPv6 resolution (AAAA) | ✅         |
| Reverse DNS (PTR)      | ✅         |
| Name servers (NS)      | ✅         |
| Mail exchangers (MX)   | ✅         |
| Authority records (SOA)| ✅         |
| Canonical names (CNAME)| ✅         |
| Service resolution     | ✅         |
| Custom DNS servers     | ✅         |
| Configurable timeout   | ✅         |
| Interface binding      | ✅         |
| DNSSEC                 | ❌         |
| TCP fallback           | ❌         |
| DNS‑over‑TLS           | ❌         |

| Method                      | Returns              | Use Case                    |
| --------------------------- | -------------------- | --------------------------- |
| `resolveHost()`             | First IP             | Simple hostname lookup      |
| `resolveAllHost()`          | All IPs              | Load balancing, redundancy  |
| `resolveAddress()`          | First hostname       | Reverse DNS lookup          |
| `resolveAllAddress()`       | All hostnames        | Multiple PTR records        |
| `resolveNameServer()`       | First NS             | Finding authoritative DNS   |
| `resolveAuthority()`        | SOA name server      | Zone information            |
| `resolveMailExchanger()`    | First MX             | Primary mail server         |
| `resolveAllMailExchanger()` | All MX               | All mail servers            |
| `resolveService()`          | Port number          | Service to port mapping     |
| `nameServers()`             | System DNS servers   | Getting system DNS config   |
