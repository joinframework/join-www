---
title: "MAC Address"
weight: 3
---

# MAC Address

Join provides a **MAC address class** for handling Ethernet hardware addresses.
The `MacAddress` class offers **parsing, validation, conversion**, and arithmetic operations on 48-bit MAC addresses.

MAC address features:

* **multiple formats** — string, binary array, initializer list
* **validation** — wildcard and broadcast detection
* **conversions** — to IPv6 (EUI-64), link-local, unique-local
* **arithmetic** — increment, addition operations
* **bitwise operations** — AND, OR, XOR, NOT
* **interface lookup** — retrieve MAC address by interface name

---

## Creating MAC addresses

### Default construction

```cpp
#include <join/macaddress.hpp>

using join;

MacAddress mac;  // Wildcard (00:00:00:00:00:00)
```

### From string

```cpp
MacAddress mac1("01:23:45:67:89:ab");
MacAddress mac2("ff:ff:ff:ff:ff:ff");
```

### From byte array

```cpp
uint8_t bytes[] = {0x01, 0x23, 0x45, 0x67, 0x89, 0xab};
MacAddress mac(bytes, 6);
```

### From initializer list

```cpp
MacAddress mac = {0x01, 0x23, 0x45, 0x67, 0x89, 0xab};

mac = {0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff};
```

### From sockaddr

```cpp
struct sockaddr sa;
// Fill sa with MAC address data
MacAddress mac(sa);
```

---

## Predefined constants

```cpp
MacAddress::wildcard;    // 00:00:00:00:00:00
MacAddress::broadcast;   // ff:ff:ff:ff:ff:ff
```

---

## Properties

### Basic information

```cpp
MacAddress mac("01:23:45:67:89:ab");

int family = mac.family();          // ARPHRD_ETHER
const uint8_t* data = mac.addr();   // Pointer to bytes
socklen_t len = mac.length();       // 6
```

### Type checking

```cpp
MacAddress wildcard;
bool isWild = wildcard.isWildcard();  // true

MacAddress broadcast("ff:ff:ff:ff:ff:ff");
bool isBcast = broadcast.isBroadcast();  // true
```

### Validation

```cpp
if (MacAddress::isMacAddress("01:23:45:67:89:ab"))
{
    // Valid MAC address
}

if (!MacAddress::isMacAddress("invalid"))
{
    // Invalid format
}
```

---

## String conversion

### To string (default: lowercase)

```cpp
MacAddress mac = {0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff};

std::string lower = mac.toString();  // "aa:bb:cc:dd:ee:ff"
```

### To string (uppercase)

```cpp
std::string upper = mac.toString(std::uppercase);  // "AA:BB:CC:DD:EE:FF"
```

### Stream insertion

```cpp
MacAddress mac("01:23:45:67:89:ab");
std::cout << mac << "\n";  // Prints "01:23:45:67:89:ab"
```

---

## IPv6 conversions (EUI-64)

### To link-local IPv6

```cpp
MacAddress mac("02:00:5e:10:00:00");
IpAddress ipv6 = mac.toLinkLocalIpv6();
// fe80::5eff:fe10:0
```

The 7th bit of the first byte is flipped (universal/local bit), and `ff:fe` is inserted in the middle.

### To unique-local IPv6

```cpp
IpAddress ipv6 = mac.toUniqueLocalIpv6();
// fd<random>:<random>::<EUI-64>
```

Generates a random `fd00::/8` prefix with the MAC address as the interface identifier.

### Custom prefix

```cpp
MacAddress mac("02:00:5e:10:00:00");
IpAddress prefix("2001:db8::");
IpAddress ipv6 = mac.toIpv6(prefix, 64);
// 2001:db8::5eff:fe10:0
```

---

## Arithmetic operations

### Increment

```cpp
MacAddress mac("00:00:00:00:00:01");

++mac;  // Pre-increment: 00:00:00:00:00:02
mac++;  // Post-increment: 00:00:00:00:00:03
```

### Addition

```cpp
MacAddress mac("00:00:00:00:00:ff");

mac += 5;  // 00:00:00:00:01:04

MacAddress result1 = mac + 10;
MacAddress result2 = 10 + mac;
```

Arithmetic carries across bytes (big-endian style).

---

## Bitwise operations

```cpp
MacAddress a("ff:ff:ff:00:00:00");
MacAddress b("00:00:00:ff:ff:ff");

MacAddress andResult = a & b;  // 00:00:00:00:00:00
MacAddress orResult = a | b;   // ff:ff:ff:ff:ff:ff
MacAddress xorResult = a ^ b;  // ff:ff:ff:ff:ff:ff
MacAddress notResult = ~a;     // 00:00:00:ff:ff:ff
```

---

## Byte access

Access and modify individual bytes:

```cpp
MacAddress mac("01:23:45:67:89:ab");

uint8_t first = mac[0];   // 0x01
uint8_t last = mac[5];    // 0xab

mac[5] = 0xff;  // Modify to 01:23:45:67:89:ff
```

---

## Iteration

