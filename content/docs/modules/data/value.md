---
title: "Value"
weight: 50
---

# Value

`Value` is the **core dynamic data type** used across Join for JSON and MessagePack handling.
It represents a **type-safe variant** capable of storing scalar values, arrays, and objects,
with automatic conversions and container-like operations.

`Value` is designed to be:

* **format-agnostic** — shared by JSON and MessagePack
* **type-safe** — explicit accessors with runtime checks
* **flexible** — automatic promotion and conversion
* **container-friendly** — array and object semantics

---

## Supported value types

A `Value` can hold exactly one of the following types:

| Type        | C++ type            |
|------------|---------------------|
| Null       | `std::nullptr_t`    |
| Boolean    | `bool`              |
| Integer    | `int32_t`           |
| Unsigned   | `uint32_t`          |
| Integer64  | `int64_t`           |
| Unsigned64 | `uint64_t`          |
| Real       | `double`            |
| String     | `std::string`       |
| Array      | `join::Array`       |
| Object     | `join::Object`      |

Arrays and objects are recursive and can contain nested `Value` instances.

---

## Construction

### Default value

```cpp
Value v;          // null
Value n = nullptr;
```

### Scalar values

```cpp
Value b = true;
Value i = 42;
Value u = 42u;
Value f = 3.14;
Value s = "hello";
```

### Arrays and objects

```cpp
Value arr = Array{1, 2, 3};

Value obj = Object{
    {"name", "Alice"},
    {"age", 30}
};
```

---

## Type inspection

Check the stored type before accessing:

```cpp
if (v.isNumber()) { ... }
if (v.isString()) { ... }
if (v.isArray())  { ... }
if (v.isObject()) { ... }
```

Numeric helpers:

```cpp
v.isInt8();
v.isUint16();
v.isInt();
v.isUint64();
v.isFloat();
v.isDouble();
```

---

## Value access

### Scalars

```cpp
bool        b = v.getBool();
int32_t     i = v.getInt();
uint64_t    u = v.getUint64();
double      d = v.getDouble();
std::string s = v.getString();
```

All getters perform **runtime validation** and throw `std::bad_cast` on failure.

### Explicit conversions

```cpp
int32_t  i = static_cast<int32_t>(v);
double   d = static_cast<double>(v);
bool     b = static_cast<bool>(v);
```

---

## Array access

```cpp
Value arr = Array{10, 20, 30};

arr[0] = 5;
arr.pushBack(40);

for (size_t i = 0; i < arr.size(); ++i)
{
    std::cout << arr[i].getInt() << "\n";
}
```

Safe access:

```cpp
if (arr.contains(2))
{
    auto v = arr.at(2);
}
```

---

## Object access

```cpp
Value obj;

obj["name"] = "Alice";
obj["age"]  = 30;
```

Access members:

```cpp
std::string name = obj["name"].getString();
int age = obj.at("age").getInt();
```

Membership tests:

```cpp
if (obj.contains("name")) { ... }
```

---

## Container utilities

```cpp
v.empty();
v.size();
v.clear();
v.reserve(16);
```

Object-specific:

```cpp
obj.insert({"key", 42});
obj.erase("key");
```

---

## Comparison operators

`Value` supports full comparison semantics:

```cpp
v1 == v2
v1 != v2
v1 <  v2
v1 <= v2
v1 >  v2
v1 >= v2
```

Numeric comparisons are **type-normalized** automatically:

```cpp
Value a = 10;
Value b = 10.0;

assert(a == b);
```

---

## Serialization

### JSON

```cpp
Value v;

v.jsonRead(jsonString);

v.jsonWrite(std::cout, 2);     // pretty print
v.jsonCanonicalize(std::cout);
```

### MessagePack

```cpp
Value v;

v.packRead(buffer, length);

v.packWrite(std::cout);
```

### Generic readers and writers

```cpp
v.deserialize<JsonReader>(json);
v.serialize<PackWriter>(out);
```

---

## Error handling

All serialization and deserialization functions return:

* `0` on success
* `-1` on error

Detailed error information is provided by the underlying reader or writer.

---

## Best practices

* Prefer **explicit getters** over implicit conversions
* Check type with `is*()` before accessing
* Use `operator[]` for object construction
* Use `at()` for validated access
* Reuse `Value` instances to avoid allocations

---

## Summary

| Feature                     | Supported |
|----------------------------|-----------|
| Dynamic typing              | ✅        |
| Numeric auto-conversion     | ✅        |
| JSON integration            | ✅        |
| MessagePack integration     | ✅        |
| Nested arrays and objects   | ✅        |
| Comparison operators        | ✅        |
| Stream-based IO             | ✅        |
