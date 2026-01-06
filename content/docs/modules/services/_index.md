---
title: "Services"
weight: 5
bookCollapseSection: true
---

# Services Module

The **Services** module implements application-layer protocols including HTTP/HTTPS and SMTP/SMTPS, providing both client and server implementations.

---

## 🌐 HTTP Protocol

HTTP/1.1 implementation with client and server support:

### Cache

Memory-mapped files (mmap) for efficient access to frequently read files.

**Features:**
- Thread-safe access using mutex locks
- Automatic memory-mapped file management
- Automatic cache invalidation on file changes
- Easy removal of individual cache entries or clearing the entire cache
- Keeps track of cached file sizes and modification timestamps

**Use Cases:**
- Serving static files efficiently in HTTP servers
- Reducing repeated disk reads for frequently accessed resources
- Caching configuration files or templates for fast access
- Memory-efficient access to large files without loading them entirely into RAM

---

### Chunk Stream

HTTP chunked transfer encoding support:

**Features:**
- Chunked encoding for streaming responses
- Chunked decoding for streaming requests
- Stream-based interface
- HTTP/1.1 compliance

**Use Cases:**
- Large file transfers
- Streaming data
- Server-sent events
- Progressive rendering

---

### HTTP Message

Core HTTP message handling:

**Classes:**
- **HttpRequest** - HTTP request representation
- **HttpResponse** - HTTP response representation

**Features:**
- Header management (get, set, remove)
- Body handling
- HTTP methods (GET, POST, PUT, DELETE, HEAD)
- Status codes with standard messages
- Query parameter parsing
- URL encoding/decoding

**Request Components:**
- Method
- URI/Path
- HTTP version
- Headers
- Body

**Response Components:**
- Status code
- Reason phrase
- Headers
- Body

---

### HTTP Client

HTTP/HTTPS client implementation:

**Features:**
- All HTTP methods (GET, POST, PUT, DELETE, HEAD)
- Keep-alive connections
- Automatic redirect following (optional)
- Timeout support
- Custom headers

**TLS Support:**
- HTTPS (TLS/SSL) connections
- Certificate verification
- Custom SSL context configuration

**Connection Management:**
- Connection pooling
- Keep-alive support
- Automatic reconnection

**Use Cases:**
- API client implementation
- Web scraping
- Service integration
- Microservice communication

---

### HTTP Server

HTTP/HTTPS server implementation:

**Features:**
- Request handling via callbacks
- Multi-threaded request processing
- Keep-alive connection support
- Custom error pages

**TLS Support:**
- HTTPS server with TLS/SSL
- Certificate and key configuration
- SNI (Server Name Indication) support

**Request Handling:**
- Route-based handlers
- Middleware support potential
- Request/response lifecycle
- Error handling

**Scalability:**
- Thread pool integration
- Efficient connection handling
- Concurrent request processing

**Use Cases:**
- REST API servers
- Web applications
- Microservices
- Internal services

---

## 📧 Email Protocol

SMTP client implementation for sending emails:

### Mail Message

Email message construction:

**Features:**
- MIME message building
- Header management (From, To, Cc, Bcc, Subject, etc.)
- Multi-part messages
- Attachment support
- Text and HTML bodies

**Components:**
- Sender information
- Recipient lists (To, Cc, Bcc)
- Subject line
- Message body
- Attachments

**MIME Support:**
- Multipart/mixed
- Multipart/alternative
- Base64 encoding for attachments
- Content-Type headers

---

### SMTP Client

SMTP/SMTPS email client:

**Features:**
- SMTP protocol implementation
- STARTTLS support
- Authentication mechanisms
- Connection management

**TLS Support:**
- SMTPS (SMTP over TLS)
- STARTTLS upgrade
- Certificate verification

**Authentication:**
- PLAIN
- LOGIN
- Multiple authentication methods

**Operations:**
- Connect to SMTP server
- Authenticate
- Send mail message
- Handle responses

**Use Cases:**
- Automated email notifications
- Alerting systems
- Newsletter distribution
- Transaction emails

---

## 📚 API Reference

For detailed API documentation, see:

[Doxygen Reference](https://joinframework.github.io/join/)
