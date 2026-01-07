---
title: "SMTP Client"
weight: 8
---

# SMTP Client

`SmtpClient` provides an **SMTP email client** for sending email messages.
It supports authentication, STARTTLS encryption, and both SMTP and SMTPS protocols.

`SmtpClient` is designed to be:

* **easy** — simple API for sending emails
* **secure** — supports TLS/SSL encryption
* **flexible** — multiple authentication methods
* **complete** — handles SMTP protocol automatically

---

## Basic usage

### Sending an email

```cpp
#include <join/smtpclient.hpp>

// Create message
MailMessage mail;
mail.sender(MailSender("sender@example.com", "Sender"));
mail.addRecipient(MailRecipient("recipient@example.com"));
mail.subject("Test Email");
mail.content("Hello, World!");

// Create client
SmtpClient client("smtp.example.com", 587);

// Set credentials
client.credentials("username", "password");

// Send email
if (client.send(mail) == 0)
{
    std::cout << "Email sent successfully\n";
}
else
{
    std::cerr << "Failed to send email\n";
}
```

---

## Construction

### SMTP (unencrypted/STARTTLS)

```cpp
// Port 25 (default)
SmtpClient client("smtp.example.com");

// Port 587 (submission with STARTTLS)
SmtpClient client("smtp.example.com", 587);
```

### SMTPS (encrypted)

```cpp
// Port 465 (default for SMTPS)
SmtpsClient client("smtp.example.com");

// Custom port
SmtpsClient client("smtp.example.com", 465);
```

---

## Authentication

### Setting credentials

```cpp
SmtpClient client("smtp.example.com", 587);

// Set username and password
client.credentials("myusername", "mypassword");

// Send email
client.send(mail);
```

### Supported methods

The client automatically negotiates authentication:

- **LOGIN** — Username/password sent separately
- **PLAIN** — Username/password sent together

```cpp
// Client automatically chooses based on server capabilities
client.credentials("user@example.com", "password");
client.send(mail);
```

---

## Encryption

### STARTTLS

```cpp
// Connects unencrypted, upgrades to TLS
SmtpClient client("smtp.example.com", 587);
client.credentials("user", "password");

// Client automatically uses STARTTLS if available
client.send(mail);
```

### SMTPS (implicit TLS)

```cpp
// Encrypted from the start
SmtpsClient client("smtp.example.com", 465);
client.credentials("user", "password");
client.send(mail);
```

---

## TLS configuration

### Certificate verification

```cpp
SmtpClient client("smtp.example.com", 587);

// Set CA certificate for verification
client.setCaFile("/etc/ssl/certs/ca-bundle.crt");

// Enable verification
client.setVerify(true);

// Or set CA path
client.setCaPath("/etc/ssl/certs/");
```

### Client certificate

```cpp
SmtpClient client("smtp.example.com", 587);

// Set client certificate and key
client.setCertificate("/path/to/cert.pem", "/path/to/key.pem");
```

### Cipher configuration

```cpp
SmtpClient client("smtp.example.com", 587);

// TLS 1.2 and below
client.setCipher("ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256");

// TLS 1.3
client.setCipher_1_3("TLS_AES_256_GCM_SHA384:TLS_AES_128_GCM_SHA256");
```

---

## Common email services

### Gmail

```cpp
SmtpClient client("smtp.gmail.com", 587);
client.credentials("your-email@gmail.com", "app-password");
client.send(mail);

// Note: Use App Password, not regular password
```

### Outlook/Office 365

```cpp
SmtpClient client("smtp.office365.com", 587);
client.credentials("your-email@outlook.com", "password");
client.send(mail);
```

### Yahoo

```cpp
SmtpClient client("smtp.mail.yahoo.com", 587);
client.credentials("your-email@yahoo.com", "app-password");
client.send(mail);
```

### Custom server

```cpp
SmtpClient client("mail.company.com", 25);
// No authentication needed for internal server
client.send(mail);
```

---

## Complete examples

### Simple notification

```cpp
void sendNotification(const std::string& to, const std::string& message)
{
    MailMessage mail;
    mail.sender(MailSender("noreply@app.com", "App Notifications"));
    mail.addRecipient(MailRecipient(to));
    mail.subject("Notification");
    mail.content(message);

    SmtpClient client("smtp.example.com", 587);
    client.credentials("app-email@example.com", "password");

    if (client.send(mail) != 0)
    {
        std::cerr << "Failed to send notification\n";
    }
}
```

### Welcome email

```cpp
void sendWelcomeEmail(const User& user)
{
    MailMessage mail;

    mail.sender(MailSender("welcome@company.com", "Company Team"));
    mail.addRecipient(MailRecipient(user.email, user.name));
    mail.subject("Welcome to our service!");

    std::string content =
        "Dear " + user.name + ",\n"
        "\n"
        "Welcome to our service!\n"
        "\n"
        "To get started, please verify your email address.\n"
        "\n"
        "Best regards,\n"
        "The Team";

    mail.content(content);

    SmtpClient client("smtp.company.com", 587);
    client.credentials("noreply@company.com", "password");
    client.send(mail);
}
```

