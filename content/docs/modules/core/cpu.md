---

title: "CPU Topology"
weight: 125
---

# CPU Topology

Join provides a **CPU topology detector** that reads hardware structure at runtime from the Linux sysfs interface.
`CpuTopology` is a singleton that exposes the physical layout of the machine — sockets, cores, hardware threads, and NUMA nodes — and is used internally by `ThreadPool` and `distribute()` for topology-aware thread sizing.

---

## Concepts

### Logical CPU

A **logical CPU** (also called a hardware thread) is what the OS schedules work on.
On a system with Hyper-Threading or SMT enabled, each physical core exposes two or more logical CPUs.

```
LogicalCpu
├── id      — OS CPU index (0, 1, 2, ...)
├── core    — physical core ID
├── socket  — physical socket ID
└── numa    — NUMA node ID
```

### Physical core

A **physical core** groups all the logical CPUs that share its execution units.

```
PhysicalCore
├── id      — physical core ID
├── socket  — physical socket ID
├── numa    — NUMA node ID
└── threads — list of logical CPUs (SMT/HT threads)
```

### NUMA node

A **NUMA node** groups the physical cores that share the same memory controller.
On single-socket systems there is typically one node (node 0).

```
NumaNode
├── id    — NUMA node ID
└── cores — list of physical core IDs belonging to this node
```

---

## Accessing the topology

`CpuTopology` is a singleton — construction and detection happen once on first access.

```cpp
#include <join/cpu.hpp>

using namespace join;

const CpuTopology* topo = CpuTopology::instance();
```

`CpuTopology` is neither copyable nor movable.

---

## Physical cores

```cpp
const auto& cores = topo->cores();

for (const auto& core : cores)
{
    // core.id     — physical core ID
    // core.socket — socket ID
    // core.numa   — NUMA node ID
    // core.threads — logical CPUs on this core
}
```

Cores are sorted by socket first, then by core ID within each socket.

### Primary thread

To get the first logical CPU of a core (avoids relying on a hyper-thread):

```cpp
int cpuId = core.primaryThread();  // -1 if no threads
```

This is the recommended way to pin a thread to a core without activating a sibling HT thread.

---

## NUMA nodes

```cpp
const auto& nodes = topo->nodes();

for (const auto& node : nodes)
{
    // node.id    — NUMA node ID
    // node.cores — physical core IDs in this node
}
```

Nodes are sorted by node ID.

---

## Common queries

### Number of physical cores

```cpp
size_t coreCount = topo->cores().size();
```

This is the value used by `ThreadPool` and `distribute()` as the default thread count.

### Number of logical CPUs (with HT)

```cpp
size_t logicalCount = 0;
for (const auto& core : topo->cores())
{
    logicalCount += core.threads.size();
}
```

### Cores on a specific NUMA node

```cpp
int targetNode = 0;

for (const auto& core : topo->cores())
{
    if (core.numa == targetNode)
    {
        // use core.primaryThread() to pin a thread here
    }
}
```

### Cores on a specific socket

```cpp
int targetSocket = 0;

for (const auto& core : topo->cores())
{
    if (core.socket == targetSocket)
    {
        // ...
    }
}
```

---

## Integration with Thread

`CpuTopology` is typically combined with `Thread::affinity()` to pin threads to specific cores:

```cpp
const auto& cores = CpuTopology::instance()->cores();

Thread thread([]() {
    // work
});

// pin to the primary hardware thread of core 0
thread.affinity(cores[0].primaryThread());
```

---

## Integration with ThreadPool and distribute()

Both `ThreadPool` and `distribute()` use `CpuTopology` to size their worker count:

```cpp
// ThreadPool default = number of physical cores
ThreadPool pool;  // pool.size() == topo->cores().size()

// distribute() uses the same count, capped to element count
distribute(data.begin(), data.end(), [](auto first, auto last) {
    // ...
});
```

---

## Debug dump

When compiled with `DEBUG` defined, the full topology can be printed to standard output:

```cpp
#ifdef DEBUG
CpuTopology::instance()->dump();
#endif
```

Example output on a dual-core HT system:

```
NUMA 0:
  Socket 0:
     Core 0: [ 0, 4 ]
     Core 1: [ 1, 5 ]
     Core 2: [ 2, 6 ]
     Core 3: [ 3, 7 ]
```

Each bracketed list shows the logical CPU IDs for that core.
The first ID in each list is the one returned by `primaryThread()`.

---

## Implementation notes

Detection reads from `/sys/devices/system/cpu/cpuN/topology/` and scans for `nodeN` symlinks to determine NUMA membership.
If sysfs is unavailable or a value cannot be read, `-1` is returned for that field.
The result is a stable, sorted view of the hardware that does not change after the singleton is constructed.

---

## Summary

| Feature                     | Supported |
| --------------------------- | :-------: |
| Physical core enumeration   | ✅         |
| Logical CPU enumeration     | ✅         |
| SMT / HT awareness          | ✅         |
| NUMA node detection         | ✅         |
| Multi-socket support        | ✅         |
| Primary thread selection    | ✅         |
| Singleton lifecycle         | ✅         |
| Runtime sysfs detection     | ✅         |
| Debug dump                  | ✅ (DEBUG) |
