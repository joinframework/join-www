---

title: "Neighbor Manager"
weight: 35
---

# Neighbor Manager

The **NeighborManager** class provides centralized management of the kernel ARP/NDP neighbor cache in Join. It monitors neighbor table changes via Linux Netlink, maintains an in-memory cache of all IPv4 and IPv6 entries, and notifies listeners of any change.

`NeighborManager` is independent of `InterfaceManager` and `RouteManager` — the managers can be used together or separately.

---

## Getting an instance

`NeighborManager` is a singleton. Use `instance()` for normal usage.
A custom `Reactor*` can be injected by constructing directly:

```cpp
#include <join/neighbormanager.hpp>

using namespace join;

// Normal usage — singleton
NeighborManager& manager = NeighborManager::instance();

// Custom reactor
Reactor myReactor;
NeighborManager manager(&myReactor);
```

On construction the manager opens a Netlink socket, subscribes to neighbor table events (`RTMGRP_NEIGH`), registers itself with the reactor, and performs an initial synchronous `refresh()`.

`NeighborManager` is neither copyable nor movable.

---

## Finding entries

### Find by interface index

```cpp
Neighbor::Ptr neigh = manager.findByIndex(2, IpAddress("192.168.1.1"));
if (!neigh)
{
    // Entry not found
}
```

### Find by interface name

```cpp
Neighbor::Ptr neigh = manager.findByName("eth0", IpAddress("192.168.1.1"));
```

---

## Enumerating entries

### All entries

```cpp
for (const auto& neigh : manager.enumerate())
{
    std::cout << neigh->ip().toString()
              << " -> " << neigh->mac().toString()
              << " dev " << neigh->index() << "\n";
}
```

### Entries for a specific interface

```cpp
// By interface index
for (const auto& neigh : manager.enumerate(2))
{
    // ...
}

// By interface name
for (const auto& neigh : manager.enumerate("eth0"))
{
    // ...
}
```

---

## Refreshing neighbor data

`refresh()` clears the cache and re-dumps the kernel neighbor table synchronously:

```cpp
if (manager.refresh() == -1)
{
    std::cerr << lastError.message() << "\n";
}
```

---

## Adding entries

`addNeighbor()` uses `NLM_F_CREATE | NLM_F_EXCL` — it fails if the entry already exists.
Use `Neighbor::set()` or `NeighborManager` is not directly exposed for replace; add then update via the `Neighbor` handle if needed.

```cpp
IpAddress  ip("192.168.1.1");
MacAddress mac("00:11:22:33:44:55");

// By interface index — permanent entry, asynchronous (default)
manager.addNeighbor(2, ip, mac);

// By interface index — permanent entry, synchronous
if (manager.addNeighbor(2, ip, mac, NUD_PERMANENT, true) == -1)
{
    std::cerr << lastError.message() << "\n";
}

// By interface name
manager.addNeighbor("eth0", ip, mac, NUD_PERMANENT, true);

// Reachable (dynamic) entry
manager.addNeighbor("eth0", ip, mac, NUD_REACHABLE, true);
```

---

## Removing entries

```cpp
// By interface index
manager.removeNeighbor(2, IpAddress("192.168.1.1"), true);

// By interface name
manager.removeNeighbor("eth0", IpAddress("192.168.1.1"), true);
```

---

## Flushing entries

Removes all neighbor entries on a given interface:

```cpp
// By interface index
manager.flushNeighbors(2, true);

// By interface name
manager.flushNeighbors("eth0", true);
```

---

## Updating an entry

Use `Neighbor::set()` to replace an existing entry's MAC address and NUD state in place:

```cpp
Neighbor::Ptr neigh = manager.findByName("eth0", IpAddress("192.168.1.1"));
if (neigh)
{
    neigh->set(MacAddress("aa:bb:cc:dd:ee:ff"), NUD_PERMANENT, true);
}
```

---

## Event notifications

### NeighborChangeType flags

