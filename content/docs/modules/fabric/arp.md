---

title: "ARP"
weight: 3
---

# ARP

Join provides an **ARP (Address Resolution Protocol)** implementation for discovering MAC addresses from IP addresses.
The ARP class handles both ARP cache lookups and active ARP requests on local networks.

ARP features:

* **cache queries** — fast lookups from kernel ARP table
* **active requests** — broadcast ARP queries when needed
* **cache management** — add static entries
* **automatic fallback** — tries cache first, then requests

The ARP class is useful for:

* Network discovery
* MAC address resolution
* Low‑level networking tools
* Custom protocol implementations

---

## Creating an ARP instance

```cpp
#include <join/arp.hpp>

using join;

Arp arp("eth0");
```

The ARP instance is bound to a specific network interface.

---

## Resolving MAC addresses

### Automatic resolution

The `get()` method tries the ARP cache first, then sends an ARP request if needed.

```cpp
IpAddress target("192.168.1.100");
MacAddress mac = arp.get(target);

if (!mac.isWildcard()) {
    std::cout << "MAC: " << mac.toString() << std::endl;
} else {
    std::cerr << "Failed to resolve MAC address" << std::endl;
}
```

This is the recommended method for most use cases.

### Static method

```cpp
MacAddress mac = Arp::get(IpAddress("192.168.1.100"), "eth0");
```

---

## ARP requests

### Sending ARP requests

Broadcast an ARP request to actively discover the MAC address.

```cpp
IpAddress target("192.168.1.100");
MacAddress mac = arp.request(target);

if (!mac.isWildcard()) {
    std::cout << "Discovered: " << mac.toString() << std::endl;
}
```

The request:
* Broadcasts an ARP packet on the network
* Waits up to **1 second** for a reply
* Filters incoming packets to find the matching response

### Static method

```cpp
MacAddress mac = Arp::request(IpAddress("192.168.1.100"), "eth0");
```

---

## ARP cache queries

### Querying the cache

Look up an entry in the kernel's ARP cache without sending requests.

```cpp
IpAddress target("192.168.1.100");
MacAddress mac = arp.cache(target);

if (!mac.isWildcard()) {
    std::cout << "Cached: " << mac.toString() << std::endl;
} else if (lastError == Errc::NotFound) {
    std::cout << "No cache entry" << std::endl;
}
```

This is **fast** but only returns existing cache entries.

### Static method

```cpp
MacAddress mac = Arp::cache(IpAddress("192.168.1.100"), "eth0");
```

---

## Adding cache entries

### Adding static entries

Manually add entries to the ARP cache.

```cpp
MacAddress mac("00:11:22:33:44:55");
IpAddress ip("192.168.1.100");

if (arp.add(mac, ip) == 0) {
    std::cout << "Entry added" << std::endl;
}
```

Added entries are:
* **Permanent** (`ATF_PERM` flag)
* **Complete** (`ATF_COM` flag)
* Persist until system reboot or manual removal

### Static method

```cpp
Arp::add(
    MacAddress("00:11:22:33:44:55"),
    IpAddress("192.168.1.100"),
    "eth0"
);
```

---

## Special cases

### Local interface

Querying the local IP returns the local MAC address directly.

```cpp
// Returns local MAC address without ARP
MacAddress localMac = arp.get(IpAddress::ipv4Address("eth0"));
```

### Broadcast address

```cpp
// Returns broadcast MAC address
MacAddress broadcast = MacAddress::broadcast;  // ff:ff:ff:ff:ff:ff
```

---

## Error handling

ARP methods set the global `lastError` on failure.

```cpp
MacAddress mac = arp.request(ip);

if (mac.isWildcard()) {
    if (lastError == std::errc::no_such_device_or_address) {
        std::cerr << "No ARP reply (host down or filtered)" << std::endl;
    } else if (lastError == Errc::InvalidParam) {
        std::cerr << "Invalid IP address (must be IPv4)" << std::endl;
    } else {
        std::cerr << "ARP error: " << lastError.message() << std::endl;
    }
}
```

Common error codes:
* `std::errc::no_such_device_or_address` — no ARP reply received
* `Errc::InvalidParam` — IP address is not IPv4
* `Errc::NotFound` — no cache entry (cache queries only)
* `Errc::OutOfMemory` — memory allocation failed

---

## Usage examples

### Network scanner

```cpp
#include <join/arp.hpp>
#include <iostream>

using join;

void scanSubnet(const std::string& interface) {
    Arp arp(interface);
    IpAddress base("192.168.1.0");
    
    for (int i = 1; i < 255; ++i) {
        IpAddress target = base + i;
        MacAddress mac = arp.request(target);
        
        if (!mac.isWildcard()) {
            std::cout << target.toString() << " -> " 
                      << mac.toString() << std::endl;
        }
    }
}
```

### MAC address lookup tool

```cpp
#include <join/arp.hpp>
#include <iostream>

using join;

int main(int argc, char* argv[]) {
    if (argc != 3) {
        std::cerr << "Usage: " << argv[0] 
                  << " <interface> <ip>" << std::endl;
        return 1;
    }
    
    std::string interface = argv[1];
    IpAddress target(argv[2]);
    
    // Try cache first
    MacAddress mac = Arp::cache(target, interface);
    
    if (!mac.isWildcard()) {
        std::cout << "Cached: " << mac.toString() << std::endl;
        return 0;
    }
    
    // Send request
    mac = Arp::request(target, interface);
    
    if (!mac.isWildcard()) {
        std::cout << "Resolved: " << mac.toString() << std::endl;
        return 0;
    }
    
    std::cerr << "Failed: " << lastError.message() << std::endl;
    return 1;
}
```

