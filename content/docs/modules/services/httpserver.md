---
title: "HTTP Server"
weight: 6
---

# HTTP Server

`Http::Server` provides a **multi-threaded HTTP/HTTPS web server** with routing, static file serving,
and dynamic content generation. It uses a thread pool to handle concurrent requests efficiently.

`Http::Server` is designed to be:

* **fast** — multi-threaded request handling
* **flexible** — route mapping and handlers
* **complete** — static files, dynamic content, redirects
* **secure** — HTTPS support via `Https::Server`

---

## Basic usage

### Simple server

```cpp
// libjoin.
#include <join/httpserver.hpp>

using namespace join;

// Create server with 4 worker threads
Http::Server server(4);

// Serve static files from /var/www
server.baseLocation("/var/www");
server.addDocumentRoot("/*", "*");

// Start server on port 8080
Http::Endpoint endpoint(Http::v4(), 8080);
server.create(endpoint);

// The server runs until close() is called:
// always call close() before the server is destroyed (see "Close server gracefully")
```

### HTTPS server

```cpp
// Create HTTPS server
Https::Server server(4);

// Set certificate and key
server.setCertificate("/etc/ssl/cert.pem", "/etc/ssl/key.pem");

// Start on port 443
Https::Endpoint endpoint(Https::v4(), 443);
server.create(endpoint);
```

---

## Construction

```cpp
// Default: uses hardware concurrency
Http::Server server;

// Specify worker threads
Http::Server server(8);

// HTTPS server
Https::Server secureServer(4);
```

---

## Routes

Every route is made of a **directory** and a **file name**, both matched with `fnmatch` patterns.
A request path is split at its last `/`: `/api/users` gives the directory `/api/` and the file name `users`.

* Directories always **end with a `/`**: use `"/api/"`, not `"/api"`
* A directory pattern only matches that exact directory: use `"/images/*"` to also match its subdirectories
* Routes are checked **in registration order** and the first match wins:
  register catch-all routes such as `addDocumentRoot("/*", "*")` **last**

```cpp
// /api/users
server.addExecute(HttpMethod::Get, "/api/", "users", handler);

// any .png file in /images/ and its subdirectories
server.addDocumentRoot("/images/*", "*.png");

// index.html in any directory
server.addDocumentRoot("/*", "index.html");
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

### File aliases

An alias serves **one given file** for the matching requests:

```cpp
// "/" serves the home page
server.addAlias("/", "", "/var/www/index.html");

// any request in /logo/ serves the same image
server.addAlias("/logo/", "*", "/opt/assets/logo.png");
```

---

## Dynamic content

### Route handlers

```cpp
// GET /api/users
server.addExecute(
    HttpMethod::Get,
    "/api/",
    "users",
    [](Http::Worker* worker) {
        std::string json = R"({"users":["Alice","Bob"]})";

        worker->header("Content-Type", "application/json");
        worker->header("Content-Length", std::to_string(json.size()));
        worker->sendHeaders();

        *worker << json;
        worker->flush();
    }
);

