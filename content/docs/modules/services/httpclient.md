---
title: "HTTP Client"
weight: 5
---

# HTTP Client

`Http::Client` provides a **simple HTTP/HTTPS client** for making web requests.
It handles connections, keep-alive, compression, and chunked encoding automatically.

`Http::Client` is designed to be:

* **easy** — simple API for common tasks
* **efficient** — supports HTTP keep-alive
* **complete** — handles encoding and compression
* **secure** — HTTPS support via `Https::Client`

---

## Basic usage

### Simple GET request

```cpp
// libjoin.
#include <join/httpclient.hpp>

// C++.
#include <iostream>

using namespace join;

// Create client
Http::Client client("api.example.com", 80);

// Create request
HttpRequest req(HttpMethod::Get);
req.path("/users");

// Send request
client << req;

// Receive response
HttpResponse res;
client >> res;

// Read body (see "Reading body")
std::string body = readBody(client, res);

std::cout << res.status() << ": " << body << "\n";
```

### HTTPS request

```cpp
// HTTPS client (port 443 is default)
Https::Client client("api.example.com");

HttpRequest req(HttpMethod::Get);
req.path("/secure/data");

client << req;

HttpResponse res;
client >> res;

std::string body = readBody(client, res);
```

---

## Construction

```cpp
// HTTP client with defaults
Http::Client client("example.com", 80);

// HTTPS client
Https::Client client("example.com", 443);

// Disable keep-alive
Http::Client client("example.com", 80, false);
```

---

## Reading body

The connection stays open between requests (keep-alive), so the body must be read
**exactly**, up to its end and not further:

* with a plain body, read the `Content-Length` bytes
* with a chunked (`Transfer-Encoding`) or compressed (`Content-Encoding`) body, the decoded size is not known in advance:
  read until the end of the decoded body, then reset the stream state

This small helper handles these cases, text or binary, and works with `Http::Client` and `Https::Client`:

```cpp
std::string readBody(std::istream& client, const HttpResponse& res)
{
    std::string body;

    if (res.hasHeader("Transfer-Encoding") || res.hasHeader("Content-Encoding"))
    {
        // read until the end of the decoded body
        body.assign(std::istreambuf_iterator<char>(client), std::istreambuf_iterator<char>());
        client.clear();  // ready for the next response
    }
    else
    {
        body.resize(res.contentLength());
        client.read(&body[0], body.size());
        body.resize(client.gcount());  // shorter if the connection dropped
    }

    return body;
}
```

Always read the body before sending the next request on the same client.
Responses to a `HEAD` request and `304 Not Modified` responses have no body: don't read one.
After reading, `client.fail()` tells whether the body was received completely.

---

## Making requests

### GET request

```cpp
Http::Client client("api.example.com");

HttpRequest req(HttpMethod::Get);
req.path("/api/v1/users");
req.parameter("page", "2");
req.parameter("limit", "50");

client << req;

HttpResponse res;
client >> res;

std::string data = readBody(client, res);

if (res.status() == "200")
{
    std::cout << data << "\n";
}
```

### POST request

```cpp
Http::Client client("api.example.com");

HttpRequest req(HttpMethod::Post);
req.path("/api/users");
req.header("Content-Type", "application/json");

std::string json = R"({"name":"Alice","age":30})";
req.header("Content-Length", std::to_string(json.size()));

// Send request and body
client << req;
client << json;
client.flush();

// Receive response
HttpResponse res;
client >> res;

std::string body = readBody(client, res);
```

### PUT request

```cpp
HttpRequest req(HttpMethod::Put);
req.path("/api/users/123");
req.header("Content-Type", "application/json");

std::string json = R"({"name":"Bob"})";
req.header("Content-Length", std::to_string(json.size()));

client << req;
client << json;
client.flush();

HttpResponse res;
client >> res;

std::string body = readBody(client, res);
```

### DELETE request

```cpp
HttpRequest req(HttpMethod::Delete);
req.path("/api/users/123");

client << req;

HttpResponse res;
client >> res;

std::string body = readBody(client, res);
```

---

## Headers and authentication

### Custom headers

```cpp
HttpRequest req(HttpMethod::Get);
req.path("/api/data");

// Add headers
req.header("Accept", "application/json");
req.header("User-Agent", "MyApp/1.0");
req.header("X-API-Key", "my-api-key");

client << req;
```

### Bearer token authentication

```cpp
std::string accessToken = "my-access-token";

HttpRequest req(HttpMethod::Get);
req.path("/api/protected");
req.header("Authorization", "Bearer " + accessToken);

client << req;
```

### Basic authentication

```cpp
// libjoin.
#include <join/httpclient.hpp>
#include <join/base64.hpp>

using namespace join;

// Encode credentials (username:password in base64)
std::string credentials = Base64::encode("user:pass");

HttpRequest req(HttpMethod::Get);
req.path("/api/protected");
req.header("Authorization", "Basic " + credentials);
```

---

## Keep-alive

### Persistent connections

```cpp
// Enable keep-alive (default)
Http::Client client("api.example.com", 80, true);

// Multiple requests on same connection
for (int i = 0; i < 10; ++i)
{
    HttpRequest req(HttpMethod::Get);
    req.path("/data/" + std::to_string(i));

    client << req;

    HttpResponse res;
    client >> res;

    // Read the body before the next request
    std::string body = readBody(client, res);
}
// Connection automatically reused
```

### Connection management

