# Marnie
A self-hosted AI workspace made in nodejs with features according to my own preference.

<p align="center">
  <img src="https://raw.githubusercontent.com/moyshik7/marnie/main/branding/screenshot-browser.png" alt="Marnie Ui (In browser)"/>
</p>

<br />

### Name taken from 2014 anime "When Marnie Was There"

<p align="center">
  <img src="https://raw.githubusercontent.com/moyshik7/marnie/main/branding/when-marnie-was-there-original-poster.png" alt="When Marnie was here original poster"/>
</p>


## Tools
- [ ] Web search
- [x] Terminal access
- [x] Filesystem search
- [ ] Get current datetime
- [ ] Get current weather
- [ ] Send api requests
    - [ ] GET
    - [ ] POST
- [ ] Code run
    - [ ] Python
    - [x] Javascript (Nodejs)
- [x] Local File Create
- [x] Local File Read
- [x] Local File Write (Needs to read first to write to specific lines or edit the lines)
- [x] Create Tasks
- [x] Create ~~cronjobs~~ scheduled tasks


## Integrations:
- [x] Discord Webhook
- [x] Duckduckgo search
- [x] SearXNG
- [ ] Brave search
- [ ] Mail

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

#### Start the server (Backend and Frontend together)
```bash
npm start
npm run dev
```

The app is accessible at [http://localhost:3000](http://localhost:3000)



> Development: Run Vite frontend in hot-reload dev mode
> `npm run frontend:dev   # http://localhost:5173 (proxied to :3000)`




## Environment Variables

| Variable              | Default                  | Description                                |
|-----------------------|--------------------------|--------------------------------------------|
| `PORT`                | `3000`                   | HTTP port                                  |
| `OLLAMA_BASE_URL`     | `http://localhost:11434` | Ollama server URL                          |
| `DEFAULT_MODEL`       | `qwen3.5:9B`             | Default model name                         |
| `DISCORD_WEBHOOK_URL` | —                        | Discord webhook for alerts                 |
| `WORKSPACE_DIR`       | `./workspace`            | Root directory for file operations         |
| `DB_PATH`             | `./data/marnie.db`       | SQLite database path                       |


## API Documentation

See [`docs/API.md`](docs/API.md) for full API reference.
