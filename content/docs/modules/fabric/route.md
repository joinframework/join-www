---

title: "Route"
weight: 20
---

# Route

The **Route** class represents a single kernel routing table entry. It exposes the route's key fields (destination, prefix, interface index) as immutable properties, and mutable fields (gateway, metric, type, scope, protocol) that are updated in place by `RouteManager` when the kernel notifies a change.

Routes are managed by `RouteManager` and are represented as shared pointers.

---

## Obtaining a Route

Routes cannot be created directly. Use `RouteManager` to look them up or enumerate them:

```cpp
#include <join/route.hpp>
#include <join/routemanager.hpp>

using namespace join;

RouteManager& manager = RouteManager::instance();

// Look up by interface index, destination, prefix
Route::Ptr route = manager.findByIndex(2, IpAddress("10.0.0.0"), 8);
if (!route)
{
    // Route not found
}
```

---

## Key properties (immutable)

The following fields form the unique identity of a route and never change after creation:

```cpp
uint32_t         idx    = route->index();   // output interface index
const IpAddress& dest   = route->dest();    // destination network address
uint32_t         prefix = route->prefix();  // prefix length
```

---

## Mutable properties

These fields reflect the current kernel state and are updated automatically when the kernel notifies a change:

```cpp
IpAddress gw      = route->gateway();   // next-hop address (wildcard if on-link)
uint32_t  metric  = route->metric();    // route metric / priority
uint8_t   type    = route->type();      // RTN_UNICAST, RTN_BLACKHOLE, …
uint8_t   scope   = route->scope();     // RT_SCOPE_UNIVERSE, RT_SCOPE_LINK, …
uint8_t   proto   = route->protocol();  // RTPROT_STATIC, RTPROT_KERNEL, …
```

---

## Type checks

```cpp
if (route->isUnicast())     { /* RTN_UNICAST — normal forwarding */ }
if (route->isBlackhole())   { /* RTN_BLACKHOLE — silently drop */ }
if (route->isUnreachable()) { /* RTN_UNREACHABLE — ICMP unreachable */ }
if (route->isProhibit())    { /* RTN_PROHIBIT — ICMP prohibited */ }
if (route->isLocal())       { /* RTN_LOCAL — local delivery */ }
```

---

## Scope checks

```cpp
if (route->isScopeUniverse()) { /* RT_SCOPE_UNIVERSE */ }
if (route->isScopeLink())     { /* RT_SCOPE_LINK */ }
if (route->isScopeHost())     { /* RT_SCOPE_HOST */ }
```

---

## Protocol checks

```cpp
if (route->isStatic()) { /* added by user — RTPROT_STATIC */ }
if (route->isKernel()) { /* added by kernel — RTPROT_KERNEL */ }
if (route->isDhcp())   { /* added by DHCP client — RTPROT_DHCP */ }
if (route->isBoot())   { /* added at boot — RTPROT_BOOT */ }
```

---

## Modifying a route

### Update gateway and metric

`set()` replaces the route in the kernel table (`RTM_NEWROUTE` with `NLM_F_REPLACE`):

```cpp
IpAddress newGateway("192.168.1.254");
uint32_t  newMetric = 200;

// Asynchronous
route->set(newGateway, newMetric);

// Synchronous
if (route->set(newGateway, newMetric, true) == -1)
{
    std::cerr << "Failed: " << lastError.message() << "\n";
}
```

### Remove a route

```cpp
// Asynchronous
route->remove();

// Synchronous
if (route->remove(true) == -1)
{
    std::cerr << "Failed: " << lastError.message() << "\n";
}
```

⚠️ After a successful `remove()`, the `Route::Ptr` may still be held by the caller but the entry is erased from `RouteManager`'s cache. Do not reuse the pointer to re-add the route — call `RouteManager::addRoute()` instead.

---

## Comparison operators

Two `Route::Ptr` values are compared by (index, destination, prefix):

```cpp
if (routeA == routeB) { /* same routing entry */ }
if (routeA <  routeB) { /* ordering: index → dest → prefix */ }
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
| `dest()`    | ✅        | ✅               |
| `prefix()`  | ✅        | ✅               |
| `gateway()` |           | ✅ (mutex)       |
| `metric()`  |           | ✅ (mutex)       |
| `type()`    |           | ✅ (mutex)       |
| `scope()`   |           | ✅ (mutex)       |
| `protocol()`|           | ✅ (mutex)       |
