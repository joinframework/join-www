---
title: "Quick Start"
weight: 1
---

# Quick Start Guide

This guide will help you get Join framework up and running on your system in few minutes.

---

## Prerequisites

Join framework requires:
- **C++14 compatible compiler**
- **CMake**
- **Linux operating system**

---

## Dependencies

Join relies on the following libraries:

| Library | Package | Purpose |
|---------|---------|---------|
| **OpenSSL** | `libssl-dev` | TLS support and cryptographic operations |
| **zlib** | `zlib1g-dev` | Compression capabilities |
| **Google Test** | `libgtest-dev` | Unit testing (optional) |
| **Google Mock** | `libgmock-dev` | Mocking in tests (optional) |

> **Note:** OpenSSL is required by `join_core` as TLS support is part of the core runtime.

---

### Installing Dependencies

**On Ubuntu/Debian:**

```bash
sudo apt update && sudo apt install libssl-dev zlib1g-dev libgtest-dev libgmock-dev
```

---

## Download

Clone the latest source code from GitHub:

```bash
git clone https://github.com/joinframework/join.git
```

---

## Configuration

Configure Join using CMake. Here are the most common configurations:

### Standard Release Configuration

For production use:

```bash
cmake -B build -DCMAKE_BUILD_TYPE=Release
```

### Debug Configuration with Tests

For development with tests and coverage enabled:

```bash
cmake -B build -DCMAKE_BUILD_TYPE=Debug -DJOIN_ENABLE_TESTS=ON
```

### Configuration Options

Available CMake options:

| Option | Description | Default |
|--------|-------------|---------|
| `CMAKE_BUILD_TYPE` | Build type: `Release`, `Debug`, `RelWithDebInfo`, `MinSizeRel` | `Release` |
| `BUILD_SHARED_LIBS` | Build as shared libraries (OFF for static) | `ON` |
| `JOIN_ENABLE_CRYPTO` | Enable crypto module | `ON` |
| `JOIN_ENABLE_DATA` | Enable data module | `ON` |
| `JOIN_ENABLE_FABRIC` | Enable fabric module | `ON` |
| `JOIN_ENABLE_SERVICES` | Enable services module | `ON` |
| `JOIN_ENABLE_TESTS` | Enable unit tests | `OFF` |
| `JOIN_ENABLE_COVERAGE` | Enable code coverage reporting | `OFF` |
| `CMAKE_INSTALL_PREFIX` | Installation directory | `/usr/local` |

---

## Build

Build Join using CMake:

```bash
cmake --build build
```

---

## Installation

Install Join to your system:

```bash
sudo cmake --install build
```

After installation, you may need to update the library cache:

```bash
sudo ldconfig
```

---

## Running Tests

If you configured with tests enabled (`-DJOIN_ENABLE_TESTS=ON`), run the test suite:

```bash
ctest --test-dir build --output-on-failure
```

---

## Using Join in Your Project

Once installed, you can use Join in your CMake projects:

### CMakeLists.txt

```cmake
cmake_minimum_required(VERSION 3.14)
project(MyApp)

# Find the join package
find_package(join REQUIRED)

# Create your executable
add_executable(myapp main.cpp)

# Link against Join modules
target_link_libraries(myapp PRIVATE 
    join::core
    join::crypto
    join::data
    join::fabric
    join::services
)

# Set C++ standard
set_target_properties(myapp PROPERTIES
    CXX_STANDARD 14
    CXX_STANDARD_REQUIRED ON
)
```

---

## Next Steps

Now that you have Join installed and working, explore the modules:

- **[Core Module]({{< ref "core" >}})** - Reactor, sockets, threads, timers
- **[Fabric Module]({{< ref "fabric" >}})** - Interface management, ARP, DNS
- **[Crypto Module]({{< ref "crypto" >}})** - Hashing, signatures, TLS
- **[Data Module]({{< ref "data" >}})** - JSON, MessagePack, compression
- **[Services Module]({{< ref "services" >}})** - HTTP/HTTPS, SMTP/SMTPS

---

## Additional Resources

- **[API Documentation](https://joinframework.github.io/join/)** - Complete Doxygen reference
- **[GitHub Repository](https://github.com/joinframework/join)** - Source code
- **[Issue Tracker](https://github.com/joinframework/join/issues)** - Report bugs or request features

---

## Getting Help

If you encounter issues:

1. Search [existing issues](https://github.com/joinframework/join/issues)
2. Review the [API documentation](https://joinframework.github.io/join/)
3. Open a [new issue](https://github.com/joinframework/join/issues/new) with:
   - Your system information (OS, compiler version)
   - CMake configuration command
   - Complete error messages
   - Minimal reproducible example

---

## License

Join is released under the [MIT License](https://choosealicense.com/licenses/mit/), giving you maximum freedom to use it in your projects, whether open source or proprietary.
