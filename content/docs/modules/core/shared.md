---
title: "Shared Memory"
weight: 7
---

# Shared Memory

Join provides **lock-free inter-process communication** through shared memory ring buffers.
Built on POSIX shared memory (`shm_open`), these components enable **high-performance message passing** between processes.

Shared memory features:

* **lock-free** — using atomic operations for synchronization
* **zero-copy** — direct memory access between processes
* **typed policies** — SPSC, MPSC, MPMC ring buffer variants
* **bidirectional** — built-in endpoint abstraction for duplex communication

---

## Ring buffer policies

Join offers three lock-free ring buffer policies:

### SPSC — Single Producer Single Consumer

```cpp
Spsc::Producer producer("channel", elementSize, capacity);
Spsc::Consumer consumer("channel", elementSize, capacity);
```

Optimized for one writer and one reader.

### MPSC — Multiple Producer Single Consumer

```cpp
Mpsc::Producer producer("channel", elementSize, capacity);
Mpsc::Consumer consumer("channel", elementSize, capacity);
```

Multiple writers, single reader.

### MPMC — Multiple Producer Multiple Consumer

```cpp
Mpmc::Producer producer("channel", elementSize, capacity);
Mpmc::Consumer consumer("channel", elementSize, capacity);
```

Multiple writers and readers.

---

## Producer / Consumer

### Creating a producer

```cpp
#include <join/shared.hpp>

using join;

Spsc::Producer producer("my_channel", 1024, 64);

if (producer.open() == -1) {
    // Handle error
}
```

### Sending data

```cpp
struct Message {
    uint64_t id;
    char data[1016];
};

Message msg = {42, "Hello"};

// Non-blocking
if (producer.tryPush(&msg) == -1) {
    // Buffer full
}

// Blocking
producer.push(&msg);

// Blocking with timeout
producer.timedPush(&msg, std::chrono::milliseconds(100));
```

### Creating a consumer

```cpp
Spsc::Consumer consumer("my_channel", 1024, 64);

if (consumer.open() == -1) {
    // Handle error
}
```

### Receiving data

```cpp
Message msg;

// Non-blocking
if (consumer.tryPop(&msg) == -1) {
    // No data available
}

// Blocking
consumer.pop(&msg);

// Blocking with timeout
consumer.timedPop(&msg, std::chrono::seconds(1));
```

---

## Bidirectional endpoints

Endpoints provide **duplex communication** with automatic channel management.

### Creating endpoints

```cpp
// Process A
Spsc::Endpoint endpointA(Spsc::Endpoint::Side::A, "ipc_channel", 512, 128);
endpointA.open();

// Process B
Spsc::Endpoint endpointB(Spsc::Endpoint::Side::B, "ipc_channel", 512, 128);
endpointB.open();
```

### Sending and receiving

```cpp
char buffer[512];

// Send from A to B
strcpy(buffer, "ping");
endpointA.send(buffer);

// Receive on B
endpointB.receive(buffer);

// Reply from B to A
strcpy(buffer, "pong");
endpointB.send(buffer);

// Receive reply on A
endpointA.receive(buffer);
```

### Non-blocking operations

```cpp
if (endpoint.trySend(buffer) == 0) {
    // Sent successfully
}

if (endpoint.tryReceive(buffer) == 0) {
    // Received data
}
```

---

## Queue state inspection

### Check available space

```cpp
uint64_t slots = producer.available();
if (producer.full()) {
    // Cannot send without blocking
}
```

### Check pending messages

```cpp
uint64_t messages = consumer.pending();
if (consumer.empty()) {
    // No messages available
}
```

### Endpoint state

```cpp
if (endpoint.opened()) {
    uint64_t canSend = endpoint.available();
    uint64_t canRecv = endpoint.pending();
}
```

---

## Parameters

### Element size and capacity

```cpp
// 1472 bytes per element (default)
// 144 elements capacity (default)
Producer producer("channel", 1472, 144);
```

* **elementSize**: fixed size of each message in bytes
* **capacity**: maximum number of elements in the ring buffer

Total shared memory size = `(elementSize × capacity) + overhead`

---

## Cleanup

### Unlinking shared memory

```cpp
// After all processes are done
SharedMemory::unlink("my_channel");

// For endpoints (two segments)
SharedMemory::unlink("ipc_channel_AB");
SharedMemory::unlink("ipc_channel_BA");
```

Unlink removes the shared memory segment from the system.

---

## Error handling

All operations return `0` on success, `-1` on failure. Check `lastError` for details:

```cpp
if (producer.push(&msg) == -1) {
    std::cerr << "Error: " << lastError.message() << "\n";
}
```

Common errors:

* `InvalidParam` — null pointer or mismatched parameters
* `TemporaryError` — buffer full/empty (try again)
* `TimedOut` — timeout expired
* `InUse` — already opened

---

## Best practices

* **Match parameters** — element size and capacity must match between producer/consumer
* **Use appropriate policy** — SPSC for best performance when possible
* **Handle timeouts** — use `timedPush`/`timedPop` to avoid indefinite blocking
* **Clean up** — unlink shared memory when done
* **Fixed-size messages** — all messages must be exactly `elementSize` bytes

---

## Summary

| Feature                    | Supported |
| -------------------------- | --------- |
| Lock-free synchronization  | ✅         |
| Inter-process communication| ✅         |
| Multiple policies (SPSC/MPSC/MPMC) | ✅         |
| Bidirectional endpoints    | ✅         |
| Timeout operations         | ✅         |
| Zero-copy transfers        | ✅         |