```cpp
Http::Client client("example.com");

// Keep-alive settings announced by the server (after a response)
auto timeout = client.keepAliveTimeout();
int maxRequests = client.keepAliveMax();

// Manually close connection
client.close();
```

---

## Response handling

### Checking status

```cpp
HttpResponse res;
client >> res;

std::string body = readBody(client, res);

if (res.status() == "200")
{
    // Success
}
else if (res.status() == "404")
{
    // Not found
}
else if (res.status()[0] == '5')
{
    // Server error
}
```

---

## Compression and encoding

The client automatically handles:

- **Gzip compression** — transparent decompression
- **Deflate compression** — transparent decompression
- **Chunked transfer** — automatic reassembly

```cpp
// Request compressed response
HttpRequest req(HttpMethod::Get);
req.path("/data");
req.header("Accept-Encoding", "gzip, deflate");

client << req;

HttpResponse res;
client >> res;

// Body is automatically decompressed
std::string body = readBody(client, res);
```

---

## Error handling

The client does not throw: check the stream state after sending and after receiving.

```cpp
Http::Client client("api.example.com");

HttpRequest req(HttpMethod::Get);
req.path("/users");

client << req;
if (client.fail())
{
    std::cerr << "Request failed: " << lastError.message() << "\n";
    client.clear();  // reset the stream state before the next attempt
    return;
}

HttpResponse res;
client >> res;
if (client.fail())
{
    std::cerr << "Response failed: " << lastError.message() << "\n";
    client.clear();
    return;
}

std::string body = readBody(client, res);
```

---

## Common patterns

### JSON API client

```cpp
class ApiClient
{
    Https::Client client;
    std::string token;

public:
    ApiClient(const std::string& host, const std::string& token)
    : client(host), token(token)
    {}

    std::string get(const std::string& endpoint)
    {
        HttpRequest req(HttpMethod::Get);
        req.path(endpoint);
        req.header("Accept", "application/json");
        req.header("Authorization", "Bearer " + token);

        client << req;

        HttpResponse res;
        client >> res;

        std::string body = readBody(client, res);

        if (client.fail())
        {
            client.clear();  // keep the client usable for the next call
            throw std::runtime_error("Connection failed");
        }

        if (res.status() != "200")
        {
            throw std::runtime_error("Request failed: " + res.status());
        }

        return body;
    }

    std::string post(const std::string& endpoint, const std::string& json)
    {
        HttpRequest req(HttpMethod::Post);
        req.path(endpoint);
        req.header("Content-Type", "application/json");
        req.header("Authorization", "Bearer " + token);
        req.header("Content-Length", std::to_string(json.size()));

        client << req;
        client << json;
        client.flush();

        HttpResponse res;
        client >> res;

        std::string body = readBody(client, res);

        if (client.fail())
        {
            client.clear();
            throw std::runtime_error("Connection failed");
        }

        return body;
    }
};
```

### File download

```cpp
bool downloadFile(Http::Client& client, const std::string& path, const std::string& output)
{
    HttpRequest req(HttpMethod::Get);
    req.path(path);

    client << req;

    HttpResponse res;
    client >> res;

    std::string body = readBody(client, res);

    if (client.fail() || res.status() != "200")
    {
        client.clear();
        return false;
    }

    std::ofstream file(output, std::ios::binary);
    file << body;
    return file.good();
}

// Usage
Http::Client client("example.com");
downloadFile(client, "/files/document.pdf", "document.pdf");
```

### Retry logic

```cpp
HttpResponse requestWithRetry(Http::Client& client, HttpRequest& req, std::string& body, int maxRetries = 3)
{
    for (int i = 0; i < maxRetries; ++i)
    {
        client << req;

        HttpResponse res;
        client >> res;

        if (client.good())
        {
            // Always read the body, even before a retry
            body = readBody(client, res);

            if (res.status()[0] != '5')
            {
                return res;  // Success or client error
            }
        }

        // Server error or connection failure: wait and retry
        client.clear();
        if (i + 1 < maxRetries)
        {
            std::this_thread::sleep_for(std::chrono::seconds(1 << i));
        }
    }

    throw std::runtime_error("Max retries exceeded");
}
```

---

## HTTPS specifics

```cpp
// HTTPS with default port (443)
Https::Client client("secure.example.com");

// HTTPS with custom port
Https::Client client("secure.example.com", 8443);

// Everything else works the same as HTTP
client << req;
client >> res;
std::string body = readBody(client, res);
```

---

## Best practices

### Reuse clients

```cpp
// Good: Reuse client for multiple requests
Http::Client client("api.example.com");
for (const auto& endpoint : endpoints)
{
    HttpRequest req(HttpMethod::Get);
    req.path(endpoint);
    client << req;
    // ...
}

// Avoid: Creating new client each time
for (const auto& endpoint : endpoints)
{
    Http::Client client("api.example.com");  // Slow!
    // ...
}
```

### Set timeouts

```cpp
// Read/write timeout in milliseconds
client.timeout(5000);  // 5 seconds
```

### Always check status

```cpp
client << req;
HttpResponse res;
client >> res;

std::string body = readBody(client, res);

if (res.status()[0] == '2')
{
    // Success (2xx)
}
else
{
    // Handle error
}
```

---

## Summary

| Feature              | Supported |
|----------------------|-----------|
| HTTP/1.1             | ✅        |
| HTTPS                | ✅        |
| Keep-alive           | ✅        |
| Gzip/Deflate         | ✅        |
| Chunked encoding     | ✅        |
| All HTTP methods     | ✅        |
| Custom headers       | ✅        |
| Stream interface     | ✅        |
