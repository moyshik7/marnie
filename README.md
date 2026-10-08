<h1 align="center">Marnie</h1>

A self-hosted AI workspace made in nodejs with features according to my own preference.

<p align="center">
  <img src="https://raw.githubusercontent.com/moyshik7/marnie/main/branding/screenshot-browser.png" alt="Marnie Ui (In browser)"/>
</p>

<br />

### Name taken from 2014 anime "When Marnie Was There"

<p align="center">
  <img src="https://raw.githubusercontent.com/moyshik7/marnie/main/branding/when-marnie-was-there-original-poster.png" alt="When Marnie was here original poster"/>
</p>


## Tools & Skills
- [x] Web search (DuckDuckGo, SearXNG)
- [x] Web scraper (Cheerio and Axios site extractor)
- [x] Terminal access (Bash / Shell commands)
- [x] Filesystem search (Recursive regex / pattern search)
- [x] Get current datetime
- [ ] Get current weather
- [x] Send api requests
    - [x] GET
    - [x] POST
    - [x] PUT, PATCH, DELETE
- [ ] Code run
    - [ ] Python
    - [x] Javascript (Node.js isolated runner)
- [x] Local File Create
- [x] Local File Read
- [x] Local File Write (Targeted line range edits and replacements)
- [x] Create Tasks (SQLite task tracking)
- [x] Create scheduled tasks (Cron scheduler)
- [x] Discord Webhook alerts
- [x] Countdown timer with alert notifications

### Skills Reference

All skills are documented with specifications under [`.agents/skills/`](.agents/skills/).

| Skill                | Description                                                                                                                  |
|----------------------|------------------------------------------------------------------------------------------------------------------------------|
| `api-caller`         | Make raw HTTP/REST API calls (GET, POST, PUT, PATCH, DELETE) with custom headers, query params, and body data using Axios    |
| `cron-scheduler`     | Schedule and manage recurring background cron jobs stored persistently in SQLite with command, Discord, or webhook triggers  |
| `deep-research`      | Autonomous multi-turn web research and iterative synthesis engine producing comprehensive markdown dossiers with citations   |
| `discord-alerts`     | Dispatch rich embed alert notifications to configured Discord webhook channels                                               |
| `file-operations`    | Read, create, write, and patch local files on disk with precise line range replacements                                      |
| `filesystem-search`  | Recursively search files and directories matching a pattern, substring, or regular expression                                |
| `run-bash`           | Execute terminal and shell commands (bash/sh) directly on the host system                                                    |
| `run-javascript`     | Execute JavaScript/Node.js code snippets safely in an isolated child process                                                 |
| `task-manager`       | Create, list, update, and manage persistent task checklists stored in SQLite                                                 |
| `timer`              | Set countdown timers that send notifications to Discord when expired                                                         |
| `web-scraper`        | Lightweight webpage text extraction and scraping tool using Cheerio and Axios to extract readable text                       |
| `web-search`         | Live web search via DuckDuckGo or SearXNG with automatic link content scraping                                               |


## Integrations:
- [x] Discord Webhook
- [x] Duckduckgo search
- [x] SearXNG
- [ ] Brave search
- [ ] Mail
- [ ] OCR for uploaded files

## LLM Sources
- [x] Ollama
- [ ] llama.cpp
- [ ] Gemini API
- [ ] Anthropic API
- [ ] OpenAI API
- [ ] Deepseek API
- [ ] Openrouter
- [ ] Cloudflare
- [ ] Vercel

## Features
- [x] Chat
- [x] Agent Mode
- [ ] Deep Research
- [ ] Deep Research Report
- [x] Mermaid Preview
- [x] Latex Math Preview



## Setup (NodeJS)

#### Clone this repo
```bash
git clone https://github.com/moyshik7/marnie.git
cd marnie
```

#### Install Dependencies

```bash
npm install
cd frontend && npm install && npm run build && cd ..
```

#### Copy and edit environment config

```bash
cp .env.example .env
```

#### Start the server (First time)

```bash
npm start
```

#### Start the server (Later without rebuilding the entire app)

```bash
npm run nobuild
```

> If you encounter any UI glitch try rebuilding the app.

The app is accessible at [http://localhost:3000](http://localhost:3000)

> If port 3000 is in use, it will use 3001 then 3002, 3003 ....


## Setup (Docker)

You can run Marnie using Docker Compose or standalone Docker.

#### Option 1: Docker Compose (Recommended)

1. Clone the repository:
```bash
git clone https://github.com/moyshik7/marnie.git
cd marnie
```

2. (Optional) Copy and customize environment variables:
```bash
cp .env.example .env
```

3. Build and start the container:
```bash
docker compose up -d --build
```

> The container automatically maps host ports and points `OLLAMA_BASE_URL` to `http://host.docker.internal:11434` so it can communicate with Ollama running on your host machine.

> Persistent database data and workspace files are mounted to `./data` and `./workspace`.

To view logs or stop the service:
```bash
docker compose logs -f
docker compose down
```

#### Option 2: Docker CLI

1. Build the Docker image:
```bash
docker build -t marnie .
```

2. Run the container:
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


## Environment Variables

| Variable              | Default                  | Description                                |
|-----------------------|--------------------------|--------------------------------------------|
| `PORT`                | `3000`                   | HTTP port                                  |
| `OLLAMA_BASE_URL`     | `http://localhost:11434` | Ollama server URL                          |
| `DEFAULT_MODEL`       | `qwen3.5:9B`             | Default model name                         |
| `DISCORD_WEBHOOK_URL` | -                        | Discord webhook for alerts                 |
| `WORKSPACE_DIR`       | `./workspace`            | Root directory for file operations         |
| `DB_PATH`             | `./data/marnie.db`       | SQLite database path                       |


## API Documentation

See [`docs/API.md`](docs/API.md) for full API reference.
