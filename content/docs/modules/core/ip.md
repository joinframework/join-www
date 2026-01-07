---
title: "IP Address"
weight: 4
---

# IP Address

Join provides a **unified IPv4/IPv6 address class** with automatic format detection and conversion.
The `IpAddress` class abstracts the differences between IPv4 and IPv6, providing a **consistent interface** for both.

IP address features:

* **dual-stack** — handles both IPv4 and IPv6 transparently
* **auto-detection** — determines address family from string format
* **type checking** — validates wildcard, loopback, multicast, etc.
* **bitwise operations** — AND, OR, XOR, NOT for network calculations
* **conversions** — IPv4 ↔ IPv6 mapping, ARPA format

---

## Creating addresses

### Default construction

```cpp
#include <join/ipaddress.hpp>

using join;

IpAddress addr;  // IPv4 wildcard (0.0.0.0)
```

### From string

```cpp
// IPv4
IpAddress ipv4("192.168.1.1");
IpAddress ipv4Alt("10.0.0.1", AF_INET);

// IPv6
IpAddress ipv6("2001:db8::1");
IpAddress ipv6Alt("fe80::1", AF_INET6);

// IPv6 with scope
IpAddress linkLocal("fe80::1%eth0");
IpAddress scopedAddr("fe80::1%2");  // Scope ID
```

### From binary structures

```cpp
// From sockaddr
struct sockaddr_in sa;
IpAddress addr1(sa);

// From in_addr / in6_addr
struct in_addr ipv4Addr;
IpAddress addr2(&ipv4Addr, sizeof(ipv4Addr));

struct in6_addr ipv6Addr;
IpAddress addr3(&ipv6Addr, sizeof(ipv6Addr), scopeId);
```

### Netmask from prefix

```cpp
IpAddress mask24(24, AF_INET);     // 255.255.255.0
IpAddress mask64(64, AF_INET6);    // ffff:ffff:ffff:ffff::
```

---

## Predefined constants

```cpp
// IPv6
IpAddress::ipv6Wildcard;         // ::
IpAddress::ipv6AllNodes;          // ff02::1
IpAddress::ipv6SolicitedNodes;    // ff02::1:ff00:0
IpAddress::ipv6Routers;           // ff02::2

// IPv4
IpAddress::ipv4Wildcard;          // 0.0.0.0
IpAddress::ipv4Broadcast;         // 255.255.255.255
```

---

## Address properties

### Address family

```cpp
IpAddress addr("192.168.1.1");

int family = addr.family();  // AF_INET or AF_INET6

if (addr.isIpv4Address())
{
    // IPv4 address
}

if (addr.isIpv6Address())
{
    // IPv6 address
}
```

### Address type checking

```cpp
IpAddress addr("10.0.0.1");

bool wildcard = addr.isWildcard();      // 0.0.0.0 or ::
bool loopback = addr.isLoopBack();      // 127.x.x.x or ::1
bool linkLocal = addr.isLinkLocal();    // 169.254.x.x or fe80::/10
bool siteLocal = addr.isSiteLocal();    // fec0::/10 (deprecated)
bool uniqueLocal = addr.isUniqueLocal();// 10.x.x.x, 192.168.x.x, fc00::/7
bool multicast = addr.isMulticast();    // 224.x.x.x or ff00::/8
bool broadcast = addr.isBroadcast();    // 255.255.255.255
bool unicast = addr.isUnicast();        // Regular unicast address
bool global = addr.isGlobal();          // Globally routable
```

### Static validation

```cpp
if (IpAddress::isIpAddress("192.168.1.1"))
{
    // Valid IP address (v4 or v6)
}

if (IpAddress::isIpv4Address("10.0.0.1"))
{
    // Valid IPv4 address
}

if (IpAddress::isIpv6Address("2001:db8::1"))
{
    // Valid IPv6 address
}
```

---

## Conversions

### IPv4 ↔ IPv6

```cpp
IpAddress ipv4("192.168.1.1");
IpAddress ipv6 = ipv4.toIpv6();  // ::ffff:192.168.1.1 (IPv4-mapped)

IpAddress mapped("::ffff:10.0.0.1");
IpAddress v4 = mapped.toIpv4();  // 10.0.0.1
```

### String conversion

```cpp
IpAddress addr("2001:db8::1");
std::string str = addr.toString();  // "2001:db8::1"

// Stream insertion
std::cout << addr << "\n";  // Prints address
```

### ARPA format (reverse DNS)

```cpp
IpAddress ipv4("192.168.1.1");
std::string arpa4 = ipv4.toArpa();  // "1.1.168.192.in-addr.arpa"

IpAddress ipv6("2001:db8::1");
std::string arpa6 = ipv6.toArpa();  // "1.0.0.0...8.b.d.0.1.0.0.2.ip6.arpa"
```

---

## Bitwise operations

### Network calculations

```cpp
IpAddress ip("192.168.1.100");
IpAddress mask(24, AF_INET);  // 255.255.255.0

// Network address
IpAddress network = ip & mask;  // 192.168.1.0

// Broadcast address
IpAddress broadcast = network | ~mask;  // 192.168.1.255

// Check if same network
IpAddress ip2("192.168.1.200");
if ((ip & mask) == (ip2 & mask))
{
    // Same network
}
```

### Supported operations

