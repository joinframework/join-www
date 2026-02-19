---

title: "Interface Manager"
weight: 30
---

# InterfaceManager

The **InterfaceManager** provides centralized management of network interfaces in Join. It monitors system interfaces, handles creation and deletion, and notifies listeners of network changes through an event-driven architecture.

InterfaceManager is integrated with the Join reactor and automatically tracks all interface, address, and route changes via Linux Netlink.

---

## Creating an instance

`InterfaceManager` is a regular class — not a singleton. Construct it directly.
By default it uses the global `ReactorThread` reactor, but a custom `Reactor*` can be passed:

```cpp
#include <join/interfacemanager.hpp>

using namespace join;

// default: uses ReactorThread::reactor()
InterfaceManager manager;

// custom reactor
Reactor myReactor;
InterfaceManager manager(&myReactor);
```

On construction, the manager opens a Netlink socket, subscribes to link, address, and route events, registers itself with the reactor, and performs an initial synchronous `refresh()`.

`InterfaceManager` is neither copyable nor movable.

---

## Finding interfaces

### Find by index

```cpp
Interface::Ptr eth0 = manager.findByIndex(2);
if (!eth0)
{
    // interface not found
}
```

### Find by name

```cpp
Interface::Ptr eth0 = manager.findByName("eth0");
if (!eth0)
{
    // interface not found
}
```

### Enumerate all interfaces

```cpp
for (const auto& iface : manager.enumerate())
{
    std::cout << iface->name() << " (" << iface->index() << ")\n";
}
```

---

## Creating interfaces

All creation methods default to **asynchronous** (`sync = false`).
Pass `true` to block until the kernel confirms the operation.

### Dummy interface

```cpp
// asynchronous (default)
manager.createDummyInterface("dummy0");

// synchronous
if (manager.createDummyInterface("dummy0", true) == -1)
{
    std::cerr << join::lastError.message() << "\n";
}
```

### Bridge interface

```cpp
manager.createBridgeInterface("br0", true);
```

### VLAN interface

```cpp
uint16_t vlanId = 100;

// by parent index
manager.createVlanInterface("eth0.100", 2, vlanId, ETH_P_8021Q, true);

// by parent name
manager.createVlanInterface("eth0.100", "eth0", vlanId, ETH_P_8021Q, true);
```

⚠️ VLAN IDs must be in the range 1–4094. ID 0 is reserved and will return `-1`.

### Virtual Ethernet pair (veth)

```cpp
// both ends in current namespace
manager.createVethInterface("veth0", "veth1", nullptr, true);

// peer moved to a different namespace
pid_t containerPid = 12345;
manager.createVethInterface("veth0", "veth1", &containerPid, true);
```

### GRE tunnel

```cpp
IpAddress local("192.168.1.1");
IpAddress remote("192.168.2.1");
uint32_t ikey = 1000;
uint32_t okey = 2000;

// by parent index, with keys
manager.createGreInterface("gre0", 2, local, remote, &ikey, &okey, 64, true);

// by parent name, without keys
manager.createGreInterface("gre0", "eth0", local, remote, nullptr, nullptr, 64, true);
```

⚠️ `localAddress` and `remoteAddress` must be the same IP family (both IPv4 or both IPv6).

---

## Deleting interfaces

```cpp
// by index
manager.removeInterface(10, true);

// by name
manager.removeInterface("dummy0", true);
```

---

## Refreshing interface data

`refresh()` dumps link, address, and route data from the kernel.
The default is **synchronous**:

```cpp
// synchronous (default)
if (manager.refresh() == -1)
{
    std::cerr << join::lastError.message() << "\n";
}

// asynchronous
manager.refresh(false);
```

---

## Event notifications

### ChangeType flags

```cpp
enum ChangeType
{
    Added               = 1 << 0,
    Deleted             = 1 << 1,
    Modified            = 1 << 2,
    AdminStateChanged   = 1 << 3,   // IFF_UP changed
    OperStateChanged    = 1 << 4,   // IFF_RUNNING changed
    MacChanged          = 1 << 5,
    NameChanged         = 1 << 6,
    MtuChanged          = 1 << 7,
    KindChanged         = 1 << 8,
    MasterChanged       = 1 << 9,   // bridge membership
};
```

Flags support all bitwise operators (`&`, `|`, `^`, `~`, `&=`, `|=`, `^=`).

### Link notifications

