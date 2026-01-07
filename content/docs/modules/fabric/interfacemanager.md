---

title: "Interface Manager"
weight: 2
---

# InterfaceManager

The **InterfaceManager** provides centralized management of network interfaces in Join. It acts as a singleton that monitors system interfaces, handles creation and deletion, and notifies listeners of network changes through an event-driven architecture.

InterfaceManager is integrated with the Join reactor and automatically tracks all interface, address, and route changes via Linux Netlink.

---

## Getting the instance

InterfaceManager follows the singleton pattern. Always use the static `instance()` method.

```cpp
#include <join/interfacemanager.hpp>

using join;

auto manager = InterfaceManager::instance();
```

The first call to `instance()` automatically initializes the manager and refreshes all interface data.

---

## Finding interfaces

### Find by index

```cpp
Interface::Ptr eth0 = manager->findByIndex(2);
if (!eth0)
{
    // Interface not found
}
```

### Find by name

```cpp
Interface::Ptr eth0 = manager->findByName("eth0");
if (!eth0)
{
    // Interface not found
}
```

### Enumerate all interfaces

```cpp
for (const auto& iface : manager->enumerate())
{
    std::cout << iface->name() << " (" << iface->index() << ")" << std::endl;
}
```

---

## Creating interfaces

### Create dummy interface

Dummy interfaces are virtual interfaces used for testing or as placeholders.

```cpp
// Asynchronous
if (manager->createDummyInterface("dummy0") == 0)
{
    // Request sent successfully
}

// Synchronous
if (manager->createDummyInterface("dummy0", true) == 0)
{
    // Interface created
}
```

### Create bridge interface

Bridge interfaces connect multiple network segments at the data link layer.

```cpp
// Asynchronous
if (manager->createBridgeInterface("br0") == 0)
{
    // Request sent successfully
}

// Synchronous
if (manager->createBridgeInterface("br0", true) == 0)
{
    // Interface created
}
```

### Create VLAN interface

VLAN interfaces create virtual networks on top of physical interfaces.

```cpp
// By parent index
uint32_t parentIndex = 2;
uint16_t vlanId = 100;
uint16_t proto = ETH_P_8021Q; // 802.1Q (default)

manager->createVlanInterface("eth0.100", parentIndex, vlanId, proto, true);

// By parent name
manager->createVlanInterface("eth0.100", "eth0", vlanId, proto, true);
```

⚠️ VLAN IDs must be in the range 1-4094 (0 is reserved).

### Create virtual Ethernet pair (veth)

Veth pairs create two connected virtual interfaces, often used for containers.

```cpp
// Create pair in current namespace
manager->createVethInterface("veth0", "veth1", nullptr, true);

// Create with peer in different namespace
pid_t containerPid = 12345;
manager->createVethInterface("veth0", "veth1", &containerPid, true);
```

After creation, `veth0` remains in the current namespace while `veth1` moves to the target namespace.

### Create GRE tunnel

GRE tunnels encapsulate network layer protocols over IP.

```cpp
IpAddress local("192.168.1.1");
IpAddress remote("192.168.2.1");
uint32_t ikey = 1000; // Inbound key
uint32_t okey = 2000; // Outbound key
uint8_t ttl = 64;

// By parent index
manager->createGreInterface("gre0", 2, local, remote, &ikey, &okey, ttl, true);

// By parent name
manager->createGreInterface("gre0", "eth0", local, remote, &ikey, &okey, ttl, true);

// Without keys (optional)
manager->createGreInterface("gre0", "eth0", local, remote, nullptr, nullptr, ttl, true);
```

⚠️ Both local and remote addresses must be the same IP family (IPv4 or IPv6).

---

## Deleting interfaces

### Delete by index

```cpp
manager->removeInterface(10, true);
```

### Delete by name

```cpp
manager->removeInterface("dummy0", true);
```

⚠️ Physical interfaces cannot be deleted. Only virtual interfaces (dummy, bridge, VLAN, veth, GRE, etc.) can be removed.

---

## Refreshing interface data

Force a complete refresh of all interface, address, and route data.

```cpp
// Asynchronous
manager->refresh();

// Synchronous
if (manager->refresh(true) == 0)
{
    // All data refreshed
}
```

This dumps link, address, and route information from the kernel. Useful after external network configuration changes.

---

## Event notifications

InterfaceManager provides three types of event notifications through callback mechanisms.

### Change types

Network changes are flagged with these types:

```cpp
enum ChangeType {
    Added               = 1 << 0,  // Interface/address/route added
    Deleted             = 1 << 1,  // Interface/address/route deleted
    Modified            = 1 << 2,  // Interface/address/route modified
    AdminStateChanged   = 1 << 3,  // Interface up/down state
    OperStateChanged    = 1 << 4,  // Interface carrier state
    MacChanged          = 1 << 5,  // MAC address changed
    NameChanged         = 1 << 6,  // Interface renamed
    MtuChanged          = 1 << 7,  // MTU changed
    KindChanged         = 1 << 8,  // Interface type changed
    MasterChanged       = 1 << 9,  // Bridge membership changed
};
```

Change types can be combined using bitwise operators.

### Link notifications

Monitor interface creation, deletion, and property changes.

```cpp
manager->addLinkListener([](const LinkInfo& info) {
    Interface::Ptr iface = InterfaceManager::instance()->findByIndex(info.index);

    if (info.flags & ChangeType::Added)
    {
        std::cout << "Interface added: " << iface->name() << std::endl;
    }

    if (info.flags & ChangeType::Deleted)
    {
        std::cout << "Interface deleted: " << info.index << std::endl;
    }

    if (info.flags & ChangeType::AdminStateChanged)
    {
        std::cout << "Interface " << iface->name()
                  << (iface->isEnabled() ? " up" : " down")
                  << std::endl;
    }

    if (info.flags & ChangeType::MtuChanged)
    {
        std::cout << "MTU changed to " << iface->mtu() << std::endl;
    }
});
```

