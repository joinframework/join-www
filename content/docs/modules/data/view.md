---
title: "View"
weight: 10
---

# View

`View` classes provide **efficient, zero-copy access** to character streams for parsing and serialization.
They are the foundation of Join's JSON and MessagePack readers, offering a **unified interface** across
different input sources with minimal overhead.

View classes are designed to be:

* **zero-copy** — direct access to underlying data without allocation
* **type-agnostic** — works with strings, streams, and buffers
* **efficient** — optimized for parsing hot paths
* **flexible** — seekable and non-seekable variants

---

## View types

Join provides several view classes optimized for different input sources:

| Type                  | Use case                          | Seekable | Zero-copy |
|-----------------------|-----------------------------------|----------|-----------|
| `StringView`          | In-memory strings and buffers     | ✅       | ✅        |
| `StringStreamView`    | `std::stringstream` and similar   | ✅       | ❌        |
| `FileStreamView`      | File streams                      | ✅       | ❌        |
| `StreamView`          | Pipes, network streams            | ❌       | ❌        |
| `BufferingView<T>`    | Adds buffering to any view        | Depends  | ❌        |

---

## StringView

The fastest view for in-memory data with zero allocations.

### Construction

```cpp
const char* data = R"({"key": "value"})";

// From pointer and length
StringView view1(data, strlen(data));

// From pointer pair
StringView view2(data, data + strlen(data));

// From null-terminated string
StringView view3(data);
```

### Basic operations

```cpp
StringView view(data, length);

// Read single character
int c = view.get();

// Peek without advancing
int next = view.peek();

// Conditional extraction
if (view.getIf('{'))
{
    // Character was '{'
}

// Case-insensitive check
if (view.getIfNoCase('t'))
{
    // Matched 't' or 'T'
}
```

### Bulk operations

```cpp
// Read multiple characters
char buffer[64];
size_t nread = view.read(buffer, sizeof(buffer));

// Read until escaped character
std::string content;
view.readUntilEscaped(content);  // Fast string building
```

### Position management

```cpp
// Save position
auto pos = view.tell();

// Parse something...

// Restore position
view.seek(pos);
```

---

## Stream views

For `std::istream` based input.

### Using stream views

```cpp
std::ifstream file("data.json");
FileStreamView view(file);

std::stringstream ss(jsonData);
StringStreamView view2(ss);

// Non-seekable (pipes, network)
StreamView view3(std::cin);
```

### Operations

Stream views provide the same interface as `StringView`:

```cpp
FileStreamView view(file);

view.get();
view.peek();
view.getIf('"');
view.read(buffer, count);
view.readUntilEscaped(str);

// Seekable streams only
auto pos = view.tell();
view.seek(pos);
```

---

## Whitespace handling

All views include optimized whitespace skipping.

### Skip whitespace

```cpp
// Skip spaces, tabs, newlines, carriage returns
view.skipWhitespaces();

if (view.peek() == '{')
{
    // First non-whitespace character
}
```

### Skip whitespace and comments

Useful for relaxed JSON parsing:

```cpp
// Skip whitespace, // comments, and /* block comments */
if (view.skipWhitespacesAndComments() == 0)
{
    // Success
}
```

Comments supported:
- `// single line`
- `/* multi-line */`

```cpp
StringView view(R"(
    // This is a comment
    {
        /* Block comment */
        "key": "value"
    }
)");

view.skipWhitespacesAndComments();
// Now at '{'
```

---

## BufferingView

Wraps any view to capture consumed data.

### Seekable buffering

For seekable views, uses position tracking:

```cpp
StringView base(data, length);
BufferingView<StringView> view(base);

view.get();
view.get();
view.get();

// Get what was consumed
std::string consumed;
view.consume(consumed);  // Contains 3 characters
```

### Non-seekable buffering

For non-seekable views, uses thread-local buffer:

```cpp
StreamView base(std::cin);
BufferingView<StreamView> view(base);

// Parse token
while (std::isalnum(view.peek()))
{
    view.get();
}

// Extract parsed token
std::string token;
view.consume(token);
```

### Snapshot vs consume