### Email with attachments (workaround)

```cpp
// Current version doesn't support attachments directly
// Workaround: Include links or embed small data

void sendReportLink(const std::string& to, const std::string& reportUrl)
{
    MailMessage mail;
    mail.sender(MailSender("reports@company.com", "Reports"));
    mail.addRecipient(MailRecipient(to));
    mail.subject("Your report is ready");

    mail.content(
        "Your report is ready for download:\n"
        "\n" +
        reportUrl + "\n"
        "\n"
        "This link will expire in 24 hours.\n"
    );

    SmtpClient client("smtp.company.com", 587);
    client.credentials("reports@company.com", "password");
    client.send(mail);
}
```

---

## Error handling

### Checking send result

```cpp
SmtpClient client("smtp.example.com", 587);
client.credentials("user", "password");

if (client.send(mail) == 0)
{
    std::cout << "Email sent successfully\n";
}
else
{
    std::error_code ec = join::lastError;
    std::cerr << "Send failed: " << ec.message() << "\n";
}
```

### Common errors

```cpp
int result = client.send(mail);

if (result != 0)
{
    // Check specific errors
    std::error_code ec = join::lastError;

    // Connection failed
    // Authentication failed
    // Invalid recipient
    // Server rejected message

    std::cerr << "Error: " << ec.message() << "\n";
}
```

---

## Best practices

### Use secure connections

```cpp
// Good: Use TLS (port 587 with STARTTLS)
SmtpClient client("smtp.example.com", 587);

// Good: Use SMTPS (port 465)
SmtpsClient client("smtp.example.com", 465);

// Avoid: Unencrypted (port 25)
SmtpClient client("smtp.example.com", 25);
```

### Validate before sending

```cpp
bool validateMail(const MailMessage& mail)
{
    if (mail.sender().empty())
    {
        return false;
    }
    if (mail.recipients().empty())
    {
        return false;
    }
    if (mail.subject().empty())
    {
        return false;
    }
    return true;
}

if (validateMail(mail))
{
    client.send(mail);
}
```

### Handle credentials securely

```cpp
// Good: Read from secure config
std::string user = config.getSmtpUser();
std::string pass = config.getSmtpPassword();
client.credentials(user, pass);

// Bad: Hardcoded credentials
client.credentials("hardcoded@example.com", "password123");
```

### Retry on failure

```cpp
bool sendWithRetry(SmtpClient& client, const MailMessage& mail, int maxRetries = 3)
{
    for (int i = 0; i < maxRetries; ++i)
    {
        if (client.send(mail) == 0)
        {
            return true;
        }

        // Wait before retry
        std::this_thread::sleep_for(std::chrono::seconds(5));
    }
    return false;
}
```

---

## Protocol details

### SMTP conversation

```
S: 220 smtp.example.com ESMTP
C: EHLO hostname
S: 250-smtp.example.com
S: 250-STARTTLS
S: 250 AUTH LOGIN PLAIN
C: STARTTLS
S: 220 Ready to start TLS
[TLS handshake]
C: EHLO hostname
S: 250-smtp.example.com
S: 250 AUTH LOGIN PLAIN
C: AUTH LOGIN
S: 334 VXNlcm5hbWU6
C: dXNlcm5hbWU=
S: 334 UGFzc3dvcmQ6
C: cGFzc3dvcmQ=
S: 235 Authentication successful
C: MAIL FROM: <sender@example.com>
S: 250 OK
C: RCPT TO: <recipient@example.com>
S: 250 OK
C: DATA
S: 354 Start mail input
C: [email headers and body]
C: .
S: 250 OK
C: QUIT
S: 221 Bye
```

The client handles this conversation automatically.

---

## Ports

| Port | Protocol | Encryption        | Use case              |
|------|----------|-------------------|-----------------------|
| 25   | SMTP     | None/STARTTLS     | Server-to-server      |
| 587  | SMTP     | STARTTLS          | Client submission     |
| 465  | SMTPS    | Implicit TLS      | Legacy secure client  |

---

## Summary

| Feature                | Supported |
|------------------------|-----------|
| SMTP protocol          | ✅        |
| SMTPS (SSL/TLS)        | ✅        |
| STARTTLS               | ✅        |
| LOGIN authentication   | ✅        |
| PLAIN authentication   | ✅        |
| Multiple recipients    | ✅        |
| Certificate verification| ✅        |
| Client certificates    | ✅        |
| Plain text email       | ✅        |
| HTML email             | ❌        |
| Attachments            | ❌        |
