---
title: "HTTP Client"
weight: 5
---

# HTTP Client

`HttpClient` provides a **simple HTTP/HTTPS client** for making web requests.
It handles connections, keep-alive, compression, and chunked encoding automatically.

`HttpClient` is designed to be:

* **easy** — simple API for common tasks
* **efficient** — supports HTTP keep-alive
* **complete** — handles encoding and compression
* **secure** — HTTPS support via `HttpsClient`

---

## Basic usage

### Simple GET request

```cpp
#include <join/httpclient.hpp>

// Create client
HttpClient client("api.example.com", 80);

// Create request
HttpRequest req(HttpMethod::Get);
req.path("/users");

// Send request
client << req;

// Receive response
HttpResponse res;
client >> res;

// Read body
std::string body;
std::getline(client, body, '\0');

std::cout << res.status() << ": " << body << "\n";
```

### HTTPS request

```cpp
// HTTPS client (port 443 is default)
HttpsClient client("api.example.com");

HttpRequest req(HttpMethod::Get);
req.path("/secure/data");

client << req;

HttpResponse res;
client >> res;
```

---

## Construction

```cpp
// HTTP client with defaults
HttpClient client("example.com", 80);

// HTTPS client
HttpsClient client("example.com", 443);

// Disable keep-alive
HttpClient client("example.com", 80, false);
```

---

## Making requests

### GET request

```cpp
HttpClient client("api.example.com");

HttpRequest req(HttpMethod::Get);
req.path("/api/v1/users");
req.parameter("page", "2");
req.parameter("limit", "50");

client << req;

HttpResponse res;
client >> res;

if (res.status() == "200")
{
    std::string data;
    std::getline(client, data, '\0');
    processData(data);
}
```

### POST request

```cpp
HttpClient client("api.example.com");

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
```

### DELETE request

```cpp
HttpRequest req(HttpMethod::Delete);
req.path("/api/users/123");

client << req;

HttpResponse res;
client >> res;
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
req.header("X-API-Key", apiKey);

client << req;
```

### Bearer token authentication

```cpp
HttpRequest req(HttpMethod::Get);
req.path("/api/protected");
req.header("Authorization", "Bearer " + accessToken);

client << req;
```

### Basic authentication

```cpp
// Encode credentials (username:password in base64)
std::string credentials = base64Encode("user:pass");
req.header("Authorization", "Basic " + credentials);
```

---

## Keep-alive

### Persistent connections

```cpp
// Enable keep-alive (default)
HttpClient client("api.example.com", 80, true);

// Multiple requests on same connection
for (int i = 0; i < 10; ++i)
{
    HttpRequest req(HttpMethod::Get);
    req.path("/data/" + std::to_string(i));

    client << req;

    HttpResponse res;
    client >> res;

    // Process response...
}
// Connection automatically reused
```

### Connection management

```cpp
HttpClient client("example.com");

// Check keep-alive settings
auto timeout = client.keepAliveTimeout();
int maxRequests = client.keepAliveMax();

// Manually close connection
client.close();
```

---

## Response handling

### Reading body

```cpp
client << req;

HttpResponse res;
client >> res;

// Read entire body
std::string body;
std::getline(client, body, '\0');

// Or read with Content-Length
size_t length = res.contentLength();
if (length > 0)
{
    std::string body(length, '\0');
    client.read(&body[0], length);
}
```

### Checking status

```cpp
HttpResponse res;
client >> res;

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
req.header("Accept-Encoding", "gzip, deflate");

client << req;

HttpResponse res;
client >> res;

// Body is automatically decompressed
std::string body;
std::getline(client, body, '\0');
```

---

## Error handling

```cpp
HttpClient client("api.example.com");

try
{
    client << req;

    if (client.fail())
    {
        std::cerr << "Request failed\n";
        return;
    }

    HttpResponse res;
    client >> res;

    if (client.fail())
    {
        std::cerr << "Response failed\n";
        return;
    }

}
catch (const std::exception& e)
{
    std::cerr << "Error: " << e.what() << "\n";
}
```

---

## Common patterns

### JSON API client

```cpp
class ApiClient
{
    HttpsClient client;
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

        if (res.status() != "200")
        {
            throw std::runtime_error("Request failed: " + res.status());
        }

        std::string body;
        std::getline(client, body, '\0');
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

        std::string body;
        std::getline(client, body, '\0');
        return body;
    }
};
```

### File download

```cpp
void downloadFile(const std::string& url, const std::string& output)
{
    HttpClient client("example.com");

    HttpRequest req(HttpMethod::Get);
    req.path("/files/document.pdf");

    client << req;

    HttpResponse res;
    client >> res;

    if (res.status() == "200")
    {
        std::ofstream file(output, std::ios::binary);
        file << client.rdbuf();
    }
}
```

### Retry logic

```cpp
HttpResponse requestWithRetry(HttpClient& client, HttpRequest& req, int maxRetries = 3)
{
    for (int i = 0; i < maxRetries; ++i)
    {
        try
        {
            client << req;

            HttpResponse res;
            client >> res;

            if (res.status()[0] != '5')
            {
                return res;  // Success or client error
            }

            // Server error - retry
            std::this_thread::sleep_for(std::chrono::seconds(1 << i));

        }
        catch (...)
        {
            if (i == maxRetries - 1) throw;
        }
    }

    throw std::runtime_error("Max retries exceeded");
}
```

---

## HTTPS specifics

```cpp
// HTTPS with default port (443)
HttpsClient client("secure.example.com");

// HTTPS with custom port
HttpsClient client("secure.example.com", 8443);

// Everything else works the same as HTTP
client << req;
client >> res;
```

---

## Best practices

### Reuse clients

```cpp
// Good: Reuse client for multiple requests
HttpClient client("api.example.com");
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
    HttpClient client("api.example.com");  // Slow!
    // ...
}
```

### Set timeouts

```cpp
// Connection timeout via socket buffer
// (requires access to underlying socket)
client.timeout(5000);  // 5 seconds
```

### Always check status

```cpp
client << req;
HttpResponse res;
client >> res;

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
