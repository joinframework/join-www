---
title: "HTTP Server"
weight: 6
---

# HTTP Server

`HttpServer` provides a **multi-threaded HTTP/HTTPS web server** with routing, static file serving,
and dynamic content generation. It uses a thread pool to handle concurrent requests efficiently.

`HttpServer` is designed to be:

* **fast** — multi-threaded request handling
* **flexible** — route mapping and handlers
* **complete** — static files, dynamic content, redirects
* **secure** — HTTPS support via `HttpsServer`

---

## Basic usage

### Simple server

```cpp
#include <join/httpserver.hpp>

// Create server with 4 worker threads
HttpServer server(4);

// Serve static files from /var/www
server.baseLocation("/var/www");
server.addDocumentRoot("/*", "*");

// Start server on port 8080
Tcp::Endpoint endpoint(Tcp::v4(), 8080);
server.create(endpoint);

// Server runs until closed
```

### HTTPS server

```cpp
// Create HTTPS server
HttpsServer server(4);

// Set certificate and key
server.setCertificate("/etc/ssl/cert.pem", "/etc/ssl/key.pem");

// Start on port 443
Tcp::Endpoint endpoint(Tcp::v4(), 443);
server.create(endpoint);
```

---

## Construction

```cpp
// Default: uses hardware concurrency
HttpServer server();

// Specify worker threads
HttpServer server(8);

// HTTPS server
HttpsServer secureServer(4);
```

---

## Static file serving

### Document root

```cpp
// Set base directory
server.baseLocation("/var/www");

// Serve all files from base
server.addDocumentRoot("/*", "*");

// Requests to /images/logo.png serve /var/www/images/logo.png
```

### Path aliases

```cpp
// Map /static to /opt/assets
server.addAlias("/static", "*", "/opt/assets");

// /static/logo.png serves /opt/assets/logo.png

// Pattern matching
server.addAlias("/images", "*.png", "/opt/images");
server.addAlias("/docs", "*.pdf", "/opt/documents");
```

---

## Dynamic content

### Route handlers

```cpp
// GET endpoint
server.addExecute(
    HttpMethod::Get,
    "/api",
    "users",
    [](HttpServer::Worker* worker) {
        worker->header("Content-Type", "application/json");
        
        std::string json = R"({"users":["Alice","Bob"]})";
        worker->header("Content-Length", std::to_string(json.size()));
        
        worker->sendHeaders();
        *worker << json;
        worker->flush();
    }
);

// POST endpoint
server.addExecute(
    HttpMethod::Post,
    "/api",
    "submit",
    [](HttpServer::Worker* worker) {
        // Read request body
        size_t length = worker->contentLength();
        std::string body(length, '\0');
        worker->read(&body[0], length);
        
        // Process data
        processData(body);
        
        // Send response
        worker->header("Content-Type", "application/json");
        *worker << R"({"status":"success"})";
        worker->sendHeaders();
        worker->flush();
    }
);
```

### Multiple methods

```cpp
// Handle GET and POST
server.addExecute(
    HttpMethod::Get | HttpMethod::Post,
    "/api",
    "endpoint",
    [](HttpServer::Worker* worker) {
        // Handler for both methods
    }
);
```

---

## Worker API

### Reading request data

```cpp
[](HttpServer::Worker* worker) {
    // Check headers
    if (worker->hasHeader("Content-Type")) {
        std::string type = worker->header("Content-Type");
    }
    
    // Get content length
    size_t length = worker->contentLength();
    
    // Read body
    std::string body(length, '\0');
    worker->read(&body[0], length);
}
```

### Sending responses

```cpp
[](HttpServer::Worker* worker) {
    // Set response headers
    worker->header("Content-Type", "text/html");
    worker->header("Cache-Control", "no-cache");
    
    // Write headers
    worker->sendHeaders();
    
    // Write body
    *worker << "<html><body>Hello</body></html>";
    
    // Flush
    worker->flush();
}
```

### Helper methods

```cpp
[](HttpServer::Worker* worker) {
    // Send file
    worker->sendFile("/var/www/index.html");
    
    // Send error
    worker->sendError("404", "Not Found");
    
    // Send redirect
    worker->sendRedirect("302", "Found", "https://example.com/new");
}
```

---

## Routing

### Pattern matching

```cpp
// Exact match
server.addExecute(Get, "/api", "users", handler);

// Wildcard file name
server.addDocumentRoot("/images", "*.png");

// Wildcard directory
server.addDocumentRoot("/*", "index.html");

// Multiple wildcards (uses fnmatch)
server.addAlias("/downloads", "*.{zip,tar.gz}", "/opt/files");
```

---

## Redirects

### Simple redirect

```cpp
// Redirect /old to /new
server.addRedirect("/old", "*", "/new");

// Redirect to external URL
server.addRedirect("/external", "*", "https://example.com");
```

### Dynamic redirects

```cpp
// Use variables in redirect
server.addRedirect(
    "/api/v1",
    "*",
    "$scheme://$host/api/v2$path$query"
);

// Available variables:
// $root, $scheme, $host, $port, $path, $query, $urn
```

---

## Authentication

### Access control

```cpp
// Define access handler
auto authHandler = [](const std::string& type,
                      const std::string& credentials,
                      std::error_code& err) -> bool {
    if (type != "Bearer") {
        err = HttpErrc::Unauthorized;
        return false;
    }
    
    if (!validateToken(credentials)) {
        err = HttpErrc::Forbidden;
        return false;
    }
    
    return true;
};

// Apply to route
server.addExecute(
    HttpMethod::Get,
    "/api",
    "protected",
    handler,
    authHandler  // Access control
);
```

---

## Configuration

### Keep-alive

