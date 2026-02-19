---

title: "Interface"
weight: 20
---

# Interface

The **Interface** class provides a high-level abstraction for managing network interfaces in Join. It offers methods to configure IP addresses, routes, MTU, MAC addresses, and bridge membership through a clean C++ API.

Interfaces are managed by `InterfaceManager` and are represented as shared pointers. They provide both synchronous and asynchronous operations for network configuration.

---

## Creating interfaces

Interfaces cannot be created directly. Use `InterfaceManager` to find or create them.

```cpp
#include <join/interface.hpp>

using join;

auto manager = InterfaceManager::instance();
Interface::Ptr eth0 = manager->findByName("eth0");
```

---

## Interface properties

### Get interface index

```cpp
uint32_t idx = eth0->index();
```

### Get interface name

```cpp
const std::string& name = eth0->name();
```

### Get interface kind

Returns the interface type (e.g., "dummy", "bridge", "vlan", "veth", "gre", "tun").

```cpp
const std::string& kind = eth0->kind();
```

### Get master interface

Returns the bridge index if the interface is attached to a bridge, or 0 otherwise.

```cpp
uint32_t master = eth0->master();
```

---

## MTU configuration

### Set MTU

```cpp
// Asynchronous (non-blocking)
eth0->mtu(1500);

// Synchronous (wait for completion)
eth0->mtu(1500, true);
```

### Get MTU

```cpp
uint32_t mtu = eth0->mtu();
```

---

## MAC address configuration

### Set MAC address

```cpp
MacAddress mac("00:11:22:33:44:55");

// Asynchronous
eth0->mac(mac);

// Synchronous
eth0->mac(mac, true);
```

### Get MAC address

```cpp
const MacAddress& mac = eth0->mac();
```

---

## IP address management

### Address representation

Addresses are represented as tuples containing:
- IP address
- Prefix length
- Broadcast address (for IPv4)

```cpp
using Address = std::tuple<IpAddress, uint32_t, IpAddress>;
```

### Add IP address

```cpp
IpAddress ip("192.168.1.100");
IpAddress broadcast("192.168.1.255");

// Asynchronous
eth0->addAddress(ip, 24, broadcast);

// Synchronous
eth0->addAddress(ip, 24, broadcast, true);

// Using Address tuple
Interface::Address addr = std::make_tuple(ip, 24, broadcast);
eth0->addAddress(addr, true);
```

### Remove IP address

```cpp
// Asynchronous
eth0->removeAddress(ip, 24, broadcast);

// Synchronous
eth0->removeAddress(ip, 24, broadcast, true);

// Using Address tuple
eth0->removeAddress(addr, true);
```

### List IP addresses

```cpp
for (const auto& addr : eth0->addressList())
{
    const IpAddress& ip        = std::get<0>(addr);
    uint32_t prefix            = std::get<1>(addr);
    const IpAddress& broadcast = std::get<2>(addr);
    // Process address...
}
```

### Check for specific address

```cpp
if (eth0->hasAddress(IpAddress("192.168.1.100")))
{
    // Address is configured
}

if (eth0->hasLocalAddress())
{
    // Has link-local address
}
```

---

## Route management

### Route representation

Routes are represented as tuples containing:
- Destination network
- Prefix length
- Gateway address
- Metric

```cpp
using Route = std::tuple<IpAddress, uint32_t, IpAddress, uint32_t>;
```

### Add route

```cpp
IpAddress dest("10.0.0.0");
IpAddress gateway("192.168.1.1");
uint32_t metric = 100;

// Asynchronous
eth0->addRoute(dest, 8, gateway, metric);

// Synchronous
eth0->addRoute(dest, 8, gateway, metric, true);

// Using Route tuple
Interface::Route route = std::make_tuple(dest, 8, gateway, metric);
eth0->addRoute(route, true);
```

### Remove route

