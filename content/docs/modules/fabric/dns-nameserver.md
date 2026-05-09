---

title: "Dns NameServer"
weight: 45
---

# Dns::NameServer

`Dns::NameServer` is an abstract base class for building DNS servers over UDP. It handles socket binding, reactor registration, message parsing, and reply serialization. The only method to implement is `onQuery()`.

```cpp
#include <join/nameserver.hpp>

using namespace join;
```

---

## Subclassing

`Dns::NameServer` is abstract — instantiate it by deriving and implementing `onQuery`:

```cpp
class MyDnsServer : public Dns::NameServer
{
public:
    explicit MyDnsServer (Reactor* reactor = nullptr)
    : Dns::NameServer (reactor)
    {
    }

    void onQuery (const DnsPacket& query) override
    {
        // Inspect query.questions and build a response
        std::vector<ResourceRecord> answers;

        for (const auto& q : query.questions)
        {
            if (q.type == DnsMessage::RecordType::A && q.host == "myhost.local")
            {
                ResourceRecord rr;
                rr.host      = q.host;
                rr.type      = DnsMessage::RecordType::A;
                rr.dnsclass  = DnsMessage::RecordClass::IN;
                rr.ttl       = 60;
                rr.addr      = IpAddress("192.168.1.10");
                answers.push_back(rr);
            }
        }

        if (answers.empty())
        {
            reply(query, {}, {}, {}, 3); // NXDOMAIN
        }
        else
        {
            reply(query, answers);
        }
    }
};
```

---

## Lifecycle

```cpp
MyDnsServer server;

// Bind to all interfaces, port 53
Dns::Endpoint endpoint{IpAddress(), 53};
if (server.bind(endpoint) == -1)
{
    std::cerr << lastError.message() << "\n";
}

// ... reactor runs, onQuery() called for each incoming query ...

// Unregister from reactor and close socket
server.close();
```

`bind()` opens the socket, binds it, and registers with the reactor.
`close()` unregisters from the reactor and closes the socket.

---

## Replying to queries

`reply()` sends a DNS response back to the originating client:

```cpp
int reply (const DnsPacket& query,
           const std::vector<ResourceRecord>& answers     = {},
           const std::vector<ResourceRecord>& authorities = {},
           const std::vector<ResourceRecord>& additionals = {},
           uint16_t rcode = 0);
```

The response automatically mirrors the query's transaction ID, copies the question section, and sets the QR, AA, and RD bits. `rcode` is the 4-bit DNS response code:

| Value | Meaning |
|-------|---------|
| 0 | No error |
| 1 | Format error |
| 2 | Server failure |
| 3 | Name error (NXDOMAIN) |
| 4 | Not implemented |
| 5 | Refused |

```cpp
// Answer with one A record
reply(query, answers);

// NXDOMAIN
reply(query, {}, {}, {}, 3);

// With authority section
reply(query, answers, authorities);
```

---

## DnsPacket fields in onQuery

```cpp
void onQuery (const DnsPacket& query) override
{
    query.id;         // transaction ID (mirror in reply — done automatically)
    query.flags;      // raw flags word
    query.src;        // client IP address
    query.dest;       // server IP address (local)
    query.port;       // client port
    query.questions;  // vector<QuestionRecord>
}
```

Each `QuestionRecord`:

```cpp
q.host;      // queried hostname
q.type;      // DnsMessage::RecordType (A, AAAA, PTR, NS, MX, SOA…)
q.dnsclass;  // DnsMessage::RecordClass::IN
```

---

## Building ResourceRecord answers

```cpp
ResourceRecord rr;
rr.host     = "example.local";
rr.type     = DnsMessage::RecordType::A;
rr.dnsclass = DnsMessage::RecordClass::IN;
rr.ttl      = 120;
rr.addr     = IpAddress("10.0.0.1");

// AAAA
rr.type = DnsMessage::RecordType::AAAA;
rr.addr = IpAddress("::1");

// PTR
rr.type = DnsMessage::RecordType::PTR;
rr.name = "myhost.local";

// NS
rr.type = DnsMessage::RecordType::NS;
rr.name = "ns1.example.local";
```

---

## Reactor integration

The constructor accepts an optional `Reactor*`. If `nullptr`, uses `ReactorThread::reactor()`.
`bind()` registers the socket fd with the reactor. `close()` removes it.
`onQuery()` is called from the reactor dispatcher thread — keep it short and non-blocking.

---

## Error handling

`bind()` and `reply()` return `0` on success, `-1` on failure. Check `lastError`:

```cpp
if (server.bind(endpoint) == -1)
{
    std::cerr << "Bind failed: " << lastError.message() << "\n";
}
```

---

## Protocol details

- Transport: UDP, default port 53, max message size 8192 bytes
- Incoming messages with the QR bit set (responses) are silently ignored
- `reply()` uses `writeTo()` to send the response directly to the originating endpoint

---

## Summary

| Feature | Supported |
| ------- | :-------: |
| UDP transport | ✅ |
| Reactor integration | ✅ |
| Custom reactor | ✅ |
| Answer section | ✅ |
| Authority section | ✅ |
| Additional section | ✅ |
| Custom rcode | ✅ |
| IPv4 clients | ✅ |
| IPv6 clients | ✅ |
