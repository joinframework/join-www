---
title: "File Cache"
weight: 1
---

# File Cache

Join provides **memory-mapped file caching** for efficient repeated access to file contents.
It uses `mmap()` to map files directly into memory and automatically tracks file modifications,
making it ideal for serving static content or frequently accessed files.

`Cache` is designed to be:

* **zero-copy** — direct memory access via `mmap()`
* **automatic** — tracks file modifications and invalidates stale entries
* **thread-safe** — concurrent access protected by mutex
* **efficient** — avoids redundant file I/O

---

## Key features

| Feature                    | Description                              |
|----------------------------|------------------------------------------|
| Memory mapping             | Uses `mmap()` for zero-copy access       |
| Automatic invalidation     | Detects file changes by modification time|
| Thread-safe operations     | Protected by internal mutex              |
| Lazy loading               | Files mapped only when requested         |
| Resource management        | Automatic cleanup on destruction         |

---

## Basic usage

### Creating a cache

```cpp
#include <join/cache.hpp>

Cache cache;
```

The cache is thread-safe and can be shared across multiple threads.

### Getting cached file

```cpp
Cache cache;

struct stat sbuf;
void* data = cache.get("/path/to/file.txt", sbuf);

if (data != nullptr)
{
    // File successfully cached
    size_t fileSize = sbuf.st_size;

    // Access file contents directly
    const char* content = static_cast<const char*>(data);
    processData(content, fileSize);
}
```

### Basic lifecycle

```cpp
Cache cache;

// First access - file is read and mapped
struct stat sbuf;
void* data1 = cache.get("file.txt", sbuf);

// Second access - returned from cache (no I/O)
void* data2 = cache.get("file.txt", sbuf);
// data1 == data2

// File modified externally...

// Next access - detects change, remaps file
void* data3 = cache.get("file.txt", sbuf);
// data3 != data1 (new mapping)
```

---

## Cache operations

### Get or create entry

```cpp
Cache cache;

struct stat sbuf;
void* ptr = cache.get(filename, sbuf);

if (ptr == nullptr)
{
    // File doesn't exist, is a directory, or mapping failed
    handleError();
}
else
{
    // Use cached data
    processFile(ptr, sbuf.st_size);
}
```

The `get()` method:
1. Checks if file exists and is not a directory
2. Looks for existing cache entry
3. Validates entry against file modification time
4. Returns cached data if valid
5. Remaps file if changed or not cached
6. Returns pointer to mapped memory

### Remove entry

```cpp
Cache cache;

// Remove specific file from cache
cache.remove("/path/to/file.txt");

// File is unmapped and entry is deleted
// Next get() will remap the file
```

### Clear all entries

```cpp
Cache cache;

// Clear entire cache
cache.clear();

// All files are unmapped
// Cache is empty
```

### Query cache size

```cpp
Cache cache;

size_t count = cache.size();
// Returns number of cached files
```

---

## Modification tracking

The cache automatically detects file changes using modification timestamps.

### How it works

```cpp
Cache cache;

// Initial load
struct stat sbuf1;
void* data1 = cache.get("file.txt", sbuf1);

// File modified externally (via editor, build system, etc.)
system("echo 'new content' > file.txt");

// Next access detects change
struct stat sbuf2;
void* data2 = cache.get("file.txt", sbuf2);

// Cache automatically:
// 1. Detected modification time changed
// 2. Unmapped old version
// 3. Mapped new version
// 4. Returned pointer to new data
```

### Validation criteria

```cpp
// Entry is valid if BOTH match:
if (cached.modifTime.tv_sec  == stat.st_ctim.tv_sec &&
    cached.modifTime.tv_nsec == stat.st_ctim.tv_nsec)
{
    // Use cached version
}
else
{
    // Remap file
}
```

---

## Thread safety

All cache operations are thread-safe.

### Concurrent access

```cpp
Cache cache;  // Shared across threads

// Thread 1
std::thread t1([&cache]() {
    struct stat sbuf;
    void* data = cache.get("file1.txt", sbuf);
    process(data, sbuf.st_size);
});

// Thread 2
std::thread t2([&cache]() {
    struct stat sbuf;
    void* data = cache.get("file2.txt", sbuf);
    process(data, sbuf.st_size);
});

// Thread 3
std::thread t3([&cache]() {
    cache.remove("file3.txt");
});

t1.join();
t2.join();
t3.join();
```

### Thread safety guarantees

- All operations are atomic with respect to the cache state
- Internal mutex protects the entries map
- Multiple threads can safely call any cache method
- However, the returned pointers are NOT protected - see safety considerations below

---

## Use cases

### Web server static files

