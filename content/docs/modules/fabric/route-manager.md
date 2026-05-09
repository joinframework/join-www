---

title: "Route Manager"
weight: 31
---

# RouteManager

The **RouteManager** provides centralized management of the kernel IPv4/IPv6 routing table in Join. It monitors route changes via Linux Netlink, maintains an in-memory cache of all `RT_TABLE_MAIN` routes, and notifies listeners of any change.

`RouteManager` is independent of `InterfaceManager` — the two managers can be used together or separately.

---

## Getting an instance

`RouteManager` is a singleton. Use `instance()` for normal usage.
A custom `Reactor*` can be injected by constructing directly:

```cpp
#include <join/routemanager.hpp>

using namespace join;

// Normal usage — singleton
RouteManager& manager = RouteManager::instance();

// Custom reactor
Reactor myReactor;
RouteManager manager(&myReactor);
```

On construction the manager opens a Netlink socket, subscribes to IPv4 and IPv6 route events, registers itself with the reactor, and performs an initial synchronous `refresh()`.

`RouteManager` is neither copyable nor movable.

---

## Finding routes

### Find by interface index

```cpp
IpAddress dest("10.0.0.0");

Route::Ptr route = manager.findByIndex(2, dest, 8);
if (!route)
{
    // Route not found
}
```

### Find by interface name

```cpp
Route::Ptr route = manager.findByName("eth0", dest, 8);
```

---

## Enumerating routes

### All routes

```cpp
for (const auto& route : manager.enumerate())
{
    std::cout << route->dest().toString()
              << "/" << route->prefix()
              << " dev " << route->index() << "\n";
}
```

### Routes for a specific interface

```cpp
// By interface index
for (const auto& route : manager.enumerate(2))
{
    // ...
}

// By interface name
for (const auto& route : manager.enumerate("eth0"))
{
    // ...
}
```

---

## Refreshing route data

`refresh()` clears the cache and re-dumps the kernel route table synchronously:

```cpp
if (manager.refresh() == -1)
{
    std::cerr << lastError.message() << "\n";
}
```

---

## Adding routes

```cpp
IpAddress dest("10.0.0.0");
IpAddress gateway("192.168.1.1");
uint32_t  metric = 100;

// By interface index — asynchronous (default)
manager.addRoute(2, dest, 8, gateway, metric);

// By interface index — synchronous
if (manager.addRoute(2, dest, 8, gateway, metric, true) == -1)
{
    std::cerr << lastError.message() << "\n";
}

// By interface name
manager.addRoute("eth0", dest, 8, gateway, metric, true);

// On-link route (no gateway)
manager.addRoute("eth0", IpAddress("192.168.2.0"), 24, {}, 0, true);
```

---

## Removing routes

```cpp
// By interface index
manager.removeRoute(2, dest, 8, true);

// By interface name
manager.removeRoute("eth0", dest, 8, true);
```

`removeRoute()` looks up the current gateway in the cache before sending the kernel request, so the route must exist in the cache. Returns `-1` with `Errc::NotFound` if not cached.

---

## Flushing routes

Removes all non-kernel routes on a given interface:

```cpp
// By interface index
manager.flushRoutes(2, true);

// By interface name
manager.flushRoutes("eth0", true);
```

⚠️ Routes with `RTPROT_KERNEL` are skipped — only user-space routes are removed.

---

## Updating a route

Use `Route::set()` to replace a route's gateway and metric in place:

```cpp
Route::Ptr route = manager.findByName("eth0", IpAddress("10.0.0.0"), 8);
if (route)
{
    route->set(IpAddress("192.168.1.254"), 200, true);
}
```

---

## Event notifications

### RouteChangeType flags

```cpp
enum class RouteChangeType : uint32_t
{
    Added           = 1 << 0,  // entry did not exist before
    Deleted         = 1 << 1,  // entry was removed
    Modified        = 1 << 2,  // entry was updated
    GatewayChanged  = 1 << 3,
    MetricChanged   = 1 << 4,
    TypeChanged     = 1 << 5,
    ScopeChanged    = 1 << 6,
    ProtocolChanged = 1 << 7,
};
```

Flags support all bitwise operators (`&`, `|`, `^`, `~`, `&=`, `|=`, `^=`).

### Route listener

`addRouteListener` returns a unique `uint64_t` id used to unregister later:

```cpp
uint64_t id = manager.addRouteListener([](const RouteInfo& info) {
    if (info.flags & RouteChangeType::Added)
    {
        std::cout << "Route added: "
                  << info.route->dest().toString()
                  << "/" << info.route->prefix();

        if (!info.route->gateway().isWildcard())
            std::cout << " via " << info.route->gateway().toString();

        std::cout << " dev " << info.route->index() << "\n";
    }

    if (info.flags & RouteChangeType::Deleted)
    {
        std::cout << "Route deleted: "
                  << info.route->dest().toString()
                  << "/" << info.route->prefix() << "\n";
    }

    if (info.flags & RouteChangeType::GatewayChanged)
    {
        std::cout << "Gateway changed to "
                  << info.route->gateway().toString() << "\n";
    }
});

// Unregister
manager.removeRouteListener(id);
```

---

## Reactor integration

`RouteManager` registers itself with the reactor on construction and unregisters on destruction. All listener callbacks are invoked from the reactor's dispatcher thread — keep them short and non-blocking.

### With a custom Reactor

```cpp
Reactor reactor;
RouteManager manager(&reactor);

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

### RouteInfo

```cpp
struct RouteInfo
{
    Route::Ptr      route;  // the affected route
    RouteChangeType flags;  // what changed (bitmask)
};
```

---

## Route cache scope

Only routes from `RT_TABLE_MAIN` with family `AF_INET` or `AF_INET6` are tracked. Routes from other tables (local, policy) are silently ignored.

---

## Error handling

Methods return `0` on success, `-1` on failure. Check `join::lastError` for details:

```cpp
if (manager.addRoute("eth0", dest, 8, gateway, 0, true) == -1)
{
    std::cerr << "Failed: " << lastError.message() << "\n";
}
```

Synchronous operations time out after 5 seconds and set `Errc::TimedOut`.

---

## Best practices

- **Register listeners before doing anything else** to avoid missing early events.
- **Keep callbacks short and non-blocking** — they run on the reactor dispatcher thread.
- **Store the returned id** from `addRouteListener` to be able to unregister.
- **Call `refresh()`** after external tools (e.g. `ip route`) modify the routing table.
- **Use `flushRoutes()`** to clean up all user routes on an interface before removing it.
- **Check return values** for all synchronous operations.

---

## Summary

| Feature                 | Supported |
| ----------------------- | :-------: |
| Route enumeration       | ✅        |
| Route lookup            | ✅        |
| Add route               | ✅        |
| Remove route            | ✅        |
| Update route            | ✅        |
| Flush interface routes  | ✅        |
| Route notifications     | ✅        |
| IPv4 support            | ✅        |
| IPv6 support            | ✅        |
| Reactor integration     | ✅        |
| Custom Reactor          | ✅        |
| Sync/async operations   | ✅        |
