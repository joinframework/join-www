---
title: "SAX API"
weight: 1
---

# SAX API

Join provides a **SAX-style event-driven API** for streaming serialization and deserialization.
The SAX API enables **efficient processing** of structured data formats like JSON, and MessagePack.

SAX features:

* **event-driven** — callback-based parsing
* **streaming** — minimal memory footprint
* **extensible** — support for custom formats
* **high-performance** — optimized for speed

---

## Architecture

The SAX API uses two main abstractions:

### SaxHandler interface

Defines callbacks for data events:

```text
SaxHandler
 ├─ setNull()
 ├─ setBool()
 ├─ setInt() / setUint() / setInt64() / setUint64()
 ├─ setDouble()
 ├─ setString()
 ├─ startArray() / stopArray()
 └─ startObject() / setKey() / stopObject()
```

### StreamWriter / StreamReader

Base classes for serializers and deserializers:

* **StreamWriter** — converts `Value` to formatted output
* **StreamReader** — converts formatted input to `Value`

---

## Serialization

### StreamWriter

Custom serializers inherit from `StreamWriter` and implement SAX callbacks:

```cpp
#include <join/sax.hpp>

using join;

class MyWriter : public StreamWriter {
public:
    MyWriter(std::ostream& out) : StreamWriter(out) {}

    int setNull() override {
        append4("null");
        return 0;
    }

    int setBool(bool value) override {
        if (value) {
            append4("true");
        } else {
            append5("false");
        }
        return 0;
    }

    int setInt(int32_t value) override {
        std::string str = std::to_string(value);
        append(str.c_str(), str.size());
        return 0;
    }

    // Implement other callbacks...
};
```

### Using a writer

```cpp
Value data = Object{{"name", "Alice"}, {"age", 30}};

std::ostringstream out;
MyWriter writer(out);

writer.serialize(data);
std::cout << out.str() << "\n";
```

---

## Deserialization

### StreamReader

Custom deserializers inherit from `StreamReader`:

```cpp
class MyReader : public StreamReader {
public:
    MyReader(Value& root) : StreamReader(root) {}

    int deserialize(const std::string& document) override {
        // Parse document and call SAX callbacks:
        // - setNull(), setBool(), setInt(), etc.
        // - startArray() / stopArray()
        // - startObject() / setKey() / stopObject()
        return 0;
    }

    // Implement other deserialize() overloads...
};
```

### Using a reader

```cpp
Value root;
MyReader reader(root);

if (reader.deserialize(jsonString) == 0) {
    // root now contains parsed data
    std::cout << root["name"].getString() << "\n";
}
```

---

## SAX callbacks

### Primitive values

```cpp
int setNull();                    // null
int setBool(bool value);          // true / false
int setInt(int32_t value);        // -2147483648 to 2147483647
int setUint(uint32_t value);      // 0 to 4294967295
int setInt64(int64_t value);      // 64-bit signed integer
int setUint64(uint64_t value);    // 64-bit unsigned integer
int setDouble(double value);      // floating-point number
int setString(const std::string& value);  // string
```

### Arrays

```cpp
int startArray(uint32_t size = 0);  // Begin array (optional size hint)
// ... add array elements ...
int stopArray();                     // End array
```

### Objects

```cpp
int startObject(uint32_t size = 0);    // Begin object (optional size hint)
int setKey(const std::string& key);    // Set next member key
// ... set member value ...
// ... repeat for each member ...
int stopObject();                      // End object
```

---

## Helper methods (StreamWriter)

StreamWriter provides optimized methods for writing characters:

```cpp
append(char c);                    // Single character
append2(const char* str);          // 2-character literal
append3(const char* str);          // 3-character literal
append4(const char* str);          // 4-character literal
append5(const char* str);          // 5-character literal
append(const char* str, uint32_t size);  // Character array
```

Example usage:

```cpp
append('{');           // Single char
append4("null");       // 4 chars
append5("false");      // 5 chars
append("hello", 5);    // Array
```

---

## Error handling

### SAX error codes

| Error Code         | Description                              |
| ------------------ | ---------------------------------------- |
| `StackOverflow`    | Nesting depth exceeded (max 19 levels)   |
| `InvalidParent`    | Value has no parent array/object         |
| `InvalidValue`     | Value cannot be parsed                   |
| `ExtraData`        | Unexpected data after document end       |

### Checking errors

```cpp
if (reader.deserialize(data) == -1) {
    if (lastError == SaxErrc::StackOverflow) {
        std::cerr << "Document too deeply nested\n";
    } else {
        std::cerr << "Parse error: " << lastError.message() << "\n";
    }
}
```

---

## Nesting depth

StreamReader enforces a **maximum nesting depth of 19 levels** to prevent stack overflow:

```cpp
// OK
{"a": {"b": {"c": ...}}}  // 19 levels deep

// Error: StackOverflow
{"a": {"b": {"c": ...}}}  // 20+ levels deep
```

---

## Best practices

* **Reserve capacity** — use size hints in `startArray()` / `startObject()` for efficiency
* **Minimize allocations** — use `append()` methods for batch writes
* **Handle errors** — check return values from SAX callbacks
* **Limit nesting** — keep document structure within 19 levels
* **Stream processing** — use SAX for large documents to reduce memory usage

---

## Example: custom format

### Simple key-value serializer

```cpp
class KVWriter : public StreamWriter {
public:
    KVWriter(std::ostream& out) : StreamWriter(out) {}

    int setString(const std::string& value) override {
        append(value.c_str(), value.size());
        return 0;
    }

    int startObject(uint32_t size) override {
        return 0;
    }

    int setKey(const std::string& key) override {
        append(key.c_str(), key.size());
        append('=');
        return 0;
    }

    int stopObject() override {
        return 0;
    }

    // Other methods return error
    int setBool(bool) override { return -1; }
    int setInt(int32_t) override { return -1; }
    // ...
};

// Usage
Value data = Object{{"name", "Alice"}, {"city", "Paris"}};
std::ostringstream out;
KVWriter writer(out);
writer.serialize(data);
// Output: "name=Alice city=Paris"
```

---

## Summary

| Feature                    | Supported |
| -------------------------- | --------- |
| Event-driven parsing       | ✅         |
| Streaming serialization    | ✅         |
| Multiple input sources     | ✅         |
| Custom format support      | ✅         |
| Nesting depth protection   | ✅         |
| Optimized batch writes     | ✅         |