### ARP cache viewer

```cpp
#include <join/arp.hpp>
#include <fstream>
#include <sstream>
#include <iostream>

using join;

void showArpCache(const std::string& interface) {
    // Read /proc/net/arp
    std::ifstream arp("/proc/net/arp");
    std::string line;
    
    std::getline(arp, line);  // Skip header
    
    while (std::getline(arp, line)) {
        std::istringstream iss(line);
        std::string ip, hwtype, flags, hwaddr, mask, dev;
        
        iss >> ip >> hwtype >> flags >> hwaddr >> mask >> dev;
        
        if (dev == interface && flags != "0x0") {
            std::cout << ip << " -> " << hwaddr << std::endl;
        }
    }
}
```

### Adding static ARP entries

```cpp
#include <join/arp.hpp>
#include <iostream>

using join;

void addStaticEntry() {
    MacAddress mac("00:11:22:33:44:55");
    IpAddress ip("192.168.1.100");
    
    if (Arp::add(mac, ip, "eth0") == 0) {
        std::cout << "Static entry added successfully" << std::endl;
    } else {
        std::cerr << "Failed to add entry: " 
                  << lastError.message() << std::endl;
    }
}
```

---

## Protocol details

### ARP packet structure

The implementation uses raw sockets to construct and parse ARP packets:

```
Ethernet Header (14 bytes):
  - Destination MAC (6 bytes)
  - Source MAC (6 bytes)
  - EtherType (2 bytes) = 0x0806 (ARP)

ARP Packet (28 bytes):
  - Hardware Type (2 bytes) = 1 (Ethernet)
  - Protocol Type (2 bytes) = 0x0800 (IPv4)
  - Hardware Size (1 byte) = 6
  - Protocol Size (1 byte) = 4
  - Opcode (2 bytes) = 1 (request) or 2 (reply)
  - Sender MAC (6 bytes)
  - Sender IP (4 bytes)
  - Target MAC (6 bytes)
  - Target IP (4 bytes)
```

### Packet filtering

ARP requests use a Berkeley Packet Filter (BPF) to receive only ARP packets:

```cpp
// Equivalent to: tcpdump -dd arp
struct sock_filter code[] = {
    { 0x28, 0, 0, 0x0000000c },  // Load EtherType
    { 0x15, 0, 1, 0x00000806 },  // Check if ARP
    { 0x6,  0, 0, 0x00040000 },  // Accept
    { 0x6,  0, 0, 0x00000000 },  // Reject
};
```

---

## Requirements

⚠️ **ARP operations require appropriate permissions:**

* **Cache queries** — no special permissions needed
* **ARP requests** — requires `CAP_NET_RAW` capability or root
* **Adding entries** — requires `CAP_NET_ADMIN` capability or root

### Granting capabilities

```bash
# Allow binary to send ARP requests
sudo setcap cap_net_raw+ep ./your_program

# Allow binary to modify ARP cache
sudo setcap cap_net_admin+ep ./your_program

# Both capabilities
sudo setcap cap_net_raw,cap_net_admin+ep ./your_program
```

---

## Limitations

* **IPv4 only** — ARP is an IPv4 protocol (IPv6 uses NDP)
* **Local network** — only works on the same broadcast domain
* **Timeout** — requests timeout after 1 second
* **No retries** — failed requests are not automatically retried
* **Broadcast domain** — cannot resolve addresses across routers

For IPv6, use **Neighbor Discovery Protocol (NDP)** instead.

---

## Best practices

* Use `get()` for general resolution (tries cache first)
* Use `cache()` for non‑intrusive lookups
* Use `request()` when you need fresh data
* Check return values with `isWildcard()` for validity
* Handle `lastError` appropriately
* Run with appropriate permissions for active requests
* Consider caching results to reduce network traffic
* Set static entries for critical infrastructure hosts
* Be aware of ARP spoofing in untrusted networks

---

## Security considerations

* **ARP spoofing** — ARP has no authentication
* **Cache poisoning** — malicious responses can be injected
* **MAC flooding** — excessive requests can impact switches
* **Privacy** — ARP requests reveal network scanning activity

For security‑sensitive applications:
* Validate responses against known good entries
* Use static ARP entries for critical hosts
* Monitor for ARP anomalies
* Consider encrypted protocols at higher layers

---

## Summary

| Feature              | Supported |
| -------------------- | --------- |
| Cache queries        | ✅         |
| ARP requests         | ✅         |
| Adding cache entries | ✅         |
| IPv4 support         | ✅         |
| IPv6 support         | ❌         |
| Automatic fallback   | ✅         |
| Packet filtering     | ✅         |
| Static methods       | ✅         |

| Method      | Cache Lookup | Network Request | Use Case                  |
| ----------- | ------------ | --------------- | ------------------------- |
| `get()`     | ✅            | ✅ (fallback)    | General MAC resolution    |
| `cache()`   | ✅            | ❌               | Fast, non‑intrusive query |
| `request()` | ❌            | ✅               | Fresh data required       |
| `add()`     | N/A          | N/A             | Static entry management   |
