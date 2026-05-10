---

title: "mDNS Peer"
weight: 65
---

# mDNS Peer

The **Mdns::Peer** class is an abstract base class for participating in multicast DNS (mDNS / RFC 6762). It handles multicast group membership, message framing, service announcement, probing, browsing, goodbye, and unicast resolution. Two pure virtual methods must be implemented: `onQuery` (incoming queries) and `onAnnouncement` (incoming announcements from other peers).

---

## Subclassing

```cpp
class MyMdnsPeer : public Mdns::Peer
{
public:
    explicit MyMdnsPeer (const std::string& interface, Reactor* reactor = nullptr)
    : Mdns::Peer (interface, reactor)
    {
    }

    // Called when another host sends an mDNS query
    void onQuery (const DnsPacket& query) override
    {
        for (const auto& q : query.questions)
        {
            if (q.host == "myhost.local" && q.type == DnsMessage::RecordType::A)
            {
                ResourceRecord rr;
                rr.host     = "myhost.local";
                rr.type     = DnsMessage::RecordType::A;
                rr.dnsclass = DnsMessage::RecordClass::IN;
                rr.ttl      = 4500;
                rr.addr     = "192.168.1.42";

                reply(query, {rr});
            }
        }
    }

    // Called when another host sends an mDNS announcement
    void onAnnouncement (const DnsPacket& packet) override
    {
        for (const auto& answer : packet.answers)
        {
            std::cout << "Announcement: " << answer.host
                      << " ttl=" << answer.ttl << "\n";
        }
    }
};
```

---

## Construction

```cpp
// By interface name
MyMdnsPeer peer("eth0");

// By interface index
MyMdnsPeer peer(2);

// With custom reactor
MyMdnsPeer peer("eth0", &myReactor);
```

---

## Lifecycle

```cpp
MyMdnsPeer peer("eth0");

// Join multicast group and register with reactor
if (peer.bind(AF_INET) == -1)
{
    std::cerr << lastError.message() << "\n";
}

// ... reactor runs ...

peer.close(); // leave multicast group, unregister
```

`bind(family)` opens the socket, joins the mDNS multicast group (`224.0.0.251` for IPv4, `ff02::fb` for IPv6), enables port reuse, and registers with the reactor.

---

## Service operations

### Probe

Sends a DNS-SD probe to check whether a name is already in use before announcing:

```cpp
ResourceRecord rr;
rr.host     = "myhost.local";
rr.type     = DnsMessage::RecordType::A;
rr.dnsclass = DnsMessage::RecordClass::IN;
rr.ttl      = 4500;
rr.addr     = "192.168.1.42";

peer.probe({rr});
```

Sends a multicast query with the records in the authority section and `QU` bit set. Responses arrive via `onQuery`.

### Announce

Sends an unsolicited multicast response advertising one or more records:

```cpp
peer.announce({rr});
```

Sets QR and AA bits. `ttl > 0` means the record is live.

### Goodbye

Sends an announcement with `ttl = 0` to signal that records are being withdrawn:

```cpp
peer.goodbye({rr});
```

The TTL is forced to 0 regardless of the value in the passed record.

### Browse

Sends a PTR query for a service type:

```cpp
peer.browse("_http._tcp.local");
```

Responses arrive via `onAnnouncement`.

---

## Unicast resolution

`Mdns::Peer` can also send unicast mDNS queries and wait for a response. These are instance-only (no `lookup*` static methods):

```cpp
// Resolve a hostname to its first IPv4 address
IpAddress ip = peer.resolveAddress("myhost.local", AF_INET);

// All addresses
IpAddressList all = peer.resolveAllAddress("myhost.local");
IpAddressList v6  = peer.resolveAllAddress("myhost.local", AF_INET6);

// Reverse lookup
std::string   name    = peer.resolveName("192.168.1.42");
AliasList     aliases = peer.resolveAllName("192.168.1.42");

// Custom timeout
IpAddress ip = peer.resolveAddress("myhost.local", AF_INET,
                                    std::chrono::milliseconds(2000));
```

Default timeout is **5 seconds**.

---

## Replying to queries

Inherited from `Dns::NameServer` — same `reply()` signature:

```cpp
reply(query, answers);
reply(query, answers, authorities, additionals, rcode);
```

For mDNS, the response is sent back to the multicast group unless the query had the `QU` bit set, in which case it is sent unicast to the originating client.

---

## onQuery vs onAnnouncement

| Callback | Triggered by |
|----------|-------------|
| `onQuery` | Incoming mDNS query (QR bit = 0), including probes from other peers |
| `onAnnouncement` | Incoming mDNS response (QR bit = 1) not matching a pending unicast query |

Unicast query responses (from `resolveAddress` etc.) are handled internally and do **not** reach `onAnnouncement`.

---

## Debug callbacks

Same pattern as `Dns::Resolver` — pre-wired in `DEBUG` builds, `nullptr` in release:

```cpp
peer.onSuccess = [](const DnsPacket& p) { /* ... */ };
peer.onFailure = [](const DnsPacket& p) { /* ... */ };
```

---

## Error handling

`bind()`, `probe()`, `announce()`, `goodbye()`, `browse()` return `0` on success, `-1` on failure.
Resolution methods return a wildcard address or empty list on failure. Check `lastError`:

| Code | Cause |
|------|-------|
| `Errc::InvalidParam` | Empty records vector, empty service type, or empty hostname |
| `Errc::TimedOut` | Unicast resolution timeout |
| `Errc::MessageTooLong` | Serialized packet exceeds 8192 bytes |

---

## Protocol details

- Transport: UDP multicast, port 5353
- IPv4 multicast group: `224.0.0.251`
- IPv6 multicast group: `ff02::fb`
- Multicast loopback disabled in release builds (enabled in debug)
- Max message size: 8192 bytes
- Probe uses `QU` bit (class `0x8000`) and authority section per RFC 6762 §8
- Goodbye sets `ttl = 0` per RFC 6762 §11
- Transaction IDs for unicast queries are random 16-bit values; mDNS multicast uses `id = 0`

---

## Summary

| Feature | Supported |
| ------- | :-------: |
| Multicast announce | ✅ |
| Probe (conflict detection) | ✅ |
| Goodbye | ✅ |
| Browse (PTR query) | ✅ |
| Unicast resolution (A/AAAA) | ✅ |
| Unicast reverse resolution (PTR) | ✅ |
| `onQuery` callback | ✅ (pure virtual) |
| `onAnnouncement` callback | ✅ (pure virtual) |
| IPv4 multicast | ✅ |
| IPv6 multicast | ✅ |
| Custom reactor | ✅ |
| Custom timeout | ✅ |
| Static `lookup*` methods | ❌ |
