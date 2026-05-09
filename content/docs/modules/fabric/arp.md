---

title: "ARP"
weight: 10
---

# ARP

Join provides an **ARP (Address Resolution Protocol)** implementation for discovering MAC addresses from IPv4 addresses on local networks.

The `Arp` class handles:

- **cache queries** — fast lookups via `NeighborManager`
- **active requests** — broadcast ARP queries when the cache has no valid entry
- **cache management** — add and remove static entries via `NeighborManager`
- **automatic fallback** — tries the neighbor cache first, then sends a request

⚠️ ARP is an **IPv4-only** protocol. For IPv6 use `NeighborManager` directly (NDP is handled by the kernel).

---

## Creating an ARP instance

```cpp
#include <join/arp.hpp>

using namespace join;

// Uses NeighborManager::instance() internally
Arp arp("eth0");

// Inject a custom NeighborManager
NeighborManager myManager;
Arp arp("eth0", &myManager);
```

The instance is bound to a specific network interface. It shares the reactor of the injected (or singleton) `NeighborManager`.

`Arp` is neither copyable nor movable.

---

## Resolving MAC addresses

### Automatic resolution (recommended)

`get()` checks the neighbor cache first. If no valid entry is found (`NUD_VALID`), it sends an ARP request:

```cpp
IpAddress target("192.168.1.100");
MacAddress mac = arp.get(target);

if (!mac.isWildcard())
{
    std::cout << "MAC: " << mac.toString() << "\n";
}
else
{
    std::cerr << "Failed: " << lastError.message() << "\n";
}
```

With a custom timeout:

```cpp
MacAddress mac = arp.get(target, std::chrono::milliseconds(500));
```

### Static method

```cpp
MacAddress mac = Arp::get("eth0", IpAddress("192.168.1.100"));

// Custom timeout
MacAddress mac = Arp::get("eth0", IpAddress("192.168.1.100"),
                           std::chrono::milliseconds(500));
```

---

## ARP requests

`request()` always sends a broadcast ARP packet on the wire, regardless of the cache:

```cpp
IpAddress target("192.168.1.100");
MacAddress mac = arp.request(target);

if (!mac.isWildcard())
{
    std::cout << "Discovered: " << mac.toString() << "\n";
}
```

With a custom timeout:

```cpp
MacAddress mac = arp.request(target, std::chrono::milliseconds(200));
```

### Static method

```cpp
MacAddress mac = Arp::request("eth0", IpAddress("192.168.1.100"));

MacAddress mac = Arp::request("eth0", IpAddress("192.168.1.100"),
                               std::chrono::milliseconds(200));
```

The default timeout is **5 seconds**.

The method:
- Opens a raw socket on the interface
- Attaches a BPF filter to accept only ARP replies
- Broadcasts an ARP request packet
- Blocks until a matching reply arrives or the timeout expires
- Closes the socket on return

---

## Neighbor cache queries

`cache()` looks up an entry in `NeighborManager` without sending any packet. Only entries in a valid NUD state (`NUD_REACHABLE`, `NUD_PERMANENT`, `NUD_STALE`, `NUD_DELAY`, `NUD_PROBE`, `NUD_NOARP`) are returned:

```cpp
IpAddress target("192.168.1.100");
MacAddress mac = arp.cache(target);

if (!mac.isWildcard())
{
    std::cout << "Cached: " << mac.toString() << "\n";
}
else
{
    std::cerr << "No valid cache entry\n";
}
```

### Static method

```cpp
MacAddress mac = Arp::cache("eth0", IpAddress("192.168.1.100"));
```

---

## Managing cache entries

### Add a static entry

Adds a permanent neighbor entry via `NeighborManager` (`NUD_PERMANENT`):

```cpp
MacAddress mac("00:11:22:33:44:55");
IpAddress  ip("192.168.1.100");

if (arp.add(mac, ip) == -1)
{
    std::cerr << "Failed: " << lastError.message() << "\n";
}
```

### Static method

```cpp
Arp::add("eth0", MacAddress("00:11:22:33:44:55"), IpAddress("192.168.1.100"));
```

### Remove an entry

Removes an entry from the neighbor cache via `NeighborManager`:

```cpp
if (arp.remove(IpAddress("192.168.1.100")) == -1)
{
    std::cerr << "Failed: " << lastError.message() << "\n";
}
```

### Static method

