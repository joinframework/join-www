---

title: "Interface Manager"
weight: 30
---

# InterfaceManager

The **InterfaceManager** provides centralized management of network interfaces in Join. It monitors system interfaces, handles creation and deletion, and notifies listeners of network changes through an event-driven architecture.

`InterfaceManager` is integrated with the Join reactor and automatically tracks interface and address changes via Linux Netlink. Route management is handled separately by `RouteManager`.

---

## Getting an instance

`InterfaceManager` is a singleton. Use `instance()` for normal usage.
A custom `Reactor*` can be injected by constructing directly:

```cpp
#include <join/interfacemanager.hpp>

using namespace join;

// Normal usage — singleton
InterfaceManager& manager = InterfaceManager::instance();

// Custom reactor
Reactor myReactor;
InterfaceManager manager(&myReactor);
```

On construction the manager opens a Netlink socket, subscribes to link and address events, registers itself with the reactor, and performs an initial synchronous `refresh()`.

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
// Asynchronous (default)
manager.createDummyInterface("dummy0");

// Synchronous
if (manager.createDummyInterface("dummy0", true) == -1)
{
    std::cerr << lastError.message() << "\n";
}
```

### Bridge interface

```cpp
manager.createBridgeInterface("br0", true);
```

### VLAN interface

```cpp
uint16_t vlanId = 100;

// By parent index
manager.createVlanInterface("eth0.100", 2, vlanId, ETH_P_8021Q, true);

// By parent name
manager.createVlanInterface("eth0.100", "eth0", vlanId, ETH_P_8021Q, true);
```

⚠️ VLAN IDs must be in the range 1–4094. ID 0 is reserved and returns `-1`.

### Virtual Ethernet pair (veth)

```cpp
// Both ends in current namespace
manager.createVethInterface("veth0", "veth1", nullptr, true);

// Peer moved to a different namespace
pid_t containerPid = 12345;
manager.createVethInterface("veth0", "veth1", &containerPid, true);
```

### GRE tunnel

```cpp
IpAddress local("192.168.1.1");
IpAddress remote("192.168.2.1");
uint32_t ikey = 1000;
uint32_t okey = 2000;

// By parent index, with keys
manager.createGreInterface("gre0", 2, local, remote, &ikey, &okey, 64, true);

// By parent name, without keys
manager.createGreInterface("gre0", "eth0", local, remote, nullptr, nullptr, 64, true);
```

⚠️ `localAddress` and `remoteAddress` must be the same IP family (both IPv4 or both IPv6).

---

## Deleting interfaces

```cpp
// By index
manager.removeInterface(10, true);

// By name
manager.removeInterface("dummy0", true);
```

---

## Refreshing interface data

`refresh()` clears the cache and re-dumps link and address data from the kernel synchronously:

```cpp
if (manager.refresh() == -1)
{
    std::cerr << lastError.message() << "\n";
}
```

---

## Event notifications

### InterfaceChangeType flags

```cpp
enum class InterfaceChangeType : uint32_t
{
    Added              = 1 << 0,  // interface did not exist before
    Deleted            = 1 << 1,  // interface was removed
    Modified           = 1 << 2,  // interface was updated
    AdminStateChanged  = 1 << 3,  // IFF_UP changed
    OperStateChanged   = 1 << 4,  // IFF_RUNNING changed
    MacChanged         = 1 << 5,
    NameChanged        = 1 << 6,
    MtuChanged         = 1 << 7,
    KindChanged        = 1 << 8,
    MasterChanged      = 1 << 9,  // bridge membership changed
};
```

Flags support all bitwise operators (`&`, `|`, `^`, `~`, `&=`, `|=`, `^=`).

### Link notifications

`addLinkListener` returns a unique `uint64_t` id used to unregister later:

```cpp
uint64_t id = manager.addLinkListener([](const LinkInfo& info) {
    if (info.flags & InterfaceChangeType::Added)
    {
        std::cout << "Interface added: " << info.interface->name() << "\n";
    }

    if (info.flags & InterfaceChangeType::Deleted)
    {
        std::cout << "Interface deleted\n";
    }

    if (info.flags & InterfaceChangeType::AdminStateChanged)
    {
        std::cout << info.interface->name()
                  << (info.interface->isEnabled() ? " up" : " down") << "\n";
    }
});

// Unregister
manager.removeLinkListener(id);
```

### Address notifications

```cpp
uint64_t id = manager.addAddressListener([](const AddressInfo& info) {
    if (info.flags & InterfaceChangeType::Added)
    {
        std::cout << "Address added: "
                  << info.address.ip.toString()
                  << "/" << info.address.prefix
                  << " on " << info.interface->name() << "\n";
    }

    if (info.flags & InterfaceChangeType::Deleted)
    {
        std::cout << "Address removed: "
                  << info.address.ip.toString()
                  << "/" << info.address.prefix << "\n";
    }
});

// Unregister
manager.removeAddressListener(id);
```

---

## Reactor integration

`InterfaceManager` registers itself with the reactor on construction and unregisters on destruction. All listener callbacks are invoked from the reactor's dispatcher thread — keep them short and non-blocking.

### With a custom Reactor

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
    Interface::Ptr interface;   // the affected interface
    InterfaceChangeType flags;  // what changed (bitmask)
};
```

### AddressInfo

```cpp
struct AddressInfo : public LinkInfo
{
    Interface::Address address; // address that was added or removed
                                //   .ip        — IpAddress
                                //   .prefix    — uint32_t
                                //   .broadcast — IpAddress (IPv4)
};
```

---

## Error handling

Methods return `0` on success, `-1` on failure. Check `join::lastError` for details:

```cpp
if (manager.createDummyInterface("dummy0", true) == -1)
{
    std::cerr << "Failed: " << lastError.message() << "\n";
}
```

Synchronous operations time out after 5 seconds and set `Errc::TimedOut`.

---

## Best practices

- **Use synchronous mode** when you need confirmation before proceeding.
- **Use asynchronous mode** for fire-and-forget batch operations.
- **Register listeners before doing anything else** to avoid missing early events.
- **Keep callbacks short and non-blocking** — they run on the reactor dispatcher thread.
- **Store the returned id** from `addLinkListener` / `addAddressListener` to be able to unregister.
- **Call `refresh()`** after external tools (e.g. `ip`, `ifconfig`) modify interfaces.
- **Use `RouteManager`** for all route management — routes are no longer tracked here.

---

## Summary

| Feature               | Supported |
| --------------------- | :-------: |
| Interface enumeration | ✅        |
| Interface lookup      | ✅        |
| Dummy interfaces      | ✅        |
| Bridge interfaces     | ✅        |
| VLAN interfaces       | ✅        |
| Veth pairs            | ✅        |
| GRE tunnels           | ✅        |
| Interface deletion    | ✅        |
| Link notifications    | ✅        |
| Address notifications | ✅        |
| Reactor integration   | ✅        |
| Custom Reactor        | ✅        |
| Sync/async operations | ✅        |
