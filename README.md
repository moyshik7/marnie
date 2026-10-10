<p align="center">
  	<img src="https://raw.githubusercontent.com/moyshik7/marnie/main/branding/logo-wide.png" alt="Marnie Logo (Wide)"/>
</p>

<br />

> **The local AI workspace with built-in tools.** Run deep research, scrape websites, interact with local files, and trigger webhooks with zero extra microservices required.

<br />

<p align="center">
  	<img src="https://raw.githubusercontent.com/moyshik7/marnie/main/branding/demo-chat.gif" alt="Marnie Ui (In browser)"/>
</p>

<br />
<br />

## Quick Links:
- [Installation (Manually)](#installation-manually)
- [Installation (Docker)](#installation-docker)
- [Skills](#skills-reference)
- [Slash Commands](#slash-commands-reference)

## Features

> **Brain (memory)**  
> Persistent brain memory stored in `workspace/BRAIN.md`. A background process consolidates recent conversation messages (every 5 messages) with existing memory using an LLM. This consolidated memory is then automatically passed into every chat or agentic conversation unless otherwise specified.

> **Notes**  
>  The Notes feature offers persistent storage separate from the primary brain, enabling on-demand retrieval and modification via `fetch_notes`. This contrasts with the main brain, which is injected directly into prompts.

> **Expanded Capacity (Local RAG)**  
> A Gemini Notebook-style local RAG system backed by a dedicated SQLite database with full-text search (FTS5). Drag and drop markdown (`.md`) and text (`.txt`) files into notebook cards for previewing, referencing, and retrieval. The AI agent can query and retrieve information on-demand via the `retrieve_expanded_capacity` skill.

> **Task scheduling and repeating tasks**  

> **Multi-Step Deep Research**  

> **A buttload of built in tools and skills**  

> **Math and flowchart generation and preiew**  
> Using latex for math equation preview and mermaid for flowchart preview.

### Skills Reference

All skills are documented with specifications under [`.agents/skills/`](.agents/skills/).

| Skill                | Description                                                                                                                  |
|----------------------|------------------------------------------------------------------------------------------------------------------------------|
| `api-caller`         | Make raw HTTP/REST API calls (GET, POST, PUT, PATCH, DELETE) with custom headers, query params, and body data using Axios    |
| `cron-scheduler`     | Schedule and manage recurring background cron jobs stored persistently in SQLite with command, Discord, or webhook triggers  |
| `deep-research`      | Autonomous multi-turn web research and iterative synthesis engine producing comprehensive markdown dossiers with citations   |
| `discord-alerts`     | Dispatch rich embed alert notifications to configured Discord webhook channels                                               |
| `edit-notes`         | Edit, update, and append tasks, checklists, and working notes in `workspace/NOTES.md`                                        |
| `expanded-capacity`  | Retrieve and search reference documents from the local Expanded Capacity database (local RAG) using full-text search         |
| `fetch-notes`        | Fetch and update persistent user notes, task checklists, and reference data in `workspace/NOTES.md` on demand                |
| `file-operations`    | Read, create, write, and patch local files on disk with precise line range replacements                                      |
| `filesystem-search`  | Recursively search files and directories matching a pattern, substring, or regular expression                                |
| `run-bash`           | Execute terminal and shell commands (bash/sh) directly on the host system                                                    |
| `run-javascript`     | Execute JavaScript/Node.js code snippets safely in an isolated child process                                                 |
| `task-manager`       | Create, list, update, and manage persistent task checklists stored in SQLite                                                 |
| `timer`              | Set countdown timers that send notifications to Discord when expired                                                         |
| `web-scraper`        | Lightweight webpage text extraction and scraping tool using Cheerio and Axios to extract readable text                       |
| `web-search`         | Live web search via DuckDuckGo or SearXNG with automatic link content scraping                                               |

### Slash Commands Reference

Slash commands can be used at the beginning of any prompt. Typing `/` automatically opens a Discord-style interactive autocomplete popup to filter and select commands using arrow keys or Tab.

| Command                  | Description                                                                                                            |
|--------------------------|------------------------------------------------------------------------------------------------------------------------|
| `/elim5 [question]`      | Explains like you're five years old, simplifying technical jargon into bite-sized analogies and plain language         |
| `/btw <question>`        | Asks a side question referencing conversation background without breaking, altering, or polluting conversation history |
| `/fork [new-title]`      | Branches the current conversation into a new independent thread with historical continuity preserved                   |
| `/title <new-title>`     | Sets or updates the active window and conversation title across the interface and database                             |
| `/compact`               | Summarizes previous conversation turns to free up the model context window while preserving critical context           |
| `/output-style [style]`  | Customizes how AI responses are rendered; opens an interactive style picker or sets the style directly                 |

> Output styles: standard | concise | technical | creative | bullet-points

## Supported LLM Sources
- [x] Ollama
- [ ] llama.cpp
- [ ] Gemini API
- [ ] Anthropic API
- [ ] OpenAI API
- [ ] Deepseek API
- [ ] Openrouter
- [ ] Cloudflare
- [ ] Vercel


---

## Installation (Manually)

Use this option if you want to run Marnie directly on your machine.

### Requirements
- Node.js 24 or newer
- Git
- Curl

### 1. Open a terminal

### 2. Run the installer

#### Linux and macOS
```bash
bash <(curl -fsSL https://raw.githubusercontent.com/moyshik7/marnie/main/install.sh)
```

#### Windows
Run this in PowerShell, not Command Prompt:

```ps1
irm https://raw.githubusercontent.com/moyshik7/marnie/main/install.ps1 | iex
```

### 3. Start the app

After installation, start the server with:

```bash
npm run nobuild
```

This starts the app without rebuilding everything first.

### 4. Open the app

Visit:

[http://localhost:3000](http://localhost:3000)

If port 3000 is already in use, Marnie will automatically try 3001, 3002, 3003, and so on.

> If you run into a UI problem, rebuild the app with `npm run build`.

<br />
<br />
<br />

## Installation (Docker)

Use Docker if you want a containerized setup instead of a local install.

### Option 1: Docker Compose (Recommended)

#### 1. Clone the repository
```bash
git clone https://github.com/moyshik7/marnie.git
cd marnie
```

#### 2. Start the container
```bash
docker compose up -d --build
```

This sets up the app and mounts persistent data in `./data` and `./workspace`.

The container also points `OLLAMA_BASE_URL` to `http://host.docker.internal:11434` so it can talk to Ollama running on your host machine.

#### 3. Check logs or stop the container
```bash
docker compose logs -f
docker compose down
```

### Option 2: Docker CLI

#### 1. Build the image
```bash
docker build -t marnie .
```

#### 2. Run the container
```bash
docker run -d \
  --name marnie \
  -p 3000:3000 \
  --add-host=host.docker.internal:host-gateway \
  -e OLLAMA_BASE_URL=http://host.docker.internal:11434 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/workspace:/app/workspace \
  marnie
```

This exposes the app on port 3000 and keeps data and workspace files in local folders on your machine.
---


## API Documentation

See [`docs/API.md`](docs/API.md) for full API reference.


> The name `Marnie` was taken from the 2014 anime "When Marnie Was There"
