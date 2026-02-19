---
title: "Data"
weight: 40
bookCollapseSection: true
---

# Data Module

The **Data** module provides high-performance data serialization with support for JSON and MessagePack formats, offering both SAX-style event-driven parsing and DOM-style value containers.

---

## 🔍 View Classes

Efficient input abstraction layer providing unified access to different data sources:

### StringView

Zero-copy view over string data for memory-efficient parsing:

**Features:**
- Direct pointer-based navigation
- No memory allocation
- Fast character access and lookahead
- Position tracking (seekable)

**Use Cases:**
- Parsing JSON/MessagePack from memory buffers
- Configuration file parsing
- Zero-copy data validation

### BasicStreamView

Template-based stream adapter with compile-time seekability control:

**Variants:**
- `StringStreamView` (seekable)
- `FileStreamView` (seekable)
- `StreamView` (non-seekable, for pipes/network)

**Features:**
- Unified interface for different stream types
- Efficient buffered access
- Optional seek support
- Stream buffer integration

### BufferingView

Adapter that captures parsed content for error reporting:

**Features:**
- Records consumed characters
- Seekable: uses position tracking
- Non-seekable: uses thread-local buffer
- Snapshot and consume operations

**Use Cases:**
- Error context capture
- Token extraction
- Parse validation

### Optimized Operations

**Character Operations:**
- `peek()` / `get()` - Look ahead and extract
- `getIf(char)` - Conditional extraction
- `getIfNoCase(char)` - Case-insensitive matching
- `read(buf, count)` - Bulk reading

**Specialized Methods:**
- `readUntilEscaped()` - Fast string content extraction
- `skipWhitespaces()` - Efficient whitespace skipping
- `skipWhitespacesAndComments()` - JSON comment support

**Performance Features:**
- Lookup tables for character classification
- Zero-copy operations where possible
- Branch prediction optimization

---

## 🎭 SAX-Style Parsing

Event-driven parsing architecture for memory-efficient processing of large data streams:

### SAX Handler Interface

Pure virtual interface for receiving parsing events:

**Events:**
- `setNull()` - Null value
- `setBool(bool)` - Boolean value
- `setInt(int64_t)` - Integer value
- `setUint(uint64_t)` - Unsigned integer
- `setDouble(double)` - Floating-point value
- `setString(string)` - String value
- `startObject()` / `endObject()` - Object boundaries
- `startArray()` / `endArray()` - Array boundaries
- `key(string)` - Object key

**Features:**
- Stack-based parsing with depth limit (19 levels)
- Event-driven architecture for minimal memory usage
- Suitable for streaming large datasets

### StreamReader / StreamWriter

Abstract base classes for serializers and deserializers providing common functionality.

---

## 📄 JSON Support

High-performance JSON parsing and serialization:

### JsonReader

Event-driven JSON parser with flexible parsing modes:

**Parse Modes:**
- Comment support (C++ and C-style comments)
- Encoding validation (strict UTF-8)
- Stop on done (handle concatenated JSON)
- Trailing comma tolerance

**Input Sources:**
- StringView
- FileStreamView
- StreamView
- Custom stream buffers

**Features:**
- Optimized number parsing (fast path + fallback)
- UTF-8 and Unicode handling
- Validation with detailed error messages
- Support for large numbers (int64, uint64)

### JsonWriter

JSON serialization with formatting options:

**Features:**
- Compact output (no whitespace)
- Pretty-printing with indentation
- Configurable indent width
- Efficient string escaping

**Output:**
- Stream-based writing
- Direct to string
- Memory-efficient serialization

### JsonCanonicalizer

RFC 8785 canonical JSON output for cryptographic applications:

**Features:**
- Deterministic output
- Normalized number representation
- Sorted object keys
- Minimal whitespace

**Use Cases:**
- Digital signatures
- Hash computation
- Secure comparisons
- Cryptographic protocols

---

## 📦 MessagePack Support

Binary serialization format for efficient data interchange:

### PackReader

MessagePack binary format parser:

**Features:**
- Compact binary representation
- Type preservation
- Fast parsing
- Stream-based input

**Supported Types:**
- Integers (signed/unsigned, various sizes)
- Floating-point numbers
- Strings
- Binary data
- Arrays
- Maps (objects)
- Null, boolean

### PackWriter

MessagePack binary format serializer:

**Features:**
- Efficient binary output
- Automatic size optimization
- Stream-based writing
- Full MessagePack specification support

---

## 💎 Value Container

Dynamic type container for parsed data with both DOM and streaming interfaces:

### Value

Variant-based value storage supporting JSON/MessagePack types:

**Types:**
- `null`
- `bool`
- `int` (int32)
- `uint` (uint32)
- `int64`
- `uint64`
- `double`
- `string`
- `array` (vector of Values)
- `object` (map of string to Value)

**Features:**
- Type conversion and checking (`isInt()`, `getInt()`, etc.)
- Array manipulation (`at()`, `pushBack()`, `size()`)
- Object manipulation (`contains()`, `insert()`, subscript operator)
- Direct JSON/MessagePack read/write methods

**Interfaces:**
```cpp
// Type queries
bool isNull(), isBool(), isInt(), isString(), ...

// Type conversion
bool getBool(), int getInt(), string getString(), ...

// Array operations
Value& at(size_t), void pushBack(Value), size_t size()

// Object operations
bool contains(string), Value& operator[](string)
```

---

## 🗜️ Compression

### ZStream

Transparent zlib compression/decompression for streams:

**Features:**
- Compression levels 0-9
- Gzip format support
- Stream-based interface
- Efficient buffering

**Use Cases:**
- Compressed file I/O
- Network data compression
- HTTP content encoding
- Archive processing

---

## Performance Optimizations

### Number Parsing

The JSON parser uses a two-phase approach:
1. **Fast path**: Optimized parsing for common cases
2. **Fallback**: Full-featured parsing for edge cases

### Zero-Copy Operations

Where possible, the parser uses string views to avoid copying:
- String values reference original buffer
- Keys use string_view internally
- Efficient for read-only access

### Memory Efficiency

- SAX interface for streaming large files
- Lazy parsing with Value container
- Efficient string storage
- Optimized container allocations

---

## Use Cases

### Configuration Files
- Parse JSON configuration
- Write formatted settings
- Validate structure

### API Communication
- REST API data exchange
- Serialize/deserialize requests
- Handle streaming responses

### Data Processing
- Process large datasets with SAX
- Transform between formats
- Filter and validate data

### Binary Protocols
- MessagePack for efficient IPC
- Compact data transmission
- Protocol buffer alternative

---

## Format Comparison

| Feature | JSON | MessagePack |
|---------|------|-------------|
| **Human-Readable** | ✓ | ✗ |
| **Compact** | ✗ | ✓ |
| **Speed** | Good | Excellent |
| **Binary Data** | Base64 | Native |
| **Use Case** | Config, APIs | IPC, Storage |

---

## 📚 API Reference

For detailed API documentation, see:

[Doxygen Reference](https://joinframework.github.io/join/)