```cpp
IpAddress a("10.0.0.255");
IpAddress b("255.255.255.0");

IpAddress result1 = a & b;  // AND
IpAddress result2 = a | b;  // OR
IpAddress result3 = a ^ b;  // XOR
IpAddress result4 = ~a;     // NOT
```

---

## Prefix and netmask

### Netmask to prefix

```cpp
IpAddress mask("255.255.255.0");
int prefix = mask.prefix();  // 24
```

### Prefix to netmask

```cpp
IpAddress mask(28, AF_INET);  // 255.255.255.240
```

### Check if address is network/broadcast

```cpp
IpAddress ip("192.168.1.255");

if (ip.isBroadcast(24))
{
    // Broadcast for /24 network
}
```

---

## Byte access

Access individual bytes of the address:

```cpp
IpAddress addr("192.168.1.1");

uint8_t first = addr[0];   // 192
uint8_t second = addr[1];  // 168

addr[3] = 100;  // Modify to 192.168.1.100
```

---

## Interface address lookup

Get IPv4 address of a network interface:

```cpp
IpAddress addr = IpAddress::ipv4Address("eth0");

if (!addr.isWildcard())
{
    std::cout << "eth0 address: " << addr << "\n";
}
```

---

## Comparison

```cpp
IpAddress a("10.0.0.1");
IpAddress b("10.0.0.2");

bool equal = (a == b);
bool notEqual = (a != b);
bool less = (a < b);
bool lessEq = (a <= b);
bool greater = (a > b);
bool greaterEq = (a >= b);
```

Addresses are ordered by:
1. Address family (IPv4 < IPv6)
2. Scope ID (for IPv6)
3. Address value (byte-by-byte)

---

## Usage patterns

### Subnet checking

```cpp
bool isInSubnet(const IpAddress& ip, const IpAddress& network, int prefix)
{
    IpAddress mask(prefix, ip.family());
    return (ip & mask) == (network & mask);
}

IpAddress host("192.168.1.50");
IpAddress net("192.168.1.0");

if (isInSubnet(host, net, 24))
{
    std::cout << "Host is in network\n";
}
```

---

### Network enumeration

```cpp
void enumerateNetwork(const IpAddress& network, int prefix)
{
    IpAddress mask(prefix, AF_INET);
    IpAddress base = network & mask;

    // First host
    IpAddress firstHost = base;
    firstHost[3] = 1;

    // Last host
    IpAddress lastHost = base | ~mask;
    lastHost[3] -= 1;

    std::cout << "Network: " << base << "\n";
    std::cout << "First host: " << firstHost << "\n";
    std::cout << "Last host: " << lastHost << "\n";
    std::cout << "Broadcast: " << (base | ~mask) << "\n";
}
```

---

### IP range validation

```cpp
bool isInRange(const IpAddress& ip, const IpAddress& start, const IpAddress& end)
{
    return (start <= ip) && (ip <= end);
}

IpAddress ip("192.168.1.50");
IpAddress start("192.168.1.1");
IpAddress end("192.168.1.100");

if (isInRange(ip, start, end))
{
    std::cout << "IP is in range\n";
}
```

---

### Dual-stack handling

```cpp
IpAddress addr = getAddress();  // Could be v4 or v6

if (addr.isIpv4Address())
{
    // Handle IPv4
}
else if (addr.isIpv6Address())
{
    if (addr.isIpv4Mapped())
    {
        // IPv4-mapped IPv6 address
        IpAddress v4 = addr.toIpv4();
    }
    else
    {
        // Native IPv6
    }
}
```

---

## IPv6 specific features

### Scope identifiers

```cpp
// Link-local with interface name
IpAddress addr("fe80::1%eth0");
uint32_t scope = addr.scope();

// Link-local with numeric scope
IpAddress addr2("fe80::1%2");
```

### IPv4 compatibility checks

```cpp
IpAddress addr("::192.168.1.1");

if (addr.isIpv4Compat())
{
    // IPv4-compatible (deprecated)
}

IpAddress mapped("::ffff:192.168.1.1");

if (mapped.isIpv4Mapped())
{
    // IPv4-mapped IPv6 address
    IpAddress v4 = mapped.toIpv4();
}
```

---

## Best practices

* **Use dual-stack** — design code to handle both IPv4 and IPv6
* **Validate input** — use `isIpAddress()` before constructing from strings
* **Prefer IPv6** — default to IPv6 when possible for future compatibility
* **Check address types** — use `isLoopBack()`, `isLinkLocal()`, etc. for routing decisions
* **Handle exceptions** — invalid addresses throw `std::invalid_argument`
* **Use constants** — prefer `ipv4Wildcard` over string literals

---

## Error handling

```cpp
try
{
    IpAddress addr("invalid");
}
catch (const std::invalid_argument& e)
{
    std::cerr << "Invalid IP address: " << e.what() << "\n";
}

// Safe validation
if (IpAddress::isIpAddress(userInput))
{
    IpAddress addr(userInput);
}
```

---

## Summary

| Feature                    | Supported |
| -------------------------- | --------- |
| IPv4 addresses             | ✅         |
| IPv6 addresses             | ✅         |
| Scope identifiers          | ✅         |
| Auto-detection             | ✅         |
| Type checking              | ✅         |
| Bitwise operations         | ✅         |
| IPv4 ↔ IPv6 conversion     | ✅         |
| ARPA format                | ✅         |
| Netmask/prefix conversion  | ✅         |
| Interface address lookup   | ✅         |
| Comparison operators       | ✅         |
