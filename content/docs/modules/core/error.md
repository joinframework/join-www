---
title: "Error Handling"
weight: 10
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

| Error Code          | Message                  | Description                                       |
| ------------------- | ------------------------ | ------------------------------------------------- |
| `InUse`             | already in use           | Resource already in use                           |
| `InvalidParam`      | invalid parameters       | Invalid parameters provided                       |
| `ConnectionRefused` | connection refused       | Connection was refused                            |
| `ConnectionClosed`  | connection closed        | Connection closed by peer                         |
| `TimedOut`          | timer expired            | Operation timed out                               |
| `PermissionDenied`  | operation not permitted  | Operation not permitted                           |
| `OutOfMemory`       | cannot allocate memory   | Memory allocation failed                          |
| `OperationFailed`   | operation failed         | Operation failed                                  |
| `NotFound`          | resource not found       | Resource not found                                |
| `MessageUnknown`    | message unknown          | Message unknown                                   |
| `MessageTooLong`    | message too long         | Message too long                                  |
| `TemporaryError`    | temporary error          | Temporary error, retry later                      |
| `UnknownError`      | unknown error            | Unknown error occurred                            |

---

## Checking errors

### Using `lastError`

Most Join functions return `-1` on failure. Check the thread-local `lastError` for details:

```cpp
#include <join/error.hpp>

using namespace join;

if (operation() == -1)
{
    std::cerr << "Error: " << lastError.message() << "\n";
}
```

### Comparing error codes

`Errc` is registered as `std::is_error_condition_enum`, so comparisons with `==` work directly:

```cpp
if (lastError == Errc::TimedOut)
{
    // handle timeout
}

if (lastError == Errc::TemporaryError)
{
    // retry operation
}
```

### Checking error category

```cpp
if (lastError.category() == join::getErrorCategory())
{
    // this is a Join error
}
```

---

## Creating error codes

```cpp
std::error_code ec = join::make_error_code(Errc::InvalidParam);

lastError = join::make_error_code(Errc::ConnectionClosed);
```

---

## Error equivalence

Join errors map to standard system error codes via the `equivalent()` method.
This allows comparing a raw `errno`-based `std::error_code` against a `join::Errc` condition directly.

### Complete mappings

| Join error          | Equivalent system errors                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `InUse`             | `already_connected`, `connection_already_in_progress`, `address_in_use`, `file_exists`                                                     |
| `InvalidParam`      | `no_such_file_or_directory`, `address_family_not_supported`, `invalid_argument`, `protocol_not_supported`, `not_a_socket`, `bad_address`, `no_protocol_option`, `destination_address_required`, `operation_not_supported` |
| `ConnectionRefused` | `connection_refused`, `network_unreachable`                                                                                                 |
| `ConnectionClosed`  | `connection_reset`, `not_connected`, `broken_pipe`                                                                                          |
| `TimedOut`          | `timed_out`                                                                                                                                 |
| `PermissionDenied`  | `permission_denied`, `operation_not_permitted`                                                                                              |
| `OutOfMemory`       | `too_many_files_open`, `too_many_files_open_in_system`, `no_buffer_space`, `not_enough_memory`, `no_lock_available`                         |
| `OperationFailed`   | `bad_file_descriptor`                                                                                                                       |
| `MessageUnknown`    | `no_message`, `bad_message`, `no_message_available`                                                                                         |
| `MessageTooLong`    | `message_size`                                                                                                                              |
| `TemporaryError`    | `interrupted`, `resource_unavailable_try_again`, `operation_in_progress`                                                                    |

---

## Thread safety

`lastError` is **thread-local** — each thread has its own independent error state:

```cpp
void threadFunction()
{
    if (operation() == -1)
    {
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

---

## Example usage

### Basic error handling

```cpp
#include <join/error.hpp>

using namespace join;

Tcp::Socket socket;

if (socket.connect(endpoint) == -1)
{
    if (lastError == Errc::ConnectionRefused)
    {
        std::cerr << "Connection refused\n";
    }
    else
    {
        std::cerr << "Failed: " << lastError.message() << "\n";
    }
}
```

### Retry on temporary errors

```cpp
int retryOperation()
{
    for (int attempts = 0; attempts < 3; ++attempts)
    {
        if (producer.tryPush(&msg) == 0)
        {
            return 0;  // success
        }

        if (lastError != Errc::TemporaryError)
        {
            return -1;  // permanent error
        }

        std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }
    return -1;
}
```

### Custom error dispatch

```cpp
void handleError(const std::error_code& ec)
{
    if (ec == Errc::TimedOut)
    {
        // retry logic
    }
    else if (ec == Errc::ConnectionClosed)
    {
        // reconnect logic
    }
    else
    {
        std::cerr << "Error: " << ec.message() << "\n";
    }
}
```

---

## Summary

| Feature                    | Supported |
| -------------------------- | :-------: |
| Thread-local error state   | ✅         |
| Standard error integration | ✅         |
| Human-readable messages    | ✅         |
| Error equivalence mapping  | ✅         |
| Custom error category      | ✅         |
