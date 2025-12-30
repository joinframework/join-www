# join-www

Join Framework static documentation powered by Hugo and the Hugo Book theme.

## Prerequisites

- Hugo Extended version 0.146.0 or higher
- Git

### Install Hugo

**Ubuntu/Debian:**
```bash
sudo apt install hugo
```

**Windows:**
```bash
choco install hugo-extended
```

**macOS:**
```bash
brew install hugo
```

> **Warning:** If your package manager provides an older version of Hugo (< 0.146.0), you may need to install manually from the [Hugo releases page](https://github.com/gohugoio/hugo/releases).

## Installation

Clone the repository:

```bash
git clone --recurse-submodules https://github.com/joinframework/join-www.git
```

Move to the created folder:

```bash
cd join-www
```

## Development

### Start the development server

```bash
hugo server -D --bind 0.0.0.0
```

The site will be available at `http://<machine-ip-address>:1313`.

### Project structure

```
join-www/
├── config.toml           # Hugo configuration
├── content/              # Documentation content (Markdown)
│   ├── _index.md         # Documentation home page
│   └── docs/
│       ├── _index.md     # Documentation overview
│       ├── quickstart/
│       │   └── _index.md # Quick start guide
│       └── modules/
│           ├── _index.md # Modules overview
│           ├── core/     # Core module (networking, threads, reactor, etc.)
│           ├── crypto/   # Crypto module (hashing, signatures, TLS, etc.)
│           ├── data/     # Data module (JSON, MessagePack, compression)
│           ├── fabric/   # Fabric module (interface mgmt, ARP, DNS)
│           └── services/ # Services module (HTTP, SMTP, etc.)
├── themes/
│   └── hugo-book/        # Theme (Git submodule)
└── public/               # Generated site (ignored by Git)
```

## Adding or Modifying Documentation

### Create a new page

```bash
# Create a page in an existing module
hugo new docs/modules/core/new-class.md

# Create a new section
mkdir -p content/docs/new-section
hugo new docs/new-section/_index.md
hugo new docs/new-section/page1.md
```

### Edit an existing page

Simply edit the `.md` files in `content/docs/`. Example:

```markdown
---
title: "Page Title"
weight: 10
---

# My Documentation

Content in Markdown...

## Code Example

\`\`\`cpp
#include <join/socket.hpp>

int main() {
    // Your code
}
\`\`\`
```

### Front matter parameters

- **title**: Page title (appears in menu)
- **weight**: Display order (lower = higher in menu)
- **bookFlatSection**: `true` to display sub-pages at the same level
- **bookCollapseSection**: `true` to collapse section by default
- **bookHidden**: `true` to hide page from menu

### Menu organization

The sidebar menu is automatically built from:
1. Folder structure in `content/docs/`
2. The `weight` parameter of each page (ascending order)
3. `_index.md` files create sections

Structure example:
```
content/docs/
├── _index.md (weight: 1)
├── quickstart/
│   └── _index.md (weight: 1)
└── modules/
    ├── _index.md (weight: 2)
    ├── core/
    │   ├── _index.md (weight: 1)
    │   ├── reactor.md
    │   ├── socket.md
    │   └── ...
    ├── crypto/
    │   ├── _index.md (weight: 2)
    │   ├── digest.md
    │   └── ...
    ├── data/
    │   ├── _index.md (weight: 3)
    │   └── ...
    ├── fabric/
    │   ├── _index.md (weight: 4)
    │   └── ...
    └── services/
        ├── _index.md (weight: 5)
        └── ...
```

### Links between pages

Use Hugo shortcodes to create relative links:

```markdown
See the [crypto module]({{< ref "crypto" >}})
```

## Build the Site

To generate the static site in the `public/` folder:

```bash
hugo
```

## Deployment

### Manual deployment

```bash
# Generate the site
hugo

# Copy to web server
rsync -avz --delete public/ user@server:/var/www/join-www/
```

## Editing with VS Code

### Remote-SSH (recommended)

1. Install the "Remote - SSH" extension in VS Code
2. Connect: `F1` → "Remote-SSH: Connect to Host" → `user@server`
3. Open folder: `File` → `Open Folder` → `/path/to/join-www`
4. Start server in integrated terminal: `hugo server -D --bind 0.0.0.0`
5. VS Code will automatically offer to forward port 1313

## Contributing

1. Create a branch for your changes
2. Add or modify content in `content/docs/`
3. Test locally with `hugo server -D`
4. Commit only source files (not the `public/` folder)
5. Create a Pull Request

## Resources

- [Join Framework Repository](https://github.com/joinframework/join)
- [Join API Documentation](https://joinframework.github.io/join/)
- [Hugo Documentation](https://gohugo.io/documentation/)
- [Hugo Book Theme](https://github.com/alex-shpak/hugo-book)
- [Markdown Syntax](https://www.markdownguide.org/basic-syntax/)

## License

[MIT](https://choosealicense.com/licenses/mit/)