```cpp
manager.addLinkListener([&manager](const LinkInfo& info) {
    Interface::Ptr iface = manager.findByIndex(info.index);

    if (info.flags & ChangeType::Added)
    {
        std::cout << "Interface added: " << iface->name() << "\n";
    }

    if (info.flags & ChangeType::Deleted)
    {
        std::cout << "Interface deleted: index " << info.index << "\n";
    }

    if (info.flags & ChangeType::AdminStateChanged)
    {
        std::cout << iface->name()
                  << (iface->isEnabled() ? " up" : " down") << "\n";
    }
});
```

⚠️ `removeLinkListener` matches callbacks by function pointer identity. It works with named functions and stored `std::function` objects bound to the same target, but **not** with distinct lambda instances even if they have identical bodies.

### Address notifications

`AddressInfo::address` is a `tuple<IpAddress, uint32_t, IpAddress>`:

```cpp
manager.addAddressListener([&manager](const AddressInfo& info) {
    Interface::Ptr iface = manager.findByIndex(info.index);

    const IpAddress& ip        = std::get<0>(info.address);  // IP address
    uint32_t         prefix    = std::get<1>(info.address);  // prefix length
    const IpAddress& broadcast = std::get<2>(info.address);  // broadcast (IPv4)

    if (info.flags & ChangeType::Added)
    {
        std::cout << "Address added: " << ip.toString()
                  << "/" << prefix << " on " << iface->name() << "\n";
    }

    if (info.flags & ChangeType::Deleted)
    {
        std::cout << "Address removed: " << ip.toString() << "/" << prefix << "\n";
    }
});
```

### Route notifications

`RouteInfo::route` is a `tuple<IpAddress, uint32_t, IpAddress, uint32_t>`:

```cpp
manager.addRouteListener([&manager](const RouteInfo& info) {
    Interface::Ptr iface = manager.findByIndex(info.index);

    const IpAddress& dest    = std::get<0>(info.route);  // destination network
    uint32_t         prefix  = std::get<1>(info.route);  // prefix length
    const IpAddress& gateway = std::get<2>(info.route);  // gateway address
    uint32_t         metric  = std::get<3>(info.route);  // route metric

    if (info.flags & ChangeType::Added)
    {
        std::cout << "Route added: " << dest.toString() << "/" << prefix;
        if (!gateway.isWildcard())
            std::cout << " via " << gateway.toString();
        std::cout << " on " << iface->name() << "\n";
    }

    if (info.flags & ChangeType::Deleted)
    {
        std::cout << "Route deleted: " << dest.toString() << "/" << prefix << "\n";
    }
});
```

---

## Reactor integration

`InterfaceManager` inherits from `Netlink::Socket` which inherits from `EventHandler`.
It registers itself with the reactor in its constructor and unregisters in its destructor.
All listener callbacks are invoked from the reactor's dispatcher thread — keep them short and non-blocking.

### With a custom Reactor and ThreadPool

```cpp
Reactor reactor;
InterfaceManager manager(&reactor);

ThreadPool pool;
pool.push([&reactor]() {
    Thread::affinity(pthread_self(), 1);
    Thread::priority(pthread_self(), 50);
    reactor.run();
});

// ... application runs ...

reactor.stop();
```

---

## Information structures

### LinkInfo

```cpp
struct LinkInfo
{
    uint32_t   index;   // interface index
    ChangeType flags;   // what changed (bitmask)
};
```

### AddressInfo

```cpp
struct AddressInfo : public LinkInfo
{
    Interface::Address address;  // tuple<IpAddress, uint32_t, IpAddress>
                                 //        ip         prefix   broadcast
};
```

### RouteInfo

```cpp
struct RouteInfo : public LinkInfo
{
    Interface::Route route;  // tuple<IpAddress, uint32_t, IpAddress, uint32_t>
                             //        dest       prefix   gateway    metric
};
```

---

## Error handling

Methods return `0` on success, `-1` on failure. Check `join::lastError` for details:

```cpp
if (manager.createDummyInterface("dummy0", true) == -1)
{
    std::cerr << "Failed: " << join::lastError.message() << "\n";
}
```

Synchronous operations time out after 5 seconds and set `Errc::TimedOut`.

---

## Best practices

* **Use synchronous mode** when you need confirmation before proceeding
* **Use asynchronous mode** for fire-and-forget batch operations
* **Register listeners before doing anything else** to avoid missing early events
* **Keep callbacks short and non-blocking** — they run on the reactor dispatcher thread
* **Call `refresh()`** after external tools (e.g. `ip`, `ifconfig`) modify interfaces
* **Check return values** for all synchronous operations
* **Store named callbacks** if you need to call `removeLinkListener` — lambdas cannot be matched by identity

---

## Summary

| Feature                  | Supported |
| ------------------------ | :-------: |
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
| Custom Reactor           | ✅         |
| Sync/async operations    | ✅         |
