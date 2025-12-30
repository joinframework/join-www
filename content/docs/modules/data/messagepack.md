---
title: "MessagePack"
weight: 3
---

# MessagePack

Join provides **high-performance MessagePack serialization and deserialization** built on the same SAX API used for JSON.
The implementation follows the **official MessagePack specification**, producing compact and efficient binary output.

MessagePack features:

* **compact binary format** — smaller and faster than JSON
* **stream-based I/O** — no intermediate buffering
* **automatic encoding** — optimal representation selected transparently
* **multiple input sources** — memory buffers, strings, and streams
* **SAX integration** — consistent API with JSON and XML

---

## Serialization

### PackWriter

Serialize `Value` objects to MessagePack format:

```cpp
#include <join/pack.hpp>

using join;

Value data = Object{
    {"name", "Alice"},
    {"age", 30},
    {"active", true}
};

std::ostringstream out;
PackWriter writer(out);
writer.serialize(data);
```

The output is a **binary MessagePack document** written directly to the stream.

---

### Scalar values

#### Null and booleans

```cpp
writer.setNull();
writer.setBool(true);
writer.setBool(false);
```

---

#### Integers

Signed and unsigned integers are encoded automatically using the most compact representation.

```cpp
writer.setInt(-42);
writer.setUint(42);

writer.setInt64(-123456789);
writer.setUint64(123456789);
```

---

#### Floating-point numbers

```cpp
writer.setDouble(3.14159);
```

---

#### Strings

```cpp
writer.setString("Hello MessagePack");
```

String length and encoding are handled transparently.

---

## Arrays

### Writing arrays

```cpp
writer.startArray(3);
writer.setInt(1);
writer.setInt(2);
writer.setInt(3);
```

Array elements are encoded using the most compact MessagePack representation automatically.

---

## Objects (maps)

### Writing objects

```cpp
writer.startObject(2);

writer.setKey("id");
writer.setInt(42);

writer.setKey("name");
writer.setString("join");
```

Object keys are encoded as strings.

---

## Deserialization

### PackReader

Parse MessagePack data into a `Value`:

```cpp
#include <join/pack.hpp>

using join;

Value root;
PackReader reader(root);

reader.deserialize(buffer, length);
```

---

### Input sources

PackReader accepts multiple input types:

```cpp
// Memory buffer
reader.deserialize(data, length);

// Pointer range
reader.deserialize(first, last);

// std::string
reader.deserialize(str);

// String stream
std::stringstream ss(binaryData);
reader.deserialize(ss);

// File stream
std::ifstream file("data.msgpack");
reader.deserialize(file);

// Generic input stream
std::istream& stream = ...;
reader.deserialize(stream);
```

---

## Parsing behavior

* Exactly **one root value** is parsed
* Trailing data after the root value is reported as an error
* All parsing errors are reported via `join::lastError`

```cpp
if (reader.deserialize(doc) == -1) {
    std::cerr << lastError.message() << "\n";
}
```

---

## Supported data types

| Type            | Supported |
|-----------------|-----------|
| Null            | ✅         |
| Boolean         | ✅         |
| Signed integers | ✅         |
| Unsigned ints   | ✅         |
| 64-bit integers | ✅         |
| Floating point  | ✅         |
| Strings         | ✅         |
| Binary data     | ✅         |
| Arrays          | ✅         |
| Objects         | ✅         |

Binary values are exposed as strings containing raw bytes.

---

## Error handling

MessagePack parsing errors are reported through the SAX error system.

Common error conditions include:

| Error Condition | Description                              |
|-----------------|------------------------------------------|
| `InvalidValue`  | Invalid or unsupported MessagePack value |
| `ExtraData`     | Trailing data after root value           |
| `RangeError`    | Truncated or incomplete input            |

```cpp
if (reader.deserialize(data) == -1) {
    if (lastError == SaxErrc::ExtraData) {
        std::cerr << "Extra data after document\n";
    }
}
```

---

## Performance characteristics

### Streaming parser

PackReader uses **on-the-fly parsing**:

* no intermediate DOM representation
* constant memory overhead
* suitable for large files and network streams

### Binary efficiency

* Compact encoding of numbers and containers
* Minimal overhead compared to text-based formats
* No string escaping or UTF-8 validation cost

---

## Best practices

* Use MessagePack for **network protocols and IPC**
* Prefer MessagePack over JSON for **large or frequent payloads**
* Validate input when parsing untrusted data
* Reuse `PackReader` and `PackWriter` instances
* Stream large documents instead of loading them fully in memory

---

## Example usage

### Complete round-trip

```cpp
#include <join/pack.hpp>
#include <join/value.hpp>

using join;

// Create data
Value data = Object{
    {"users", Array{
        Object{{"name", "Alice"}, {"id", 1}},
        Object{{"name", "Bob"}, {"id", 2}}
    }},
    {"count", 2}
};

// Serialize to MessagePack
std::ostringstream out;
PackWriter writer(out);
writer.serialize(data);

std::string binary = out.str();

// Parse back
Value parsed;
PackReader reader(parsed);
if (reader.deserialize(binary) == 0) {
    std::cout << parsed["count"].getInt() << "\n";
}
```

---

## Summary

| Feature                    | Supported |
|----------------------------|-----------|
| MessagePack serialization  | ✅         |
| MessagePack deserialization| ✅         |
| Streaming I/O              | ✅         |
| Compact binary format      | ✅         |
| Multiple input sources     | ✅         |
| SAX-style API              | ✅         |
| High performance           | ✅         |
