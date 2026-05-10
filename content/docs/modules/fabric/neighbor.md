---

title: "Neighbor"
weight: 30
---

# Neighbor

The **Neighbor** class represents a single ARP (IPv4) or NDP (IPv6) neighbor cache entry. It exposes the entry's key fields (interface index, IP address) as immutable properties, and mutable fields (MAC address, NUD state) that are updated in place by `NeighborManager` when the kernel notifies a change.

Neighbors are managed by `NeighborManager` and are represented as shared pointers.

---

## Obtaining a Neighbor

Neighbors cannot be created directly. Use `NeighborManager` to look them up or enumerate them:

```cpp
#include <join/neighbor.hpp>
#include <join/neighbormanager.hpp>

using namespace join;

NeighborManager& manager = NeighborManager::instance();

// Look up by interface index and IP address
Neighbor::Ptr neigh = manager.findByIndex(2, IpAddress("192.168.1.1"));
if (!neigh)
{
    // Entry not found in cache
}
```

---

## Key properties (immutable)

The following fields form the unique identity of a neighbor entry and never change after creation:

```cpp
uint32_t         idx = neigh->index(); // output interface index
const IpAddress& ip  = neigh->ip();    // destination IP address
```

---

## Mutable properties

These fields reflect the current kernel state and are updated automatically when the kernel notifies a change:

```cpp
MacAddress mac   = neigh->mac();   // resolved layer-2 address
uint16_t   state = neigh->state(); // NUD state bitmask
```

---

## NUD state checks

```cpp
if (neigh->isReachable())  { /* NUD_REACHABLE — confirmed reachable */ }
if (neigh->isStale())      { /* NUD_STALE — reachability unconfirmed */ }
if (neigh->isPermanent())  { /* NUD_PERMANENT — static entry */ }
if (neigh->isIncomplete()) { /* NUD_INCOMPLETE — resolution in progress */ }
if (neigh->isFailed())     { /* NUD_FAILED — resolution failed */ }
```

---

## Modifying an entry

### Update MAC address and NUD state

`set()` replaces the entry in the kernel table (`RTM_NEWNEIGH` with `NLM_F_REPLACE`).
The default NUD state is `NUD_PERMANENT`:

```cpp
MacAddress mac("00:11:22:33:44:55");

// Asynchronous — permanent static entry
neigh->set(mac);

// Synchronous — permanent static entry
if (neigh->set(mac, NUD_PERMANENT, true) == -1)
{
    std::cerr << "Failed: " << lastError.message() << "\n";
}

// Synchronous — reachable dynamic entry
neigh->set(mac, NUD_REACHABLE, true);
```

### Remove an entry

```cpp
// Asynchronous
neigh->remove();

// Synchronous
if (neigh->remove(true) == -1)
{
    std::cerr << "Failed: " << lastError.message() << "\n";
}
```

⚠️ After a successful `remove()`, the `Neighbor::Ptr` may still be held by the caller but the entry is erased from `NeighborManager`'s cache. Do not reuse the pointer to re-add the entry — call `NeighborManager::addNeighbor()` instead.

---

## Comparison operators

Two `Neighbor::Ptr` values are compared by (index, IP address):

```cpp
if (neighA == neighB) { /* same neighbor entry */ }
if (neighA <  neighB) { /* ordering: index → ip */ }
```

---

## Return values

`set()` and `remove()` return:
- **0** on success
- **-1** on failure (check `lastError` for details)

---

## Summary

| Property    | Immutable | Thread-safe read |
| ----------- | :-------: | :--------------: |
| `index()`   | ✅        | ✅               |
| `ip()`      | ✅        | ✅               |
| `mac()`     |           | ✅ (mutex)       |
| `state()`   |           | ✅ (mutex)       |
