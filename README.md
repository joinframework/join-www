# join-www

Join Framework static documentation powered by Hugo and the Hugo Book theme.

## Prerequisites

- Hugo version 0.158.0 or higher (standard or extended)
- Git

### Install Hugo

**Ubuntu/Debian:**
```bash
wget https://github.com/gohugoio/hugo/releases/download/v0.167.0/hugo_0.167.0_linux-amd64.deb
sudo dpkg -i hugo_0.167.0_linux-amd64.deb
```

**Windows:**
```bash
choco install hugo-extended
```

**macOS:**
```bash
brew install hugo
```

> **Warning:** If your package manager provides an older version of Hugo (< 0.158.0), you may need to install manually from the [Hugo releases page](https://github.com/gohugoio/hugo/releases).

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
├── .github/workflows/    # CI (build on pull requests) and CD (deploy on main)
├── archetypes/
│   └── default.md        # Template used by `hugo new`
├── config.toml           # Hugo configuration
├── content/              # Documentation content (Markdown)
│   ├── _index.md         # Site home page
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
├── static/
│   └── images/           # Images used by the pages
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

> **Note:** new pages are created with `draft: true`. Drafts are shown by `hugo server -D` but are **not**
> published: remove the `draft` line once the page is ready.

### Edit an existing page

Simply edit the `.md` files in `content/docs/`. Example:

````markdown
---
title: "Page Title"
weight: 10
---

# My Documentation

Content in Markdown...

## Code Example

```cpp
// libjoin.
#include <join/socket.hpp>

using namespace join;

int main()
{
    // Your code
}
```
````

Code examples should be complete and compile as shown. Use the protocol aliases
(`Tcp::Socket`, `Http::Server`...) and group the includes like the Join sources:
`// libjoin.`, `// Libraries.`, `// C++.` then `// C.`, each group sorted from the longest line to the shortest.

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

### Automatic deployment

The site is built and deployed by GitHub Actions:

* **CI** (`.github/workflows/ci.yml`) — every pull request to `main` is built with `hugo --minify`
* **CD** (`.github/workflows/cd.yml`) — every push to `main` is built and deployed to the web server with `rsync`

The deployment target and SSH key are provided by the repository secrets
(`JOIN_DEPLOY_DEST`, `JOIN_DEPLOY_PORT`, `JOIN_DEPLOY_KEY`, `JOIN_DEPLOY_KNOWN_HOST`).
Both workflows rely on the reusable `.github/workflows/build.yml` and can also be started manually
(`workflow_dispatch`). Starting **CD** manually always deploys for real. To check a deployment without
changing the server, start `build.yml` directly with `deploy` and `dry_run` both enabled
(`rsync --dry-run`).

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
