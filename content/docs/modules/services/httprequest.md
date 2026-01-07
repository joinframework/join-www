---
title: "HTTP Request"
weight: 3
---

# HTTP Request

`HttpRequest` represents an **HTTP request message** with methods, headers, path, and query parameters.
It provides a clean API for building and parsing HTTP requests for both client and server applications.

`HttpRequest` is designed to be:

* **complete** — handles all HTTP request components
* **flexible** — supports all standard HTTP methods
* **easy to use** — intuitive API for headers and parameters
* **standard-compliant** — follows HTTP/1.1 specification

---

## Basic usage

### Creating requests

```cpp
#include <join/httpmessage.hpp>

// Default GET request
HttpRequest req;

// Specify method
HttpRequest req(HttpMethod::Post);

// Set path and parameters
req.path("/api/users");
req.parameter("id", "123");
req.parameter("filter", "active");
```

### Setting headers

```cpp
HttpRequest req(HttpMethod::Get);

// Add headers
req.header("Accept", "application/json");
req.header("Authorization", "Bearer token123");
req.header("User-Agent", "MyApp/1.0");

// Check if header exists
if (req.hasHeader("Authorization"))
{
    std::string auth = req.header("Authorization");
}
```

---

## HTTP methods

### Available methods

```cpp
// Standard HTTP methods
HttpRequest get(HttpMethod::Get);       // GET
HttpRequest head(HttpMethod::Head);     // HEAD
HttpRequest post(HttpMethod::Post);     // POST
HttpRequest put(HttpMethod::Put);       // PUT
HttpRequest del(HttpMethod::Delete);    // DELETE

// Get method as string
std::string method = req.methodString();  // "GET", "POST", etc.
```

---

## Path and parameters

### Setting path

```cpp
HttpRequest req;

// Simple path
req.path("/users");

// Path with segments
req.path("/api/v1/users/123");

// Get path
std::string path = req.path();  // "/api/v1/users/123"
```

### Query parameters

```cpp
// Add parameters
req.parameter("page", "2");
req.parameter("limit", "50");
req.parameter("sort", "name");

// Check parameter
if (req.hasParameter("page"))
{
    std::string page = req.parameter("page");
}

// Get all parameters
const auto& params = req.parameters();

// Get query string
std::string query = req.query();  // "?page=2&limit=50&sort=name"
```

### URN (path + query)

```cpp
req.path("/search");
req.parameter("q", "test");
req.parameter("lang", "en");

std::string urn = req.urn();  // "/search?q=test&lang=en"
```

---

## Headers

### Common headers

```cpp
HttpRequest req;

// Content type
req.header("Content-Type", "application/json");

// Content length
req.header("Content-Length", "1234");

// Accept
req.header("Accept", "application/json");

// Authorization
req.header("Authorization", "Bearer " + token);

// Custom headers
req.header("X-API-Key", apiKey);
req.header("X-Request-ID", requestId);
```

### Multiple headers

```cpp
HttpRequest::HeaderMap headers = {
    {"Accept", "application/json"},
    {"Accept-Encoding", "gzip, deflate"},
    {"Accept-Language", "en-US,en;q=0.9"}
};

req.headers(headers);
```

---

## Request information

### Host and authorization

```cpp
// Get host from Host header
std::string host = req.host();  // "example.com" or "[::1]"

// Get authorization type
std::string authType = req.auth();  // "Bearer", "Basic", etc.

// Get credentials
std::string creds = req.credentials();  // Token or encoded credentials
```

### Version

```cpp
// Set HTTP version
req.version("HTTP/1.1");  // Default

// Get version
std::string ver = req.version();
```

---

## Serialization

### Writing request

```cpp
HttpRequest req(HttpMethod::Post);
req.path("/api/submit");
req.header("Content-Type", "application/json");
req.header("Content-Length", "42");

// Write to stream
std::stringstream ss;
req.writeHeaders(ss);

// Output:
// POST /api/submit HTTP/1.1
// Content-Type: application/json
// Content-Length: 42
//
```

### Reading request

```cpp
HttpRequest req;

// Read from stream
std::stringstream ss(requestData);
if (req.readHeaders(ss) == 0)
{
    // Headers parsed successfully
    std::string method = req.methodString();
    std::string path = req.path();
}
```

---

## Common patterns

### Client request

```cpp
// Build GET request
HttpRequest req(HttpMethod::Get);
req.path("/api/data");
req.parameter("format", "json");
req.header("Accept", "application/json");
req.header("Authorization", "Bearer " + token);

// Send to server
client << req;
```

### API request with body

```cpp
// POST with JSON body
HttpRequest req(HttpMethod::Post);
req.path("/api/users");
req.header("Content-Type", "application/json");

std::string body = R"({"name":"Alice","age":30})";
req.header("Content-Length", std::to_string(body.size()));

// Send
client << req;
client << body;
client.flush();
```

### Form submission

```cpp
HttpRequest req(HttpMethod::Post);
req.path("/submit");
req.header("Content-Type", "application/x-www-form-urlencoded");

std::string formData = "name=Alice&email=alice%40example.com";
req.header("Content-Length", std::to_string(formData.size()));

client << req;
client << formData;
client.flush();
```

---

## Server usage

### Parsing incoming request

```cpp
// In server handler
HttpRequest req;
if (req.readHeaders(stream) == 0)
{
    // Access request data
    HttpMethod method = req.method();
    std::string path = req.path();
    std::string userAgent = req.header("User-Agent");

    // Get query parameters
    std::string id = req.parameter("id");

    // Process request...
}
```

---

## Error handling

```cpp
HttpRequest req;

if (req.readHeaders(stream) == -1)
{
    std::error_code ec = join::lastError;

    if (ec == HttpErrc::BadRequest)
    {
        // Malformed request
    }
    else if (ec == HttpErrc::Unsupported)
    {
        // Unsupported method
    }
    else if (ec == HttpErrc::UriTooLong)
    {
        // URI exceeds limits
    }
}
```

---

## Best practices

### URL encoding

```cpp
// Parameters are automatically URL-encoded when set
req.parameter("query", "hello world");  // Becomes "hello%20world"
req.parameter("email", "user@example.com");  // Becomes "user%40example.com"
```

### Clear and reuse

```cpp
HttpRequest req;

for (const auto& endpoint : endpoints)
{
    req.clear();  // Reset for reuse
    req.method(HttpMethod::Get);
    req.path(endpoint);

    // Send request...
}
```

### Content length

```cpp
// Always set Content-Length for requests with body
std::string body = generateBody();
req.header("Content-Length", std::to_string(body.size()));
```

---

## Summary

| Feature                | Supported |
|------------------------|-----------|
| All HTTP methods       | ✅        |
| Headers                | ✅        |
| Query parameters       | ✅        |
| URL encoding           | ✅        |
| Path normalization     | ✅        |
| HTTP/1.1               | ✅        |
| Serialization          | ✅        |
| Copy/move semantics    | ✅        |