```cpp
// Set keep-alive timeout and max requests
server.keepAlive(
    std::chrono::seconds(30),  // Timeout
    100                         // Max requests per connection
);

// Get settings
auto timeout = server.keepAliveTimeout();
int max = server.keepAliveMax();
```

### Base location

```cpp
// Set document root
server.baseLocation("/var/www/html");

// Get current location
std::string location = server.baseLocation();
```

---

## HTTPS configuration

### Certificates

```cpp
HttpsServer server(4);

// Set server certificate and private key
server.setCertificate(
    "/etc/ssl/server-cert.pem",
    "/etc/ssl/server-key.pem"
);

// Set CA certificate for client verification
server.setCaCertificate("/etc/ssl/ca-cert.pem");

// Require client certificates
server.setVerify(true, 5);  // depth=5
```

### Cipher configuration

```cpp
// TLS 1.2 and below
server.setCipher("ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256");

// TLS 1.3
server.setCipher_1_3("TLS_AES_256_GCM_SHA384:TLS_AES_128_GCM_SHA256");

// Curves (OpenSSL 3.0+)
server.setCurve("P-521:P-384:P-256");
```

---

## Complete examples

### REST API server

```cpp
HttpServer server(4);

// GET /api/users
server.addExecute(
    HttpMethod::Get, "/api", "users",
    [](auto* w) {
        w->header("Content-Type", "application/json");
        w->sendHeaders();
        *w << getUsersJson();
        w->flush();
    }
);

// POST /api/users
server.addExecute(
    HttpMethod::Post, "/api", "users",
    [](auto* w) {
        std::string body(w->contentLength(), '\0');
        w->read(&body[0], body.size());
        
        auto user = createUser(body);
        
        w->header("Content-Type", "application/json");
        w->sendHeaders();
        *w << user.toJson();
        w->flush();
    }
);

// DELETE /api/users
server.addExecute(
    HttpMethod::Delete, "/api", "users",
    [](auto* w) {
        deleteUser();
        w->sendError("204", "No Content");
    }
);

Tcp::Endpoint endpoint(Tcp::v4(), 8080);
server.create(endpoint);
```

### Static + dynamic content

```cpp
HttpServer server(4);

// Static files
server.baseLocation("/var/www");
server.addDocumentRoot("/*", "*");

// API endpoints
server.addExecute(
    HttpMethod::Get, "/api", "*",
    [](auto* w) {
        w->header("Content-Type", "application/json");
        w->sendHeaders();
        *w << R"({"api":"v1"})";
        w->flush();
    }
);

Tcp::Endpoint endpoint(Tcp::v4(), 80);
server.create(endpoint);
```

### File server with auth

```cpp
HttpServer server(4);

auto checkAuth = [](const std::string& type,
                    const std::string& creds,
                    std::error_code& err) -> bool {
    return validateCredentials(type, creds);
};

// Protected downloads
server.addDocumentRoot(
    "/downloads",
    "*",
    checkAuth
);

Tcp::Endpoint endpoint(Tcp::v4(), 8080);
server.create(endpoint);
```

---

## Best practices

### Worker threads

```cpp
// Use hardware concurrency
HttpServer server(std::thread::hardware_concurrency());

// Or based on workload
HttpServer cpuBound(std::thread::hardware_concurrency() * 2);
HttpServer ioBound(std::thread::hardware_concurrency() * 4);
```

### Always set Content-Length or use chunking

```cpp
[](auto* worker) {
    std::string body = generateBody();
    
    // Option 1: Content-Length
    worker->header("Content-Length", std::to_string(body.size()));
    worker->sendHeaders();
    *worker << body;
    
    // Option 2: Chunked transfer
    worker->header("Transfer-Encoding", "chunked");
    worker->sendHeaders();
    *worker << body;
    worker->flush();
}
```

### Error handling in handlers

```cpp
[](auto* worker) {
    try {
        // Process request
        processRequest(worker);
    } catch (const std::exception& e) {
        worker->sendError("500", "Internal Server Error");
    }
}
```

### Close server gracefully

```cpp
HttpServer server(4);

// Start server
server.create(endpoint);

// Handle shutdown signal
signal(SIGINT, [](int) {
    server.close();
});

// Wait for workers to finish
// (destructor waits automatically)
```

---

## Performance tips

### File caching

The server automatically caches files in memory and tracks modifications:

```cpp
// Files are cached automatically
// Cache invalidates on file modification
server.addDocumentRoot("/*", "*");

// No manual cache management needed
```

### Keep-alive tuning

```cpp
// Long timeout for interactive clients
server.keepAlive(std::chrono::seconds(60), 1000);

// Short timeout for API clients
server.keepAlive(std::chrono::seconds(5), 100);
```

### Compression

```cpp
// Server automatically handles:
// - gzip encoding
// - deflate encoding
// - chunked transfer

// Client requests with Accept-Encoding: gzip
// Server responds with Content-Encoding: gzip (if applicable)
```

---

## Security headers

The server automatically adds security headers:

```cpp
// Automatically added:
// - Strict-Transport-Security (HTTPS only)
// - Content-Security-Policy
// - X-XSS-Protection
// - X-Content-Type-Options
// - X-Frame-Options

// Override if needed
[](auto* worker) {
    worker->header("X-Frame-Options", "DENY");
    worker->sendHeaders();
}
```

---

## Summary

| Feature                  | Supported |
|--------------------------|-----------|
| Multi-threaded           | ✅        |
| Static file serving      | ✅        |
| Dynamic content          | ✅        |
| Route pattern matching   | ✅        |
| HTTP/HTTPS               | ✅        |
| Keep-alive               | ✅        |
| Compression              | ✅        |
| Chunked transfer         | ✅        |
| Authentication           | ✅        |
| File caching             | ✅        |
| Redirects                | ✅        |
