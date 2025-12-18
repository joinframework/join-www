---
title: "Quick Start"
description: "Get started with Join framework in minutes"
weight: 1
---

# Quick Start Guide

This guide will help you get Join framework up and running on your system in just a few minutes.

## Prerequisites

Join framework requires:
- A C++14 compatible compiler
- CMake
- Linux operating system

## Dependencies

Join relies on the following libraries:
- **OpenSSL** (`libssl-dev`) - For cryptographic operations and TLS support
- **zlib** (`zlib1g-dev`) - For compression capabilities
- **Google Test** (`libgtest-dev`) - For unit testing (optional)
- **Google Mock** (`libgmock-dev`) - For mocking in tests (optional)

### Installing Dependencies

On Ubuntu/Debian systems:

```bash
sudo apt update && sudo apt install libssl-dev zlib1g-dev libgtest-dev libgmock-dev
```

## Download

Clone the latest source code from GitHub:

```bash
git clone https://github.com/joinframework/join.git
cd join
```

## Configuration

Configure Join using CMake. Here are the most common configurations:

### Standard Release Configuration

For production use:

```bash
cmake -B build -G "Unix Makefiles" -DCMAKE_BUILD_TYPE=Release
```

### Debug Configuration with Tests

For development with tests and coverage enabled:

```bash
cmake -B build -G "Unix Makefiles" -DCMAKE_BUILD_TYPE=Debug -DJOIN_ENABLE_TESTS=ON -DJOIN_ENABLE_COVERAGE=ON
```

### Configuration Options

Available CMake options:

| Option | Description | Default |
|--------|-------------|---------|
| `CMAKE_BUILD_TYPE` | Build type: `Release`, `Debug`, `RelWithDebInfo`, `MinSizeRel` | `Release` |
| `DJOIN_ENABLE_TESTS` | Enable unit tests | `OFF` |
| `DJOIN_ENABLE_COVERAGE` | Enable code coverage reporting | `OFF` |

## Build

Build Join using CMake:

### Release Build
```bash
cmake --build build --config Release
```

### Debug Build
```bash
cmake --build build --config Debug
```

## Installation

Install Join to your system:

```bash
sudo cmake --install build
```

After installation, you may need to update the library cache:

```bash
sudo ldconfig
```

## Running Tests

If you configured with tests enabled (`-DJOIN_ENABLE_TESTS=ON`), run the test suite:

```bash
ctest --test-dir build --output-on-failure -C Debug
```

## Next Steps

Now that you have Join installed and working, explore the modules:

- **[Core Module](/docs/modules/core/)** - Event loops, timers, caching, queues and more ...
- **[Network Module](/docs/modules/network/)** - HTTP, sockets, and protocols
- **[Crypto Module](/docs/modules/crypto/)** - Encryption, hashing, and signatures
- **[SAX Module](/docs/modules/sax/)** - JSON and MessagePack parsing
- **[Thread Module](/docs/modules/thread/)** - Multithreading and synchronization

## Additional Resources

- **[API Documentation](https://joinframework.github.io/join/)** - Complete Doxygen reference
- **[GitHub Repository](https://github.com/joinframework/join)** - Source code
- **[Issue Tracker](https://github.com/joinframework/join/issues)** - Report bugs or request features

## Getting Help

If you encounter issues:

1. Check this troubleshooting section
2. Search [existing issues](https://github.com/joinframework/join/issues)
3. Review the [API documentation](https://joinframework.github.io/join/)
4. Open a [new issue](https://github.com/joinframework/join/issues/new) with:
   - Your system information (OS, compiler version)
   - CMake configuration command
   - Complete error messages
   - Minimal reproducible example

## License

Join is released under the [MIT License](https://choosealicense.com/licenses/mit/), giving you maximum freedom to use it in your projects, whether open source or proprietary.