```cpp
class HttpServer
{
    Cache fileCache;

public:
    void serveStaticFile(const std::string& path, HttpResponse& response)
    {
        struct stat sbuf;
        void* data = fileCache.get(path, sbuf);
        if (data == nullptr)
        {
            response.status(404);
            return;
        }

        response.status(200);
        response.header("Content-Length", std::to_string(sbuf.st_size));
        response.write(data, sbuf.st_size);
    }
};
```

---

## Performance characteristics

### Memory mapping benefits

| Operation          | Traditional I/O | Memory-mapped |
|--------------------|-----------------|---------------|
| First access       | read() + copy   | mmap()        |
| Subsequent access  | read() + copy   | pointer deref |
| Memory overhead    | 2x file size    | 1x file size  |
| Page faults        | N/A             | On-demand     |

### Cache efficiency

```cpp
// Traditional approach (repeated I/O)
for (int i = 0; i < 1000; ++i)
{
    std::ifstream file("data.txt");
    std::string content((std::istreambuf_iterator<char>(file)), std::istreambuf_iterator<char>());
    process(content);
}
// 1000 file opens, 1000 reads

// Cached approach (single mmap)
Cache cache;
for (int i = 0; i < 1000; ++i)
{
    struct stat sbuf;
    void* data = cache.get("data.txt", sbuf);
    process(data, sbuf.st_size);
}
// 1 file open, 1 mmap, 999 cache hits
```

### Memory characteristics

- Files are mapped `MAP_PRIVATE` with `PROT_READ`
- Kernel manages page-in/page-out automatically
- Multiple processes can share the same physical pages
- Unused pages can be evicted by kernel when memory is tight

---

## Safety considerations

### Pointer validity

```cpp
Cache cache;

struct stat sbuf;
void* ptr1 = cache.get("file.txt", sbuf);

// Pointer is valid...

// File modified externally
modifyFile("file.txt");

// Next get invalidates ptr1!
void* ptr2 = cache.get("file.txt", sbuf);

// ptr1 is now DANGLING - do not use!
// ptr2 points to new mapping
```

**Important:** Once a file is remapped, previous pointers become invalid.

### Safe usage pattern

```cpp
Cache cache;

void processFile(const std::string& path)
{
    struct stat sbuf;
    void* data = cache.get(path, sbuf);

    if (data != nullptr)
    {
        // Use data immediately
        process(data, sbuf.st_size);
        // Don't store pointer for later use
    }
}
```

---

## Best practices

### Use for read-only files

```cpp
// Good: Read-only access to static content
Cache cache;
void* data = cache.get("/var/www/index.html", sbuf);

// Bad: Don't use for files you're actively writing to
// (cache won't see changes until next get())
```

### Don't store pointers

```cpp
// Bad: Storing pointer
class BadExample
{
    void* cachedData;

    void init(Cache& cache)
    {
        struct stat sbuf;
        cachedData = cache.get("file.txt", sbuf);  // Dangerous!
    }
};

// Good: Get pointer when needed
class GoodExample
{
    Cache& cache;
    std::string filename;

    void process()
    {
        struct stat sbuf;
        void* data = cache.get(filename, sbuf);
        if (data) use(data, sbuf.st_size);
    }
};
```

### Check for null

```cpp
// Always check return value
struct stat sbuf;
void* data = cache.get(path, sbuf);

if (data == nullptr)
{
    // Handle error: file missing, permission denied, etc.
    return;
}

// Safe to use data here
```

### Share cache instance

```cpp
// Good: Single shared cache
class Application
{
    Cache sharedCache;

    void handleRequest1()
    {
        useCache(sharedCache);
    }

    void handleRequest2()
    {
        useCache(sharedCache);
    }
};
```

---

## Limitations

### File type restrictions

```cpp
// Won't cache directories
void* data = cache.get("/path/to/dir", sbuf);  // Returns nullptr

// Only regular files are cached
S_ISDIR(sbuf.st_mode) == false
```

### Memory considerations

- Large files consume address space
- 32-bit systems limited to ~2-3 GB addressable memory
- On 64-bit systems, address space is not a concern

### No write support

- Cache is read-only (`PROT_READ`)
- Modifications require reopening file for writing
- Cache should be used for static or infrequently changed files

---

## Summary

| Feature                    | Supported |
|----------------------------|-----------|
| Memory-mapped file access  | ✅        |
| Automatic invalidation     | ✅        |
| Thread-safe operations     | ✅        |
| Modification tracking      | ✅        |
| Zero-copy access           | ✅        |
| Multiple file caching      | ✅        |
| Lazy loading               | ✅        |
| Automatic cleanup          | ✅        |
| Write support              | ❌        |