Iterate over MAC address bytes:

```cpp
MacAddress mac("01:23:45:67:89:ab");

for (uint8_t byte : mac)
{
    std::cout << std::hex << (int)byte << " ";
}
// Output: 1 23 45 67 89 ab

// Using iterators
for (auto it = mac.begin(); it != mac.end(); ++it)
{
    *it ^= 0xff;  // Flip all bits
}
```

---

## Interface lookup

Get MAC address of a network interface:

```cpp
MacAddress mac = MacAddress::address("eth0");

if (!mac.isWildcard())
{
    std::cout << "eth0 MAC: " << mac << "\n";
}
else
{
    std::cerr << "Failed to get MAC address\n";
}
```

---

## Comparison

```cpp
MacAddress a("00:11:22:33:44:55");
MacAddress b("00:11:22:33:44:66");

bool equal = (a == b);      // false
bool notEqual = (a != b);   // true
bool less = (a < b);        // true
bool lessEq = (a <= b);     // true
bool greater = (a > b);     // false
bool greaterEq = (a >= b);  // false
```

Comparison is done byte-by-byte from left to right.

---

## Usage patterns

### MAC address pool

```cpp
class MacPool
{
public:
    MacPool(const MacAddress& base, int count)
    : _current(base), _end(base + count)
    {}

    MacAddress allocate()
    {
        if (_current < _end)
        {
            return _current++;
        }
        throw std::runtime_error("Pool exhausted");
    }

private:
    MacAddress _current;
    MacAddress _end;
};

// Usage
MacPool pool("02:00:00:00:00:00", 100);
MacAddress mac1 = pool.allocate();  // 02:00:00:00:00:00
MacAddress mac2 = pool.allocate();  // 02:00:00:00:00:01
```

---

### OUI (Organizationally Unique Identifier) checking

```cpp
bool isSameOUI(const MacAddress& a, const MacAddress& b)
{
    return (a[0] == b[0]) && (a[1] == b[1]) && (a[2] == b[2]);
}

MacAddress mac1("aa:bb:cc:dd:ee:ff");
MacAddress mac2("aa:bb:cc:11:22:33");

if (isSameOUI(mac1, mac2)) {
    std::cout << "Same manufacturer\n";
}
```

---

### Local vs. universal bit

```cpp
bool isLocallyAdministered(const MacAddress& mac)
{
    return (mac[0] & 0x02) != 0;
}

bool isUniversallyAdministered(const MacAddress& mac)
{
    return (mac[0] & 0x02) == 0;
}

MacAddress local("02:00:00:00:00:00");
if (isLocallyAdministered(local))
{
    std::cout << "Locally administered address\n";
}
```

---

### Multicast bit

```cpp
bool isMulticast(const MacAddress& mac)
{
    return (mac[0] & 0x01) != 0;
}

bool isUnicast(const MacAddress& mac)
{
    return (mac[0] & 0x01) == 0;
}

MacAddress multicast("01:00:5e:00:00:00");
if (isMulticast(multicast))
{
    std::cout << "Multicast address\n";
}
```

---

### EUI-64 generation for IPv6

```cpp
void configureInterface(const std::string& iface)
{
    MacAddress mac = MacAddress::address(iface);

    if (mac.isWildcard())
    {
        std::cerr << "Failed to get MAC address\n";
        return;
    }

    // Generate link-local address
    IpAddress linkLocal = mac.toLinkLocalIpv6();
    std::cout << "Link-local: " << linkLocal << "\n";

    // Generate address with custom prefix
    IpAddress prefix("2001:db8::");
    IpAddress global = mac.toIpv6(prefix, 64);
    std::cout << "Global: " << global << "\n";
}
```

---

## Best practices

* **Use locally administered** — set bit 1 of first byte for custom MAC addresses
* **Avoid broadcast** — don't use `ff:ff:ff:ff:ff:ff` for unicast
* **Check wildcard** — validate MAC addresses before use
* **Handle errors** — invalid string formats throw `std::invalid_argument`
* **Use uppercase for display** — more readable in logs and output
* **Respect OUI** — don't randomly generate MACs with assigned vendor OUIs

---

## Error handling

```cpp
try
{
    MacAddress mac("invalid:mac:address");
}
catch (const std::invalid_argument& e)
{
    std::cerr << "Invalid MAC: " << e.what() << "\n";
}

// Safe validation
if (MacAddress::isMacAddress(userInput))
{
    MacAddress mac(userInput);
}
else
{
    std::cerr << "Invalid MAC address format\n";
}
```

---

## Summary

| Feature                      | Supported |
| ---------------------------- | --------- |
| String parsing               | ✅         |
| Wildcard/broadcast detection | ✅         |
| EUI-64 conversion            | ✅         |
| Link-local IPv6              | ✅         |
| Unique-local IPv6            | ✅         |
| Arithmetic operations        | ✅         |
| Bitwise operations           | ✅         |
| Byte access                  | ✅         |
| Interface lookup             | ✅         |
| Comparison operators         | ✅         |
| Iterator support             | ✅         |
