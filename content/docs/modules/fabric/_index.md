---
title: "Fabric"
weight: 20
bookCollapseSection: true
---

# Fabric Module

The **Fabric** module provides network control and Linux network fabric management, allowing applications to interact with and manage the Linux network stack.

---

## 🔌 Interface Management

### Interface

Network interface representation with access to properties and configuration:

- Name, index, flags, MTU, MAC address
- Assigned IP addresses
- Administrative and operational state (`isEnabled`, `isRunning`)
- Bridge membership
- Interface type checks (`isDummy`, `isBridge`, `isVlan`, `isVeth`, `isGre`, `isTun`)

See [Interface]({{< ref "interface" >}}) for full documentation.

### InterfaceManager

System-wide network interface management built on Linux Netlink sockets.

**Discovery and lookup:**
- Enumerate all interfaces
- Find by index or name

**Virtual interface creation:**
- Dummy, bridge, VLAN, veth pairs, GRE tunnels
- Synchronous and asynchronous modes

**Real-time monitoring via event listeners:**
- Link events (add, delete, admin/oper state, MTU, MAC, rename, bridge membership)
- Address events (add, delete, modify)

**Reactor integration:** registers itself on construction, unregisters on destruction. Supports a custom `Reactor*` or defaults to `ReactorThread`.

See [Interface Manager]({{< ref "interface-manager" >}}) for full documentation.

---

## 🛣️ Route Management

### Route

Kernel routing table entry with immutable key fields (interface index, destination, prefix) and mutable attributes (gateway, metric, type, scope, protocol). Supports in-place update and removal.

See [Route]({{< ref "route" >}}) for full documentation.

### RouteManager

System-wide IPv4/IPv6 routing table management built on Linux Netlink sockets.

**Discovery and lookup:**
- Enumerate all routes or filter by interface
- Find by interface index/name, destination, and prefix

**Route operations:**
- Add, remove, update, and flush routes
- Synchronous and asynchronous modes

**Real-time monitoring via event listeners:**
- Route events (add, delete, gateway/metric/type/scope/protocol changed)

See [Route Manager]({{< ref "route-manager" >}}) for full documentation.

---

## 👥 Neighbor Management

### Neighbor

ARP/NDP neighbor cache entry with immutable key fields (interface index, IP address) and mutable attributes (MAC address, NUD state). Supports in-place update and removal.

See [Neighbor]({{< ref "neighbor" >}}) for full documentation.

### NeighborManager

System-wide ARP/NDP neighbor cache management built on Linux Netlink sockets.

**Discovery and lookup:**
- Enumerate all entries or filter by interface
- Find by interface index/name and IP address

**Neighbor operations:**
- Add, remove, update, and flush entries
- Synchronous and asynchronous modes

**Real-time monitoring via event listeners:**
- Neighbor events (add, delete, MAC changed, NUD state changed)

See [Neighbor Manager]({{< ref "neighbor-manager" >}}) for full documentation.

---

## 🔍 ARP

ARP protocol client for IPv4 MAC address resolution:

- Automatic resolution with neighbor cache fallback (`get()`)
- Active ARP request/reply handling (`request()`)
- Neighbor cache query without network traffic (`cache()`)
- Static entry management (`add()`, `remove()`)
- Customizable `NeighborManager` injection

See [ARP]({{< ref "arp" >}}) for full documentation.

---

## 🌐 DNS / DoT / mDNS

### DNS Resolver

DNS resolver over UDP. Queries a specific server (instance methods) or iterates over system name servers from `/etc/resolv.conf` (static `lookup*` methods).

- Forward lookups: A, AAAA
- Reverse lookups: PTR
- Name server: NS
- Zone authority: SOA
- Mail exchangers: MX
- Service port resolution

See [DNS Resolver]({{< ref "dns-resolver" >}}) for full documentation.

### DoT Resolver

DNS-over-TLS resolver. Identical instance API to DNS resolver but transports queries over a persistent TLS connection with RFC 7858 framing.

See [DoT Resolver]({{< ref "dot-resolver" >}}) for full documentation.

### DNS Name Server

Abstract base class for building UDP DNS servers. Handles socket binding, reactor integration, message parsing, and reply serialization. Derive and implement `onQuery()`.

See [DNS Name Server]({{< ref "dns-nameserver" >}}) for full documentation.

### mDNS Peer

Abstract base class for participating in multicast DNS. Handles multicast group membership, probing, announcing, browsing, goodbye, and unicast resolution. Derive and implement `onQuery()` and `onAnnouncement()`.

See [mDNS Peer]({{< ref "mdns-peer" >}}) for full documentation.

---

## 📚 API Reference

[Doxygen Reference](https://joinframework.github.io/join/)
