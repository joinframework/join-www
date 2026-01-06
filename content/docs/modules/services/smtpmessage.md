---
title: "SMTP Message"
weight: 7
---

# SMTP Message

`MailMessage` represents an **email message** with sender, recipients, subject, and content.
It provides a simple interface for composing emails that can be sent via SMTP.

`MailMessage` is designed to be:

* **simple** — easy email composition
* **complete** — supports To, CC, and BCC recipients
* **standard** — generates RFC-compliant email headers
* **flexible** — plain text email support

---

## Basic usage

### Creating a message

```cpp
#include <join/mailmessage.hpp>

MailMessage mail;

// Set sender
mail.sender(MailSender("sender@example.com", "John Doe"));

// Add recipients
mail.addRecipient(MailRecipient("user@example.com", "Jane Smith"));

// Set subject and content
mail.subject("Hello from Join!");
mail.content("This is the email body.\n\nBest regards,\nJohn");
```

---

## Sender

### MailSender

```cpp
// Email address only
MailSender sender("john@example.com");

// With display name
MailSender sender("john@example.com", "John Doe");

// Set later
MailSender sender;
sender.address("john@example.com");
sender.realName("John Doe");
```

### Setting sender

```cpp
MailMessage mail;

mail.sender(MailSender("admin@company.com", "Company Admin"));

// Get sender
const MailSender& from = mail.sender();
std::string address = from.address();
std::string name = from.realName();
```

---

## Recipients

### MailRecipient types

```cpp
// To: recipient (default)
MailRecipient to("user@example.com");
MailRecipient to("user@example.com", "User Name");

// CC: carbon copy
MailRecipient cc("cc@example.com", MailRecipient::CCRecipient);
MailRecipient cc("cc@example.com", "CC User", MailRecipient::CCRecipient);

// BCC: blind carbon copy
MailRecipient bcc("bcc@example.com", MailRecipient::BCCRecipient);
MailRecipient bcc("bcc@example.com", "BCC User", MailRecipient::BCCRecipient);
```

### Adding recipients

```cpp
MailMessage mail;

// Add To recipients
mail.addRecipient(MailRecipient("user1@example.com"));
mail.addRecipient(MailRecipient("user2@example.com", "User Two"));

// Add CC recipients
mail.addRecipient(MailRecipient("manager@example.com", "Manager", 
                                MailRecipient::CCRecipient));

// Add BCC recipients
mail.addRecipient(MailRecipient("archive@example.com", 
                                MailRecipient::BCCRecipient));
```

### Multiple recipients

```cpp
MailMessage mail;

// Multiple To recipients
mail.addRecipient(MailRecipient("alice@example.com", "Alice"));
mail.addRecipient(MailRecipient("bob@example.com", "Bob"));
mail.addRecipient(MailRecipient("charlie@example.com", "Charlie"));

// Get all recipients
const MailRecipients& recipients = mail.recipients();
```

---

## Subject and content

### Setting subject

```cpp
MailMessage mail;

mail.subject("Meeting reminder");
mail.subject("Invoice #12345");
mail.subject("Weekly report - January 2024");

// Get subject
std::string subj = mail.subject();
```

### Setting content

```cpp
MailMessage mail;

// Simple text
mail.content("Hello, this is a test email.");

// Multi-line content
mail.content(
    "Dear Customer,\n"
    "\n"
    "Your order has been shipped.\n"
    "\n"
    "Best regards,\n"
    "Support Team"
);

// Get content
std::string body = mail.content();
```

---

## Complete example

### Simple email

```cpp
MailMessage mail;

// From
mail.sender(MailSender("john@company.com", "John Doe"));

// To
mail.addRecipient(MailRecipient("customer@example.com", "Customer"));

// Subject
mail.subject("Order confirmation");

// Body
mail.content(
    "Dear Customer,\n"
    "\n"
    "Your order #12345 has been confirmed.\n"
    "\n"
    "Thank you for your business!\n"
);
```

### Email with CC and BCC

```cpp
MailMessage mail;

mail.sender(MailSender("support@company.com", "Support Team"));

// Primary recipient
mail.addRecipient(
    MailRecipient("customer@example.com", "Customer")
);

// CC: Keep manager in the loop
mail.addRecipient(
    MailRecipient("manager@company.com", "Manager", 
                  MailRecipient::CCRecipient)
);

// BCC: Archive copy
mail.addRecipient(
    MailRecipient("archive@company.com", 
                  MailRecipient::BCCRecipient)
);

mail.subject("Support ticket #789");
mail.content("Your support ticket has been resolved.");
```