// POST /api/submit
server.addExecute(
    HttpMethod::Post,
    "/api/",
    "submit",
    [](Http::Worker* worker) {
        // Read request body
        std::string body(worker->contentLength(), '\0');
        worker->read(&body[0], body.size());

        // Send response: headers first, then the body
        std::string json = R"({"status":"success"})";

        worker->header("Content-Type", "application/json");
        worker->header("Content-Length", std::to_string(json.size()));
        worker->sendHeaders();

        *worker << json;
        worker->flush();
    }
);
```

### Multiple methods

```cpp
// Handle GET and POST
server.addExecute(
    HttpMethod::Get | HttpMethod::Post,
    "/api/",
    "endpoint",
    [](Http::Worker* worker) {
        // Read the request body (empty for GET)
        std::string body(worker->contentLength(), '\0');
        worker->read(&body[0], body.size());

        worker->header("Content-Length", "0");
        worker->sendHeaders();
        worker->flush();
    }
);
```

---

## Worker API

### Reading request data

`hasHeader()` and `header(name)` read the **request** headers:

```cpp
[](Http::Worker* worker) {
    // Check headers
    if (worker->hasHeader("Content-Type"))
    {
        std::string type = worker->header("Content-Type");
    }

    // Read body
    std::string body(worker->contentLength(), '\0');
    worker->read(&body[0], body.size());
}
```

Always read the whole request body before answering, even if you don't need it:
on a keep-alive connection, unread bytes would be taken for the next request.

A chunked or compressed request body (`Transfer-Encoding` or `Content-Encoding` header) has no
`Content-Length`: read it until its end instead.

```cpp
[](Http::Worker* worker) {
    std::string body(std::istreambuf_iterator<char>(*worker), {});
    worker->clear();  // ready to send the response
}
```

### Sending responses

`header(name, value)` sets a **response** header. Headers must be sent before the body:

```cpp
[](Http::Worker* worker) {
    std::string html = "<html><body>Hello</body></html>";

    // Set response headers
    worker->header("Content-Type", "text/html");
    worker->header("Content-Length", std::to_string(html.size()));
    worker->header("Cache-Control", "no-cache");

    // Write headers
    worker->sendHeaders();

    // Write body
    *worker << html;

    // Flush
    worker->flush();
}
```

### Helper methods

Each helper sends a complete response: call **one** of them per request.

```cpp
// Send a file
worker->sendFile("/var/www/index.html");

// or send an error
worker->sendError("404", "Not Found");

// or send a redirect
worker->sendRedirect("302", "Found", "https://example.com/new");
```

---

## Redirects

### Simple redirect

```cpp
// Redirect every request in /old/ and its subdirectories to the /new/ page
server.addRedirect("/old/*", "*", "/new/");

// Redirect to external URL
server.addRedirect("/external/", "*", "https://example.com");
```

### Dynamic redirects

```cpp
// Redirect every HTTP request to HTTPS, keeping host, path and query
server.addRedirect("/*", "*", "https://$host$urn");

// Available variables:
// $root, $scheme, $host, $port, $path, $query, $urn
```

---

## Authentication

### Access control

The access handler receives the authorization type and credentials of the request.
When it refuses access, it must set `err` to `HttpErrc::Unauthorized` (401) or `HttpErrc::Forbidden` (403).

```cpp
// Define access handler
auto authHandler = [](const std::string& type,
                      const std::string& credentials,
                      std::error_code& err) -> bool {
    if (type != "Bearer")
    {
        err = make_error_code(HttpErrc::Unauthorized);
        return false;
    }

    if (credentials != "my-secret-token")
    {
        err = make_error_code(HttpErrc::Forbidden);
        return false;
    }

    return true;
};

// Apply to route
server.addExecute(
    HttpMethod::Get,
    "/api/",
    "protected",
    handler,
    authHandler  // Access control
);
```

Requests without an `Authorization` header are answered with `401 Unauthorized`.

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
Https::Server server(4);

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
// libjoin.
#include <join/httpserver.hpp>

using namespace join;

// Send a JSON body with its Content-Length
void sendJson(Http::Worker* worker, const std::string& json)
{
    worker->header("Content-Type", "application/json");
    worker->header("Content-Length", std::to_string(json.size()));
    worker->sendHeaders();
    *worker << json;
    worker->flush();
}

int main()
{
    Http::Server server(4);

    // GET /api/users
    server.addExecute(HttpMethod::Get, "/api/", "users", [](Http::Worker* worker) {
        sendJson(worker, R"({"users":["Alice","Bob"]})");
    });

    // POST /api/users
    server.addExecute(HttpMethod::Post, "/api/", "users", [](Http::Worker* worker) {
        std::string body(worker->contentLength(), '\0');
        worker->read(&body[0], body.size());

        sendJson(worker, body);  // echo the created user
    });

    // DELETE /api/users
    server.addExecute(HttpMethod::Delete, "/api/", "users", [](Http::Worker* worker) {
        worker->sendError("204", "No Content");
    });

    Http::Endpoint endpoint(Http::v4(), 8080);
    server.create(endpoint);

    // ... keep running, then stop (see "Close server gracefully")
    server.close();
}
```