```cpp
Arp::remove("eth0", IpAddress("192.168.1.100"));
```

---

## Special cases

### Local interface address

Querying the local IP returns the local MAC directly without any ARP:

```cpp
// Returns local MAC immediately
MacAddress localMac = arp.get(IpAddress::ipv4Address("eth0"));
```

---

## Error handling

All methods return a wildcard `MacAddress` (or `-1` for `add`/`remove`) on failure. Check `lastError`:

```cpp
MacAddress mac = arp.request(target);
if (mac.isWildcard())
{
    if (lastError == std::errc::no_such_device_or_address)
        std::cerr << "No ARP reply received (host down or filtered)\n";
    else if (lastError == Errc::InvalidParam)
        std::cerr << "IPv4 address required\n";
    else
        std::cerr << "Error: " << lastError.message() << "\n";
}
```

Common error codes:

| Code | Cause |
|------|-------|
| `std::errc::no_such_device_or_address` | No ARP reply, timeout, or no valid cache entry |
| `Errc::InvalidParam` | Address is not IPv4 |
| `Errc::TimedOut` | Request timed out |

---

## Permissions

| Operation | Required capability |
| --------- | ------------------- |
| Cache query (`cache()`) | None |
| ARP request (`request()`) | `CAP_NET_RAW` |
| Add/remove entry (`add()`, `remove()`) | `CAP_NET_ADMIN` |

```bash
# Grant both capabilities
sudo setcap cap_net_raw,cap_net_admin+ep ./your_program
```

---

## Protocol details

### ARP packet structure

```
Ethernet Header (14 bytes):
  Destination MAC  6 bytes  (ff:ff:ff:ff:ff:ff for requests)
  Source MAC       6 bytes
  EtherType        2 bytes  (0x0806)

ARP Payload (28 bytes):
  Hardware Type    2 bytes  (1 = Ethernet)
  Protocol Type    2 bytes  (0x0800 = IPv4)
  Hardware Size    1 byte   (6)
  Protocol Size    1 byte   (4)
  Opcode           2 bytes  (1 = request, 2 = reply)
  Sender MAC       6 bytes
  Sender IP        4 bytes
  Target MAC       6 bytes  (00:00:00:00:00:00 for requests)
  Target IP        4 bytes
```

### BPF filter

Incoming packets are filtered to accept only ARP replies:

```cpp
struct sock_filter code[] = {
    { 0x28, 0, 0, 0x0000000c },  // Load EtherType
    { 0x15, 0, 3, 0x00000806 },  // Jump if not ARP
    { 0x28, 0, 0, 0x00000014 },  // Load ARP opcode
    { 0x15, 0, 1, 0x00000002 },  // Jump if not reply
    { 0x6,  0, 0, 0x00040000 },  // Accept
    { 0x6,  0, 0, 0x00000000 },  // Reject
};
```

---

## Best practices

- Use `get()` for general MAC resolution — it avoids unnecessary network traffic.
- Use `cache()` when you need a non-intrusive lookup and a stale result is acceptable.
- Use `request()` only when you need fresh data unconditionally.
- Add static entries with `add()` for critical infrastructure hosts to avoid resolution delays.
- Remove stale static entries with `remove()` when decommissioning hosts.
- Keep ARP timeouts short in time-sensitive paths.

---

## Limitations

- **IPv4 only** — use `NeighborManager` for IPv6 NDP entries.
- **Local network only** — cannot resolve addresses across routers.
- **No retries** — a single request is sent; retry logic must be implemented by the caller.

---

## Summary

| Method      | Cache lookup | Network request | Notes                        |
| ----------- | :----------: | :-------------: | ---------------------------- |
| `get()`     | ✅           | ✅ (fallback)   | Recommended for general use  |
| `cache()`   | ✅           | ❌              | Fast, no network traffic     |
| `request()` | ❌           | ✅              | Always sends a packet        |
| `add()`     | —            | —               | Adds permanent static entry  |
| `remove()`  | —            | —               | Removes entry from cache     |

| Feature              | Supported |
| -------------------- | :-------: |
| Cache queries        | ✅        |
| ARP requests         | ✅        |
| Add cache entries    | ✅        |
| Remove cache entries | ✅        |
| Custom timeout       | ✅        |
| Custom NeighborManager | ✅      |
| Static methods       | ✅        |
| IPv4 support         | ✅        |
| IPv6 support         | ❌        |
