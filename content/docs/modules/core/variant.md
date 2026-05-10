---
title: "Variant"
weight: 180
---

# Variant

Join provides a **type-safe union** implementation that can hold one of several alternative types.
`Variant` is a lightweight alternative to `std::variant` with a simple, intuitive API.

Variants are:

* **type-safe** — compile-time type checking
* **exception-safe** — proper RAII semantics
* **constexpr-ready** — usable in constant expressions
* **comparable** — full set of equality and ordering operators

---

## Basic usage

### Creating a variant

```cpp
#include <join/variant.hpp>

using namespace join;

// Default-constructed with the first alternative (int)
Variant<int, std::string, double> v;
```

The variant is default-constructed with the first alternative type if it is default-constructible.
If the first alternative is not default-constructible, the default constructor is disabled.

---

## Assigning values

```cpp
Variant<int, std::string> v;

v = 42;           // holds int
v = "hello";      // now holds std::string (conversion via overload resolution)
```

The variant automatically selects the correct alternative based on the assigned type.

---

## Setting values explicitly

### By type

```cpp
Variant<int, std::string, double> v;

v.set<std::string>("hello");
v.set<int>(42);
v.set<double>(3.14);
```

`set<T>()` returns a reference to the newly stored value:

```cpp
std::string& s = v.set<std::string>("world");
```

### By index

```cpp
v.set<0>(42);      // first alternative (int)
v.set<1>("world"); // second alternative (std::string)
v.set<2>(2.71);    // third alternative (double)
```

---

## Retrieving values

### `get` — throws on type mismatch

```cpp
Variant<int, std::string> v = 42;

int value = v.get<int>();             // OK
std::string s = v.get<std::string>(); // throws std::bad_cast
```

Both type-based and index-based forms are available:

```cpp
int value = v.get<0>(); // same as get<int>() when int is at index 0
```

### `getIf` — returns nullptr on mismatch

```cpp
Variant<int, std::string> v = "hello";

if (auto* str = v.getIf<std::string>())
{
    std::cout << *str << "\n"; // safe
}

if (auto* num = v.getIf<int>())
{
    // not reached
}
```

`getIf` also accepts an index:

```cpp
if (auto* str = v.getIf<1>()) { /* ... */ }
```

---

## Type checking

### Check active type

```cpp
Variant<int, std::string, double> v = 42;

v.is<int>();    // true
v.is<double>(); // false
```

### Check by index

```cpp
v.is<0>(); // true if first alternative is active
```

### Get current index

```cpp
std::size_t idx = v.index(); // 0, 1, 2, …
```

---

## In-place construction

### By type

```cpp
Variant<int, std::string> v(in_place_type_t<std::string>{}, "hello");
```

### By index

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

All six comparison operators are provided. Two variants are compared first by active alternative index, then by value if both hold the same alternative:

```cpp
Variant<int, std::string> v1 = 42;
Variant<int, std::string> v2 = 42;
Variant<int, std::string> v3 = 100;

v1 == v2; // true  — same index, same value
v1 != v3; // true  — same index, different value
v1 < v3;  // true  — same index, 42 < 100

Variant<int, std::string> v4 = std::string("a");
v1 < v4;  // true  — index 0 < index 1
```

`nullptr_t` alternatives always compare as equal to each other in ordering (neither is less than the other).

---

## Swap

```cpp
Variant<int, std::string> a = 42;
Variant<int, std::string> b = "hello";

a.swap(b);
// a holds "hello", b holds 42

using join::swap;
swap(a, b); // ADL-friendly free function
```

---

## Type constraints

```cpp
// ✅ Valid — all are non-void, non-array, non-reference
Variant<int, std::string, double> v;

// ❌ void alternative — static_assert fails
Variant<int, void> bad;

// ❌ reference alternative — static_assert fails
Variant<int, int&> bad;

// ❌ array alternative — static_assert fails
Variant<int, int[4]> bad;
```

Copy/move constructors and assignment operators are conditionally disabled based on whether all alternatives support them.

---

## Best practices

- Use **`getIf`** instead of `get` when the active type is uncertain — avoids exceptions on the hot path.
- Check with **`is<T>()`** before `get<T>()` when you want explicit control without exceptions.
- Prefer **type-based access** over index-based for readability.
- Use **in-place construction** for efficiency with complex types that are expensive to move.

---

## Summary

| Feature               | Supported |
| --------------------- | :-------: |
| Type-safe storage     | ✅        |
| Exception-safe RAII   | ✅        |
| All comparison operators (`==` `!=` `<` `>` `<=` `>=`) | ✅ |
| Copy and move semantics | ✅      |
| Constexpr support     | ✅        |
| In-place construction | ✅        |
| Index-based access    | ✅        |
| Type-based access     | ✅        |
| `swap`                | ✅        |