### Static + dynamic content

```cpp
Http::Server server(4);

// API endpoints first...
server.addExecute(HttpMethod::Get, "/api/", "*", [](Http::Worker* worker) {
    std::string json = R"({"api":"v1"})";

    worker->header("Content-Type", "application/json");
    worker->header("Content-Length", std::to_string(json.size()));
    worker->sendHeaders();
    *worker << json;
    worker->flush();
});

// ...then static files for everything else
server.baseLocation("/var/www");
server.addDocumentRoot("/*", "*");

Http::Endpoint endpoint(Http::v4(), 80);
server.create(endpoint);
```

### File server with auth

```cpp
Http::Server server(4);

auto checkAuth = [](const std::string& type,
                    const std::string& credentials,
                    std::error_code& err) -> bool {
    if (type != "Bearer" || credentials != "my-secret-token")
    {
        err = make_error_code(HttpErrc::Forbidden);
        return false;
    }
    return true;
};

// Protected downloads: /var/www/downloads/...
server.baseLocation("/var/www");
server.addDocumentRoot("/downloads/*", "*", checkAuth);

Http::Endpoint endpoint(Http::v4(), 8080);
server.create(endpoint);
```

---

## Best practices

### Worker threads

```cpp
// Use hardware concurrency
Http::Server server(std::thread::hardware_concurrency());

// Or based on workload
Http::Server cpuBound(std::thread::hardware_concurrency() * 2);
Http::Server ioBound(std::thread::hardware_concurrency() * 4);
```

### Always set Content-Length or use chunking

The client needs to know where the body ends. Either announce its size:

```cpp
[](Http::Worker* worker) {
    std::string body = "Hello, World!";

    worker->header("Content-Length", std::to_string(body.size()));
    worker->sendHeaders();
    *worker << body;
    worker->flush();
}
```

or send it in chunks when the size is not known in advance:

```cpp
[](Http::Worker* worker) {
    worker->header("Transfer-Encoding", "chunked");
    worker->sendHeaders();
    *worker << "Hello, ";
    *worker << "World!";
    worker->flush();
}
```

### Error handling in handlers

```cpp
[](Http::Worker* worker) {
    try
    {
        // Process request (may throw)
    }
    catch (const std::exception& e)
    {
        worker->sendError("500", "Internal Server Error");
    }
}
```

### Close server gracefully

Block the termination signals **before** creating the server, so that the worker threads inherit
the mask, then wait for a signal with `sigwait()` and close the server:

```cpp
// libjoin.
#include <join/httpserver.hpp>

// C.
#include <signal.h>

using namespace join;

int main()
{
    sigset_t signals;
    sigemptyset(&signals);
    sigaddset(&signals, SIGINT);
    sigaddset(&signals, SIGTERM);
    pthread_sigmask(SIG_BLOCK, &signals, nullptr);

    Http::Server server(4);
    server.baseLocation("/var/www");
    server.addDocumentRoot("/*", "*");
    server.create(Http::Endpoint(Http::v4(), 8080));

    // Wait for Ctrl+C or kill
    int sig;
    sigwait(&signals, &sig);

    // Stop accepting requests and wait for the workers
    server.close();
}
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

The server compresses a response when the handler sets the `Content-Encoding` header (`gzip` or `deflate`).
Check the client's `Accept-Encoding` first, and use chunked transfer since the compressed size is not known in advance:

```cpp
[](Http::Worker* worker) {
    std::string text = "Hello, World!";

    if (worker->header("Accept-Encoding").find("gzip") != std::string::npos)
    {
        worker->header("Content-Encoding", "gzip");
        worker->header("Transfer-Encoding", "chunked");
    }
    else
    {
        worker->header("Content-Length", std::to_string(text.size()));
    }

    worker->sendHeaders();
    *worker << text;
    worker->flush();
}
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
[](Http::Worker* worker) {
    worker->header("X-Frame-Options", "DENY");
    worker->header("Content-Length", "0");
    worker->sendHeaders();
    worker->flush();
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