```cpp
BufferingView<StringView> view(base);

// Parse something
view.get();
view.get();

// Get copy without clearing buffer
std::string snapshot;
view.snapshot(snapshot);

// Get and clear buffer
std::string consumed;
view.consume(consumed);
```

---

## Usage with parsers

Views are designed for efficient parsing.

### JSON parsing example

```cpp
void parseString(StringView& view, std::string& out)
{
    view.getIf('"');  // Skip opening quote

    while (true)
    {
        view.readUntilEscaped(out);

        int c = view.peek();
        if (c == '"')
        {
            view.get();
            break;
        }
        if (c == '\\')
        {
            // Handle escape sequence
            view.get();
            c = view.get();
            // ... process escape
        }
    }
}
```

### Parser integration

```cpp
template <typename ViewType>
class JsonReader
{
    ViewType& _view;

public:
    JsonReader(ViewType& view) : _view(view)
    {}

    int parseValue(Value& val)
    {
        _view.skipWhitespaces();

        int c = _view.peek();
        switch (c)
        {
            case '{': return parseObject(val);
            case '[': return parseArray(val);
            case '"': return parseString(val);
            // ...
        }
    }
};
```

---

## Performance characteristics

### StringView

- **Zero allocations** for read operations
- **Direct memory access** via pointer arithmetic
- **Branch-predicted loops** for scanning
- **Cache-friendly** sequential access
- **Lookup tables** for character classification

### Stream views

- **Minimal virtual calls** via `std::streambuf`
- **Buffered I/O** by underlying stream
- **Seekable** when stream supports it

### BufferingView

- **Thread-local storage** for non-seekable views
- **No copying** for seekable views (position-based)
- **Amortized O(1)** character buffering

---

## Best practices

### Choose the right view

```cpp
// Best: Zero-copy for in-memory data
StringView view(data.c_str(), data.size());

// Good: For file I/O
std::ifstream file("data.json");
FileStreamView view(file);

// Necessary: For pipes/network
StreamView view(socket_stream);
```

### Minimize allocations

```cpp
// Good: Reserve capacity
std::string result;
result.reserve(estimated_size);
view.readUntilEscaped(result);

// Avoid: Growing incrementally
std::string result;
while (...)
{
    result += view.get();  // May reallocate
}
```

### Use buffering when needed

```cpp
// Need to extract tokens
BufferingView<StringView> view(base);

while (parseToken(view))
{
    std::string token;
    view.consume(token);
    processToken(token);
}
```

### Handle errors

```cpp
if (view.skipWhitespacesAndComments() != 0)
{
    // Unclosed comment
    return -1;
}

int c = view.get();
if (c == std::char_traits<char>::eof())
{
    // Unexpected end of input
    return -1;
}
```

---

## Advanced features

### Case-insensitive matching

Useful for parsing protocols:

```cpp
// Match "true", "True", "TRUE", etc.
if (view.getIfNoCase('t') &&
    view.getIfNoCase('r') &&
    view.getIfNoCase('u') &&
    view.getIfNoCase('e'))
{
    return true;
}
```

### Optimized scanning

`readUntilEscaped` uses lookup tables:

```cpp
// Efficiently scans until: ", \, or control characters
view.readUntilEscaped(out);

// Implemented with:
// - Aligned lookup table (64-byte)
// - Single table lookup per character
// - No branches in hot path
```

### Type traits

Check view capabilities at compile-time:

```cpp
template <typename ViewType>
void process(ViewType& view)
{
    if constexpr (is_seekable<ViewType>::value)
    {
        auto pos = view.tell();
        // ... can seek
    }
    else
    {
        BufferingView<ViewType> buffered(view);
        // ... use buffering instead
    }
}
```

---

## Summary

| Feature                    | Supported |
|----------------------------|-----------|
| Zero-copy string access    | ✅        |
| Stream-based parsing       | ✅        |
| Seekable and non-seekable  | ✅        |
| Comment parsing            | ✅        |
| Buffering adapter          | ✅        |
| Case-insensitive matching  | ✅        |
| Thread-safe                | ✅        |
| Optimized hot paths        | ✅        |
