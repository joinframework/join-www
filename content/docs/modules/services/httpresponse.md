---
title: "HTTP Response"
weight: 4
---

# HTTP Response

`HttpResponse` represents an **HTTP response message** with status code, reason phrase, and headers.
It provides methods for building and parsing HTTP responses in both client and server contexts.

`HttpResponse` is designed to be:

* **simple** — easy status and header management
* **standard** — follows HTTP/1.1 response format
* **flexible** — works with clients and servers
* **efficient** — minimal overhead

---

## Basic usage

### Creating responses

```cpp
#include <join/httpmessage.hpp>

// Create response
HttpResponse res;

// Set status and reason
res.response("200", "OK");
res.response("404", "Not Found");
res.response("500", "Internal Server Error");
```

### Setting headers

```cpp
HttpResponse res;
res.response("200", "OK");

// Add headers
res.header("Content-Type", "application/json");
res.header("Content-Length", "123");
res.header("Cache-Control", "no-cache");
```

---

## Status codes

### Common status codes

```cpp
// Success
res.response("200", "OK");
res.response("201", "Created");
res.response("204", "No Content");

// Redirection
res.response("301", "Moved Permanently");
res.response("302", "Found");
res.response("304", "Not Modified");

// Client errors
res.response("400", "Bad Request");
res.response("401", "Unauthorized");
res.response("403", "Forbidden");
res.response("404", "Not Found");

// Server errors
res.response("500", "Internal Server Error");
res.response("502", "Bad Gateway");
res.response("503", "Service Unavailable");
```

### Getting status

```cpp
HttpResponse res;
res.response("200", "OK");

std::string status = res.status();  // "200"
std::string reason = res.reason();  // "OK"
```

---

## Headers

### Content headers

```cpp
HttpResponse res;
res.response("200", "OK");

// Content type
res.header("Content-Type", "text/html; charset=utf-8");
res.header("Content-Type", "application/json");
res.header("Content-Type", "image/png");

// Content length
res.header("Content-Length", std::to_string(bodySize));

// Content encoding
res.header("Content-Encoding", "gzip");
```

### Caching headers

```cpp
// No caching
res.header("Cache-Control", "no-cache, no-store, must-revalidate");
res.header("Pragma", "no-cache");
res.header("Expires", "0");

// Cache for 1 hour
res.header("Cache-Control", "public, max-age=3600");

// Last modified
res.header("Last-Modified", "Wed, 21 Oct 2015 07:28:00 GMT");
res.header("ETag", "\"33a64df551425fcc55e4d42a148795d9f25f89d4\"");
```

### CORS headers

```cpp
// Allow cross-origin requests
res.header("Access-Control-Allow-Origin", "*");
res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
res.header("Access-Control-Max-Age", "86400");
```

---

## Serialization

### Writing response

```cpp
HttpResponse res;
res.response("200", "OK");
res.header("Content-Type", "text/plain");
res.header("Content-Length", "13");

// Write to stream
std::stringstream ss;
res.writeHeaders(ss);
ss << "Hello, World!";

// Output:
// HTTP/1.1 200 OK
// Content-Type: text/plain
// Content-Length: 13
//
// Hello, World!
```

### Reading response

```cpp
HttpResponse res;

// Read from stream
if (res.readHeaders(stream) == 0) {
    // Headers parsed successfully
    std::string status = res.status();
    std::string reason = res.reason();
    
    // Check content length
    size_t length = res.contentLength();
}
```

---

## Common patterns

### Success response

```cpp
HttpResponse res;
res.response("200", "OK");
res.header("Content-Type", "application/json");

std::string json = R"({"status":"success"})";
res.header("Content-Length", std::to_string(json.size()));

stream << res;
stream << json;
stream.flush();
```

### Error response

```cpp
HttpResponse res;
res.response("404", "Not Found");
res.header("Content-Type", "text/html");

std::string html = "<html><body><h1>404 Not Found</h1></body></html>";
res.header("Content-Length", std::to_string(html.size()));

stream << res;
stream << html;
stream.flush();
```

### Redirect response

```cpp
HttpResponse res;
res.response("302", "Found");
res.header("Location", "https://example.com/new-location");
res.header("Content-Length", "0");

stream << res;
stream.flush();
```

### JSON API response

```cpp
HttpResponse res;
res.response("200", "OK");
res.header("Content-Type", "application/json");
res.header("Cache-Control", "no-cache");

std::string json = R"({
    "data": {
        "id": 123,
        "name": "Alice"
    }
})";
res.header("Content-Length", std::to_string(json.size()));

stream << res;
stream << json;
stream.flush();
```

---

## Server usage

### Sending responses

```cpp
// In server handler
HttpResponse res;

// Success
res.response("200", "OK");
res.header("Content-Type", "text/plain");

std::string content = "Request processed successfully";
res.header("Content-Length", std::to_string(content.size()));

res.writeHeaders(stream);
stream << content;
stream.flush();
```

### Error handling

```cpp
void sendError(std::ostream& stream, const std::string& status, 
               const std::string& reason) {
    HttpResponse res;
    res.response(status, reason);
    res.header("Content-Type", "text/html");
    res.header("Connection", "close");
    
    std::string html = "<html><body><h1>" + status + " " + 
                      reason + "</h1></body></html>";
    res.header("Content-Length", std::to_string(html.size()));
    
    res.writeHeaders(stream);
    stream << html;
    stream.flush();
}
```

---

## Client usage

### Receiving responses

```cpp
// Send request
client << request;

// Receive response
HttpResponse res;
client >> res;

// Check status
if (res.status() == "200") {
    // Success - read body
    std::string body;
    size_t length = res.contentLength();
    body.resize(length);
    client.read(&body[0], length);
} else {
    // Error
    std::cerr << "Error: " << res.status() << " " 
              << res.reason() << "\n";
}
```

---

## Helper methods

### Content length

```cpp
HttpResponse res;
// ... receive response ...

// Get content length from header
size_t length = res.contentLength();

if (length > 0) {
    std::string body;
    body.resize(length);
    stream.read(&body[0], length);
}
```

### Header checks

```cpp
// Check if header exists
if (res.hasHeader("Content-Type")) {
    std::string type = res.header("Content-Type");
}

// Get all headers
const auto& headers = res.headers();
for (const auto& [name, value] : headers) {
    std::cout << name << ": " << value << "\n";
}
```

---

## Error handling

```cpp
HttpResponse res;

if (res.readHeaders(stream) == -1) {
    std::error_code ec = join::lastError;
    
    if (ec == HttpErrc::BadRequest) {
        // Malformed response
    }
    // Handle error...
}
```

---

## Best practices

### Always set Content-Length

```cpp
std::string body = generateBody();
res.header("Content-Length", std::to_string(body.size()));
```

### Use appropriate status codes

```cpp
// Resource created
res.response("201", "Created");

// No content to return
res.response("204", "No Content");

// Client error
res.response("400", "Bad Request");

// Not your fault
res.response("500", "Internal Server Error");
```

### Clear and reuse

```cpp
HttpResponse res;

for (const auto& item : items) {
    res.clear();  // Reset for reuse
    res.response("200", "OK");
    // Send response...
}
```

---

## Summary

| Feature             | Supported |
|---------------------|-----------|
| Status codes        | ✅        |
| Headers             | ✅        |
| HTTP/1.1            | ✅        |
| Serialization       | ✅        |
| Content length      | ✅        |
| Copy/move semantics | ✅        |
