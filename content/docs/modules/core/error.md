---
title: "Error Handling"
weight: 1
---

# Error Handling

Join provides a **standardized error handling system** built on top of C++ `<system_error>`.
Errors are reported through a **thread-local error code** and a custom error category.

Error handling features:

* **thread-safe** — uses thread-local storage
* **standard compliant** — integrates with `std::error_code`
* **expressive** — human-readable error messages
* **compatible** — maps to standard system error codes

---

## Error codes

Join defines common error conditions in the `Errc` enum:

| Error Code              | Description                                    |
| ----------------------- | ---------------------------------------------- |
| `InUse`                 | Resource already in use                        |
| `InvalidParam`          | Invalid parameters provided                    |
| `ConnectionRefused`     | Connection was refused                         |
| `ConnectionClosed`      | Connection closed by peer                      |
| `TimedOut`              | Operation timed out                            |
| `PermissionDenied`      | Operation not permitted                        |
| `OutOfMemory`           | Cannot allocate memory                         |
| `OperationFailed`       | Operation failed                               |
| `NotFound`              | Resource not found                             |
| `MessageUnknown`        | Message unknown                                |
| `MessageTooLong`        | Message too long                               |
| `TemporaryError`        | Temporary error, retry later                   |
| `UnknownError`          | Unknown error occurred                         |

---

## Checking errors

### Using `lastError`

Most Join functions return `-1` on failure. Check the thread-local `lastError` for details:

```cpp
#include <join/error.hpp>

using join;

if (operation() == -1) {
    std::cerr << "Error: " << lastError.message() << "\n";
}
```

### Comparing error codes

```cpp
if (lastError == Errc::TimedOut) {
    // Handle timeout
}

if (lastError == Errc::TemporaryError) {
    // Retry operation
}
```

### Checking error category

```cpp
if (lastError.category() == join::getErrorCategory()) {
    // This is a Join error
}
```

---

## Creating error codes

### Using `make_error_code`

```cpp
std::error_code ec = join::make_error_code(Errc::InvalidParam);
```

### Setting `lastError`

```cpp
lastError = join::make_error_code(Errc::ConnectionClosed);
```

---

## Error equivalence

Join errors map to standard system error codes. The `equivalent` function provides automatic mapping:

```cpp
// System error
std::error_code sysErr = std::make_error_code(std::errc::connection_refused);

// Equivalent to Join error
if (join::getErrorCategory().equivalent(sysErr, static_cast<int>(Errc::ConnectionRefused))) {
    // true
}
```

### Common mappings

* `Errc::InUse` ← `already_connected`, `address_in_use`, `file_exists`
* `Errc::InvalidParam` ← `invalid_argument`, `not_a_socket`, `bad_address`
* `Errc::ConnectionRefused` ← `connection_refused`, `network_unreachable`
* `Errc::ConnectionClosed` ← `connection_reset`, `broken_pipe`, `not_connected`
* `Errc::TimedOut` ← `timed_out`
* `Errc::TemporaryError` ← `interrupted`, `resource_unavailable_try_again`

---

## Error messages

### Getting human-readable messages

```cpp
std::error_code ec = join::make_error_code(Errc::ConnectionRefused);
std::cout << ec.message() << "\n";  // "connection refused"
```

### Custom error handling

```cpp
void handleError(const std::error_code& ec) {
    if (ec.category() == join::getErrorCategory()) {
        switch (static_cast<Errc>(ec.value())) {
            case Errc::TimedOut:
                // Retry logic
                break;
            case Errc::ConnectionClosed:
                // Reconnect logic
                break;
            default:
                std::cerr << "Error: " << ec.message() << "\n";
        }
    }
}
```

---

## Thread safety

`lastError` is **thread-local**, meaning each thread has its own error state:

```cpp
void threadFunction() {
    if (operation() == -1) {
        // lastError is specific to this thread
        std::cerr << lastError.message() << "\n";
    }
}

std::thread t1(threadFunction);
std::thread t2(threadFunction);
```

---

## Best practices

* **Check return values** — most Join functions return `-1` on error
* **Inspect `lastError` immediately** — error state may be overwritten by subsequent calls
* **Handle `TemporaryError`** — these errors indicate retry is appropriate
* **Use error equivalence** — leverage automatic mapping to system errors
* **Clear errors explicitly** — set `lastError` to default state when recovering

---

## Example usage

### Basic error handling

```cpp
#include <join/shared.hpp>
#include <join/error.hpp>

using join;

Spsc::Producer producer("channel", 1024, 64);

if (producer.open() == -1) {
    if (lastError == Errc::InUse) {
        std::cerr << "Channel already open\n";
    } else {
        std::cerr << "Failed to open: " << lastError.message() << "\n";
    }
    return;
}
```

### Retry on temporary errors

```cpp
int retryOperation() {
    int attempts = 0;
    while (attempts < 3) {
        if (producer.tryPush(&msg) == 0) {
            return 0;  // Success
        }
        
        if (lastError != Errc::TemporaryError) {
            return -1;  // Permanent error
        }
        
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
        attempts++;
    }
    return -1;
}
```

---

## Summary

| Feature                     | Supported |
| --------------------------- | --------- |
| Thread-local error state    | ✅         |
| Standard error integration  | ✅         |
| Human-readable messages     | ✅         |
| Error equivalence mapping   | ✅         |
| Custom error category       | ✅         |
