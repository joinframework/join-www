---
title: "Sax"
weight: 4
---

# Sax

The **Sax** module provides high-performance data serialization using SAX-style event-driven parsing for JSON and MessagePack formats.

---

## Components

### DiyFp / Dtoa

Optimized double-to-string conversion using Grisu2 algorithm.

**Features:**

* Fast floating-point to string conversion
* Hand-made floating-point arithmetic
* Optimized for performance

---

### JSON

JSON parsing and serialization with multiple modes.

**Classes:**

* **JsonReader** - Event-driven JSON parser with validation modes
* **JsonWriter** - JSON serializer with optional indentation
* **JsonCanonicalizer** - RFC 8785 canonical JSON output

**Features:**

* Stream-based parsing (StringView, FileStreamView, StreamView)
* Parse modes (comments, encoding validation, stop on done)
* Optimized number parsing (fast path + fallback)
* UTF-8/Unicode handling

---

### Pack

MessagePack binary format parsing and serialization.

**Classes:**

* **PackReader** - MessagePack binary format parser
* **PackWriter** - MessagePack binary format serializer

**Features:**

* Compact binary serialization
* Stream-based interface
* Full MessagePack specification support

---

### SAX

SAX-style event-driven parsing interface.

**Classes:**

* **SaxHandler** - Pure virtual interface for SAX events
* **StreamWriter** - Abstract base for serializers
* **StreamReader** - Abstract base for deserializers

**Features:**

* Event-driven architecture (setNull, setBool, setInt, startArray, etc.)
* Stack-based parsing with depth limit (19 levels)
* Multiple input stream support

---

### Value

Dynamic type container for parsed data.

**Features:**

* Variant-based value storage (null, bool, int, uint, int64, uint64, double, string, array, object)
* Type conversion and checking (isInt, getInt, etc.)
* Array and object manipulation (at, contains, pushBack, insert)
* Direct JSON/MessagePack read/write methods

---

## API Reference

For detailed API documentation, see:

🔗 [Doxygen SAX Module Reference](https://joinframework.github.io/join/)
