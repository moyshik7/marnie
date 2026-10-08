# Security Policy

## Overview

Marnie is a self-hosted AI workspace assistant designed to operate in local, private, and controlled host environments. Because Marnie provides powerful host automation capabilities (such as terminal command execution, filesystem access, child process sandboxes, and outbound network requests), securing your deployment is critical.

---

## Supported Versions

Security fixes and updates are actively provided for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| `0.1.x` | :white_check_mark: |
| `< 0.1` | :x:                |

---

## Reporting a Vulnerability

We appreciate the efforts of security researchers and community contributors in keeping Marnie safe.

If you discover a security vulnerability, please report it responsibly:

1. **Do not create a public GitHub Issue** to report security vulnerabilities or exploits.
2. Report vulnerabilities via **GitHub Private Security Advisories**:
   - Navigate to the repository's **Security** tab.
   - Click on **Advisories** and select **Report a vulnerability**.
3. Alternatively, contact the maintainer directly via GitHub at [@moyshik7](https://github.com/moyshik7).

### What to Include in Your Report
To help us triage and resolve the issue quickly, please provide:
- A clear description of the vulnerability and its potential impact.
- Step-by-step reproduction instructions or a minimal Proof of Concept (PoC).
- Affected components (e.g. specific tool routes, sandbox execution, API endpoints).
- Any recommended remediation steps or patches, if available.

### Response Timeline
- **Initial Acknowledgement**: Within 48 hours of receipt.
- **Triage and Assessment**: Within 5 business days.
- **Fix and Release**: A security patch will be prepared and published alongside a security advisory acknowledging your contribution (unless you prefer anonymity).

---

## Deployment Security Best Practices

When self-hosting Marnie, observe the following recommendations:

### 1. Network Exposure & Access Control
- **Do not expose Marnie directly to the public internet** without an authentication layer (e.g., VPN, Cloudflare Access, WireGuard, or reverse proxy with HTTP Basic/OAuth auth).
- Bind Marnie to `127.0.0.1` or internal Docker container networks when not using an authenticated reverse proxy.

### 2. Environment Variables & Secrets
- Keep your `.env` file secure with restricted permissions (`chmod 600 .env`).
- Never commit Discord webhook URLs, private API keys, or sensitive credentials into Git.
- Regularly rotate webhook URLs and external integration secrets.

### 3. Tool Permissions & Agent Execution
- Marnie's `run_bash`, `run_javascript`, and file operation tools run with the privileges of the user running the Node.js server.
- Run Marnie under a dedicated, unprivileged system user or inside an isolated container with minimal permissions.
- Be cautious when prompting the LLM to run destructive shell commands or scripts.

### 4. Database & SQLite Storage
- Ensure the `data/` directory (`data/marnie.db`) is protected against unauthorized filesystem access.
- Restrict read/write permissions to the executing application user.