```cpp
// Asynchronous
eth0->removeRoute(dest, 8, gateway, metric);

// Synchronous
eth0->removeRoute(dest, 8, gateway, metric, true);

// Using Route tuple
eth0->removeRoute(route, true);
```

### List routes

```cpp
for (const auto& route : eth0->routeList())
{
    const IpAddress& dest    = std::get<0>(route);
    uint32_t prefix          = std::get<1>(route);
    const IpAddress& gateway = std::get<2>(route);
    uint32_t metric          = std::get<3>(route);
    // Process route...
}
```

### Check for specific route

```cpp
if (eth0->hasRoute(dest, 8, gateway, metric))
{
    // Route exists
}

if (eth0->hasRoute(route))
{
    // Route exists
}
```

---

## Bridge operations

### Add interface to bridge

```cpp
// By bridge index
eth0->addToBridge(10, true);

// By bridge name
eth0->addToBridge("br0", true);
```

### Remove interface from bridge

```cpp
eth0->removeFromBridge(true);
```

---

## Interface state

### Enable/disable interface

```cpp
// Enable (bring up)
eth0->enable(true, true);

// Disable (bring down)
eth0->enable(false, true);
```

### Get interface flags

```cpp
uint32_t flags = eth0->flags();
```

### Check interface state

```cpp
if (eth0->isEnabled())
{
    // Interface is administratively up
}

if (eth0->isRunning())
{
    // Interface has carrier/link
}
```

---

## Interface type checks

```cpp
if (eth0->isLoopback())
{
    // Loopback interface
}

if (eth0->isPointToPoint())
{
    // Point-to-point interface
}

if (eth0->isDummy())
{
    // Dummy interface
}

if (eth0->isBridge())
{
    // Bridge interface
}

if (eth0->isVlan())
{
    // VLAN interface
}

if (eth0->isVeth())
{
    // Virtual Ethernet interface
}

if (eth0->isGre())
{
    // GRE tunnel interface
}

if (eth0->isTun())
{
    // TUN/TAP interface
}
```

---

## Capability checks

```cpp
if (eth0->supportsBroadcast())
{
    // Supports broadcast
}

if (eth0->supportsMulticast())
{
    // Supports multicast
}

if (eth0->supportsIpv4())
{
    // Has IPv4 addresses configured
}

if (eth0->supportsIpv6())
{
    // Has IPv6 addresses configured
}
```

---

## Synchronous vs asynchronous operations

All configuration methods accept an optional `sync` parameter:

- **Asynchronous** (`sync = false`, default): Operations return immediately without waiting for completion
- **Synchronous** (`sync = true`): Operations block until the kernel confirms completion

```cpp
// Non-blocking (fast but no confirmation)
eth0->addAddress(ip, 24, broadcast);

// Blocking (wait for kernel acknowledgment)
if (eth0->addAddress(ip, 24, broadcast, true) == 0)
{
    // Address was successfully added
}
```

⚠️ Synchronous operations have a default timeout of 5 seconds.

---

## Return values

Configuration methods return:
- **0** on success
- **-1** on failure (check `lastError` for details)

```cpp
if (eth0->mtu(1500, true) == -1)
{
    // Operation failed
    std::cerr << "Failed to set MTU: " << lastError.message() << std::endl;
}
```

---

## Best practices

* Use **synchronous operations** for critical configuration where you need confirmation
* Use **asynchronous operations** for batch configurations to improve performance
* Always check return values when using synchronous mode
* Use `InterfaceManager` listeners to track interface changes
* Prefer the tuple-based methods when working with stored configurations

---

## Summary

| Feature                   | Supported |
| ------------------------- | --------- |
| IP address management     | ✅         |
| Route management          | ✅         |
| MTU configuration         | ✅         |
| MAC address change        | ✅         |
| Bridge membership         | ✅         |
| Interface enable/disable  | ✅         |
| IPv4 support              | ✅         |
| IPv6 support              | ✅         |
| Sync/async operations     | ✅         |
| Interface type checks     | ✅         |