---

## Serialization

### Writing to stream

```cpp
MailMessage mail;
// ... configure mail ...

std::stringstream ss;

// Write headers
mail.writeHeaders(ss);

// Write content
mail.writeContent(ss);

// Now ss contains the complete email
```

### Generated format

```
Date: Mon, 06 Jan 2025 10:30:00 GMT
From: John Doe<john@example.com>
To: Jane Smith<jane@example.com>
Subject: Test Email
MIME-Version: 1.0
Content-type: text/plain; charset=iso-8859-1
Content-Transfer-Encoding: 7bit

This is the email body.

Best regards,
John
.
```

---

## Use with SmtpClient

```cpp
#include <join/smtpclient.hpp>

// Create message
MailMessage mail;
mail.sender(MailSender("sender@example.com", "Sender"));
mail.addRecipient(MailRecipient("recipient@example.com"));
mail.subject("Test");
mail.content("Hello!");

// Send via SMTP
SmtpClient client("smtp.example.com", 587);
client.credentials("username", "password");
client.send(mail);
```

---

## Common patterns

### Newsletter

```cpp
MailMessage newsletter;

newsletter.sender(MailSender("news@company.com", "Company Newsletter"));

// Add multiple recipients
for (const auto& subscriber : subscribers) {
    newsletter.addRecipient(
        MailRecipient(subscriber.email, subscriber.name)
    );
}

newsletter.subject("Monthly Newsletter - January 2025");
newsletter.content(generateNewsletterContent());
```

### Notification email

```cpp
MailMessage notification;

notification.sender(MailSender("noreply@app.com", "App Notifications"));
notification.addRecipient(MailRecipient(user.email, user.name));
notification.subject("New activity on your account");

notification.content(
    "Hello " + user.name + ",\n"
    "\n"
    "There was new activity on your account.\n"
    "\n"
    "If this wasn't you, please contact support.\n"
);
```

### Report email

```cpp
MailMessage report;

report.sender(MailSender("reports@company.com", "Automated Reports"));

// To: Manager
report.addRecipient(
    MailRecipient("manager@company.com", "Manager")
);

// CC: Team members
report.addRecipient(
    MailRecipient("team@company.com", "Team", 
                  MailRecipient::CCRecipient)
);

// BCC: Archive
report.addRecipient(
    MailRecipient("archive@company.com", 
                  MailRecipient::BCCRecipient)
);

report.subject("Daily Sales Report");
report.content(generateReport());
```

---

## Limitations

### Plain text only

```cpp
// Currently supports plain text only
mail.content("Plain text email body");

// HTML email not directly supported
// (would require manual MIME headers)
```

### No attachments

```cpp
// Attachments not supported in current version
// Use mail.content() for text-only emails
```

### Single content type

```cpp
// Fixed content type: text/plain; charset=iso-8859-1
// No customization of MIME type
```

---

## Best practices

### Always set sender

```cpp
// Good: Clear sender identity
mail.sender(MailSender("support@company.com", "Company Support"));

// Avoid: Missing or unclear sender
mail.sender(MailSender("noreply@server123.com"));
```

### Use display names

```cpp
// Good: Friendly names
mail.sender(MailSender("john@example.com", "John Doe"));
mail.addRecipient(MailRecipient("jane@example.com", "Jane Smith"));

// Less friendly: Email addresses only
mail.sender(MailSender("john@example.com"));
mail.addRecipient(MailRecipient("jane@example.com"));
```

### Validate email addresses

```cpp
bool isValidEmail(const std::string& email) {
    // Basic validation
    return email.find('@') != std::string::npos &&
           email.find('.') != std::string::npos;
}

if (isValidEmail(userEmail)) {
    mail.addRecipient(MailRecipient(userEmail));
}
```

### Format content properly

```cpp
// Good: Proper formatting with line breaks
mail.content(
    "Dear Customer,\n"
    "\n"
    "Your order has been confirmed.\n"
    "\n"
    "Order details:\n"
    "- Product: Widget\n"
    "- Quantity: 5\n"
    "- Total: $99.99\n"
    "\n"
    "Best regards,\n"
    "Sales Team"
);
```

---

## Summary

| Feature              | Supported |
|----------------------|-----------|
| Plain text email     | ✅        |
| Multiple recipients  | ✅        |
| CC recipients        | ✅        |
| BCC recipients       | ✅        |
| Display names        | ✅        |
| RFC-compliant headers| ✅        |
| HTML email           | ❌        |
| Attachments          | ❌        |
| Custom MIME types    | ❌        |