Remove a listener:

```cpp
auto listener = [](const LinkInfo& info) { /* ... */ };
manager->addLinkListener(listener);
// Later...
manager->removeLinkListener(listener);
```

### Address notifications

Monitor IP address additions, deletions, and modifications.

```cpp
manager->addAddressListener([](const AddressInfo& info) {
    Interface::Ptr iface = InterfaceManager::instance()->findByIndex(info.index);

    const IpAddress& ip = std::get<0>(info.address);
    uint32_t prefix     = std::get<1>(info.address);

    if (info.flags & ChangeType::Added)
    {
        std::cout << "Address added: " << ip.toString()
                  << "/" << prefix << " on " << iface->name()
                  << std::endl;
    }

    if (info.flags & ChangeType::Deleted)
    {
        std::cout << "Address removed: " << ip.toString()
                  << "/" << prefix
                  << std::endl;
    }
});
```

### Route notifications

Monitor routing table changes.

```cpp
manager->addRouteListener([](const RouteInfo& info) {
    Interface::Ptr iface = InterfaceManager::instance()->findByIndex(info.index);

    const IpAddress& dest = std::get<0>(info.route);
    uint32_t prefix = std::get<1>(info.route);
    const IpAddress& gateway = std::get<2>(info.route);
    uint32_t metric = std::get<3>(info.route);

    if (info.flags & ChangeType::Added)
    {
        std::cout << "Route added: " << dest.toString() << "/" << prefix;
        if (!gateway.isWildcard())
        {
            std::cout << " via " << gateway.toString();
        }
        std::cout << " on " << iface->name() << std::endl;
    }

    if (info.flags & ChangeType::Deleted)
    {
        std::cout << "Route deleted: "
                  << dest.toString()
                  << "/" << prefix
                  << std::endl;
    }
});
```

---

## Reactor integration

InterfaceManager automatically integrates with the Join reactor:

* Listens on Netlink socket for kernel notifications
* All callbacks execute in the reactor event loop
* No manual polling required

```text
Reactor
 ├─ Socket handlers
 ├─ Timer handlers
 └─ InterfaceManager (Netlink)
     ├─ Link events
     ├─ Address events
     └─ Route events
```

Callbacks are triggered automatically when the kernel reports changes.

---

## Information structures

### LinkInfo

```cpp
struct LinkInfo
{
    uint32_t index;      // Interface index
    ChangeType flags;    // What changed (bitmask)
};
```

### AddressInfo

```cpp
struct AddressInfo : public LinkInfo
{
    Interface::Address address;  // Changed address
};
```

### RouteInfo

```cpp
struct RouteInfo : public LinkInfo
{
    Interface::Route route;      // Changed route
};
```

---

## Return values

All methods return:
- **0** on success
- **-1** on failure (check `lastError` for details)

```cpp
if (manager->createDummyInterface("dummy0", true) == -1)
{
    std::cerr << "Failed: " << lastError.message() << std::endl;
}
```

---

## Thread safety

InterfaceManager is thread-safe:

* All public methods use internal locking
* Callbacks may be invoked from the reactor thread
* Keep callback logic short and non-blocking

---

## Best practices

* **Use synchronous mode** when you need immediate confirmation
* **Use asynchronous mode** for batch operations to avoid blocking
* **Register listeners early** to avoid missing events
* **Keep callbacks short** to avoid blocking the event loop
* **Don't call blocking operations** from within callbacks
* **Refresh** after external configuration tools modify interfaces
* **Check return values** for synchronous operations

---

## Example: Complete network setup

```cpp
#include <join/interfacemanager.hpp>

using join;

int main()
{
    auto manager = InterfaceManager::instance();

    // Create a bridge
    if (manager->createBridgeInterface("br0", true) != 0)
    {
        return -1;
    }

    Interface::Ptr bridge = manager->findByName("br0");

    // Configure bridge
    bridge->enable(true, true);
    bridge->mtu(1500, true);
    bridge->addAddress(IpAddress("192.168.100.1"), 24, IpAddress("192.168.100.255"), true);

    // Create and attach veth pair
    manager->createVethInterface("veth0", "veth1", nullptr, true);
    Interface::Ptr veth0 = manager->findByName("veth0");
    veth0->addToBridge("br0", true);
    veth0->enable(true, true);

    // Monitor changes
    manager->addLinkListener([](const LinkInfo& info)
    {
        if (info.flags & ChangeType::OperStateChanged)
        {
            auto iface = InterfaceManager::instance()->findByIndex(info.index);
            std::cout << iface->name() << " is "
                      << (iface->isRunning() ? "up" : "down")
                      << std::endl;
        }
    });

    // Run app

    return 0;
}
```

---

## Summary

| Feature                  | Supported |
| ------------------------ | --------- |
| Interface enumeration    | ✅         |
| Interface lookup         | ✅         |
| Dummy interfaces         | ✅         |
| Bridge interfaces        | ✅         |
| VLAN interfaces          | ✅         |
| Veth pairs               | ✅         |
| GRE tunnels              | ✅         |
| Interface deletion       | ✅         |
| Link notifications       | ✅         |
| Address notifications    | ✅         |
| Route notifications      | ✅         |
| Reactor integration      | ✅         |
| Thread-safe              | ✅         |
| Sync/async operations    | ✅         |

