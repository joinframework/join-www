---

title: "Interface"
weight: 10
---

# Interface

The **Interface** class provides a high-level abstraction for managing network interfaces in Join. It offers methods to configure IP addresses, MTU, MAC addresses, and bridge membership through a clean C++ API.

Interfaces are managed by `InterfaceManager` and are represented as shared pointers. They provide both synchronous and asynchronous operations for network configuration.

---

## Creating interfaces

Interfaces cannot be created directly. Use `InterfaceManager` to find or create them.

```cpp
#include <join/interface.hpp>

using namespace join;

InterfaceManager& manager = InterfaceManager::instance();
Interface::Ptr eth0 = manager.findByName("eth0");
```

---

## Interface properties

### Get interface index

```cpp
uint32_t idx = eth0->index();
```

### Get interface name

```cpp
std::string name = eth0->name();
```

### Get interface kind

Returns the interface type (e.g., `"dummy"`, `"bridge"`, `"vlan"`, `"veth"`, `"gre"`, `"tun"`).

```cpp
std::string kind = eth0->kind();
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
MacAddress mac = eth0->mac();
```

---

## IP address management

### Address representation

Addresses are represented as a struct containing:

```cpp
struct Address
{
    IpAddress ip;        // IP address
    uint32_t prefix = 0; // prefix length
    IpAddress broadcast; // broadcast address (IPv4)
};
```

### Add IP address

```cpp
IpAddress ip("192.168.1.100");
IpAddress broadcast("192.168.1.255");

// Asynchronous
eth0->addAddress(ip, 24, broadcast);

// Synchronous
eth0->addAddress(ip, 24, broadcast, true);

// Using Address struct
Interface::Address addr;
addr.ip        = ip;
addr.prefix    = 24;
addr.broadcast = broadcast;

eth0->addAddress(addr, true);
```

### Remove IP address

```cpp
// Asynchronous
eth0->removeAddress(ip, 24, broadcast);

// Synchronous
eth0->removeAddress(ip, 24, broadcast, true);

// Using Address struct
eth0->removeAddress(addr, true);
```

### List IP addresses

```cpp
for (const auto& addr : eth0->addressList())
{
    addr.ip;        // IpAddress
    addr.prefix;    // uint32_t
    addr.broadcast; // IpAddress (IPv4 broadcast)
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
if (eth0->isLoopback())     { /* Loopback interface */ }
if (eth0->isPointToPoint()) { /* Point-to-point interface */ }
if (eth0->isDummy())        { /* Dummy interface */ }
if (eth0->isBridge())       { /* Bridge interface */ }
if (eth0->isVlan())         { /* VLAN interface */ }
if (eth0->isVeth())         { /* Virtual Ethernet interface */ }
if (eth0->isGre())          { /* GRE tunnel interface (gre or ip6gre) */ }
if (eth0->isTun())          { /* TUN/TAP interface */ }
```

---

## Capability checks

```cpp
if (eth0->supportsBroadcast())  { /* Supports broadcast */ }
if (eth0->supportsMulticast())  { /* Supports multicast */ }
if (eth0->supportsIpv4())       { /* Has IPv4 addresses configured */ }
if (eth0->supportsIpv6())       { /* Has IPv6 addresses configured */ }
```

---

## Synchronous vs asynchronous operations

All configuration methods accept an optional `sync` parameter:

- **Asynchronous** (`sync = false`, default): returns immediately without waiting for kernel confirmation.
- **Synchronous** (`sync = true`): blocks until the kernel acknowledges the operation.

```cpp
// Non-blocking
eth0->addAddress(ip, 24, broadcast);

// Blocking — check return value
if (eth0->addAddress(ip, 24, broadcast, true) == -1)
{
    std::cerr << "Failed: " << lastError.message() << "\n";
}
```

⚠️ Synchronous operations time out after 5 seconds.

---

## Return values

Configuration methods return:
- **0** on success
- **-1** on failure (check `lastError` for details)

```cpp
if (eth0->mtu(1500, true) == -1)
{
    std::cerr << "Failed to set MTU: " << lastError.message() << "\n";
}
```

---

## Best practices

- Use **synchronous** mode when confirmation is required before proceeding.
- Use **asynchronous** mode for fire-and-forget batch operations.
- Always check return values in synchronous mode.
- Use `InterfaceManager` listeners to react to interface changes.

---

## Summary

| Feature                  | Supported |
| ------------------------ | :-------: |
| IP address management    | ✅        |
| MTU configuration        | ✅        |
| MAC address change       | ✅        |
| Bridge membership        | ✅        |
| Interface enable/disable | ✅        |
| IPv4 support             | ✅        |
| IPv6 support             | ✅        |
| Sync/async operations    | ✅        |
| Interface type checks    | ✅        |