```cpp
enum class NeighborChangeType : uint32_t
{
    Added        = 1 << 0,  // entry did not exist before
    Deleted      = 1 << 1,  // entry was removed
    Modified     = 1 << 2,  // entry was updated
    MacChanged   = 1 << 3,  // MAC address changed
    StateChanged = 1 << 4,  // NUD state changed
};
```

Flags support all bitwise operators (`&`, `|`, `^`, `~`, `&=`, `|=`, `^=`).

### Neighbor listener

`addNeighborListener` returns a unique `uint64_t` id used to unregister later:

```cpp
uint64_t id = manager.addNeighborListener([](const NeighborInfo& info) {
    if (info.flags & NeighborChangeType::Added)
    {
        std::cout << "Neighbor added: "
                  << info.neighbor->ip().toString()
                  << " -> " << info.neighbor->mac().toString()
                  << " dev " << info.neighbor->index() << "\n";
    }

    if (info.flags & NeighborChangeType::Deleted)
    {
        std::cout << "Neighbor deleted: "
                  << info.neighbor->ip().toString() << "\n";
    }

    if (info.flags & NeighborChangeType::MacChanged)
    {
        std::cout << "MAC changed: "
                  << info.neighbor->ip().toString()
                  << " -> " << info.neighbor->mac().toString() << "\n";
    }

    if (info.flags & NeighborChangeType::StateChanged)
    {
        if (info.neighbor->isReachable())
            std::cout << info.neighbor->ip().toString() << " is reachable\n";
        else if (info.neighbor->isStale())
            std::cout << info.neighbor->ip().toString() << " is stale\n";
    }
});

// Unregister
manager.removeNeighborListener(id);
```

---

## Reactor integration

`NeighborManager` registers itself with the reactor on construction and unregisters on destruction. All listener callbacks are invoked from the reactor's dispatcher thread — keep them short and non-blocking.

### With a custom Reactor

```cpp
Reactor reactor;
NeighborManager manager(&reactor);

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

### NeighborInfo

```cpp
struct NeighborInfo
{
    Neighbor::Ptr      neighbor; // the affected neighbor entry
    NeighborChangeType flags;    // what changed (bitmask)
};
```

---

## Neighbor cache scope

Only entries with family `AF_INET` or `AF_INET6` and a valid interface index are tracked. Entries with a wildcard IP address are silently ignored.

---

## Error handling

Methods return `0` on success, `-1` on failure. Check `join::lastError` for details:

```cpp
if (manager.addNeighbor("eth0", ip, mac, NUD_PERMANENT, true) == -1)
{
    std::cerr << "Failed: " << lastError.message() << "\n";
}
```

Synchronous operations time out after 5 seconds and set `Errc::TimedOut`.

---

## Best practices

- **Register listeners before doing anything else** to avoid missing early events.
- **Keep callbacks short and non-blocking** — they run on the reactor dispatcher thread.
- **Store the returned id** from `addNeighborListener` to be able to unregister.
- **Call `refresh()`** after external tools (e.g. `arp`, `ip neigh`) modify the neighbor table.
- **Use `flushNeighbors()`** to clean up all entries on an interface before removing it.
- **Use `Neighbor::set()`** to update an existing entry — `addNeighbor()` fails if the entry already exists.
- **Check return values** for all synchronous operations.

---

## Summary

| Feature                   | Supported |
| ------------------------- | :-------: |
| Neighbor enumeration      | ✅        |
| Neighbor lookup           | ✅        |
| Add neighbor (ARP/NDP)    | ✅        |
| Remove neighbor           | ✅        |
| Update neighbor           | ✅        |
| Flush interface neighbors | ✅        |
| Neighbor notifications    | ✅        |
| IPv4 (ARP) support        | ✅        |
| IPv6 (NDP) support        | ✅        |
| Reactor integration       | ✅        |
| Custom Reactor            | ✅        |
| Sync/async operations     | ✅        |
