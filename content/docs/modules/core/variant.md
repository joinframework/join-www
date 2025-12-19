---
title: "Variant"
weight: 5
---

# Variant

Join provides a **type-safe union** implementation that can hold one of several alternative types.
Variant is a **lightweight alternative to `std::variant`** with a simple, intuitive API.

Variants are:

* **type-safe** — compile-time type checking
* **exception-safe** — proper RAII semantics
* **constexpr-ready** — usable in constant expressions
* **comparable** — equality and ordering operators

---

## Basic usage

### Creating a variant

```cpp
#include <join/variant.hpp>

using join;

Variant<int, std::string, double> v;  // Holds int (first type by default)
```

The variant is default-constructed with the first alternative type if it's default-constructible.

---

## Assigning values

### Direct assignment

```cpp
Variant<int, std::string> v;

v = 42;              // Holds int
v = "hello";         // Now holds std::string
v = std::string{};   // Explicit type
```

The variant automatically determines the correct alternative based on the assigned type.

---

## Setting values explicitly

### Using `set` with type

```cpp
Variant<int, std::string, double> v;

v.set<std::string>("hello");
v.set<int>(42);
v.set<double>(3.14);
```

### Using `set` with index

```cpp
v.set<0>(42);           // First alternative (int)
v.set<1>("world");      // Second alternative (std::string)
v.set<2>(2.71);         // Third alternative (double)
```

---

## Retrieving values

### Using `get` (throws on type mismatch)

```cpp
Variant<int, std::string> v = 42;

int value = v.get<int>();              // OK
std::string s = v.get<std::string>();  // throws std::bad_cast
```

### Using `getIf` (safe, returns nullptr on mismatch)

```cpp
Variant<int, std::string> v = "hello";

if (auto* str = v.getIf<std::string>()) {
    // Use *str
}

if (auto* num = v.getIf<int>()) {
    // Not executed
}
```

---

## Type checking

### Check active type

```cpp
Variant<int, std::string, double> v = 42;

if (v.is<int>()) {
    // true
}

if (v.is<std::string>()) {
    // false
}
```

### Check by index

```cpp
if (v.is<0>()) {
    // Checking if first alternative is active
}
```

### Get current index

```cpp
std::size_t idx = v.index();  // Returns 0, 1, 2, etc.
```

---

## In-place construction

### Using `in_place_type`

```cpp
Variant<int, std::string> v(in_place_type_t<std::string>{}, "hello");
```

### Using `in_place_index`

```cpp
Variant<int, std::string> v(in_place_index_t<1>{}, "world");
```

### With initializer lists

```cpp
Variant<int, std::vector<int>> v(
    in_place_type_t<std::vector<int>>{}, 
    {1, 2, 3, 4, 5}
);
```

---

## Comparison operators

Variants support all comparison operators if their alternatives do.

```cpp
Variant<int, std::string> v1 = 42;
Variant<int, std::string> v2 = 42;
Variant<int, std::string> v3 = 100;

v1 == v2  // true
v1 != v3  // true
v1 < v3   // true
```

When comparing variants with different active alternatives, the index determines the order.

---

## Move semantics

Variants fully support move construction and assignment.

```cpp
Variant<int, std::string> v1 = "hello";
Variant<int, std::string> v2 = std::move(v1);  // Efficient move
```

---

## Best practices

* Use **`getIf`** instead of `get` when the type is uncertain
* Check type with **`is`** before calling `get` to avoid exceptions
* Prefer **type-based access** over index-based for clarity
* Use **in-place construction** for efficiency with complex types

---

## Summary

| Feature                  | Supported |
| ------------------------ | --------- |
| Type-safe storage        | ✅         |
| Exception-safe           | ✅         |
| Comparison operators     | ✅         |
| Move semantics           | ✅         |
| Constexpr support        | ✅         |
| In-place construction    | ✅         |
