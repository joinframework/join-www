---
title: "Fabric"
weight: 2
bookCollapseSection: true
---

# Fabric Module

The **Fabric** module provides network control and Linux network fabric management capabilities, allowing applications to interact with and manage the Linux network stack.

---

## 🔌 Interface Management

### Interface

Network interface representation and information:

**Features:**
- Interface enumeration and queries
- IP address assignment information
- MTU (Maximum Transmission Unit) queries
- Interface flags and status
- Link-layer address information

**Operations:**
- Query interface properties
- Get assigned IP addresses
- Check interface state (up/down)
- Access hardware (MAC) addresses

### Interface Manager

System-wide network interface management using Netlink:

**Features:**
- Interface discovery and enumeration
- Real-time interface monitoring
- Address family filtering (IPv4/IPv6)
- Interface status tracking
- Event-based notifications

**Operations:**
- List all network interfaces
- Monitor interface changes
- Filter by address family
- Query interface capabilities

**Implementation:**
- Built on Linux Netlink sockets
- Efficient kernel communication
- Event-driven updates

---

## 🔍 ARP (Address Resolution Protocol)

ARP protocol implementation for mapping IP addresses to MAC addresses:

**Features:**
- ARP request/reply handling
- MAC address resolution from IP
- Network layer utilities
- Broadcast and unicast ARP

**Operations:**
- Send ARP requests
- Parse ARP replies
- Resolve IP to MAC address
- Build ARP packets

**Use Cases:**
- Network discovery
- Address verification
- Custom network tools
- Security monitoring

---

## 🌐 DNS Resolution

DNS resolver for hostname and service name resolution:

**Features:**
- Hostname to IP address resolution
- Service name resolution
- IPv4 and IPv6 support
- Forward and reverse lookups
- Multiple address results

**Operations:**
- Resolve hostnames to IP addresses
- Resolve service names to port numbers
- Reverse DNS lookups (IP to hostname)
- Query multiple addresses per hostname

**Protocol Support:**
- IPv4 (A records)
- IPv6 (AAAA records)
- PTR records (reverse lookup)
- Service/protocol resolution

---

## 📚 API Reference

For detailed API documentation, see:

[Doxygen Reference](https://joinframework.github.io/join/)
