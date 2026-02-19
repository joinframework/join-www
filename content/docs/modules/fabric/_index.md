---
title: "Fabric"
weight: 20
bookCollapseSection: true
---

# Fabric Module

The **Fabric** module provides network control and Linux network fabric management, allowing applications to interact with and manage the Linux network stack via Netlink.

---

## 🔌 Interface Management

### Interface

Network interface representation with access to properties and configuration:

- Name, index, flags, MTU, MAC address
- Assigned IP addresses and routes
- Administrative and operational state (`isEnabled`, `isRunning`)
- Bridge membership

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
- Route events (add, delete, modify)

**Reactor integration:** registers itself on construction, unregisters on destruction. Supports a custom `Reactor*` or defaults to `ReactorThread`.

See [Interface Manager]({{< ref "interfacemanager" >}}) for full documentation.

---

## 🔍 ARP

ARP protocol implementation for mapping IP addresses to MAC addresses:

- ARP request/reply handling
- IP-to-MAC resolution
- Broadcast and unicast ARP packets

---

## 🌐 DNS Resolution

DNS resolver for hostname and service name resolution:

- Forward lookups (hostname → IPv4/IPv6)
- Reverse lookups (IP → hostname)
- Service name to port number resolution
- Multiple address results per query

---

## 📚 API Reference

[Doxygen Reference](https://joinframework.github.io/join/)
