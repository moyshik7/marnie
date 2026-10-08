# Contributing to Marnie

Thank you for your interest in contributing to Marnie! We welcome community contributions, bug fixes, new features, and documentation improvements.

---

## Code of Conduct

We are committed to providing a welcoming, inclusive, and harassment-free experience for everyone. Please be respectful, constructive, and kind in all project interactions.

---

## Development Setup

### Prerequisites
- **Node.js**: v18.0.0 or later (v20+ recommended)
- **npm**: v9.0.0 or later
- **Ollama**: Running locally or accessible via network ([ollama.com](https://ollama.com))

### 1. Fork & Clone
```bash
git clone https://github.com/<your-username>/marnie.git
cd marnie
```

### 2. Install Dependencies
```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### 3. Configure Environment
```bash
cp .env.example .env
```
Edit `.env` to configure your preferred Ollama endpoint, default model, or Discord webhook.

### 4. Run Development Servers
- **Backend**:
  ```bash
  npm run dev
  ```
  Runs the Express server with Nodemon auto-reloading on `http://localhost:3000`.

- **Frontend**:
  ```bash
  npm run frontend:dev
  ```
  Runs Vite dev server with hot-module reloading on `http://localhost:5173` (proxied to `:3000`).

- **Production Build Verification**:
  ```bash
  npm run build
  ```
  Compiles the React frontend into `frontend/dist/`.

---

## Project Structure

```text
marnie/
├── .agents/skills/            # Agent skill documentation & runbooks
├── data/                      # SQLite database storage (marnie.db)
├── frontend/                  # React + Vite frontend application
│   ├── src/
│   │   ├── components/        # UI components (ChatView, Sidebar, etc.)
│   │   └── services/          # API client and SSE streaming handlers
├── src/                       # Express Node.js backend
│   ├── api/routes/            # Express REST routes (chat, tools, cron, tasks)
│   ├── components/providers/  # LLM providers (Ollama client)
│   ├── components/tools/      # Native tools (bash, webSearch, apiCall, etc.)
│   ├── db/                    # SQLite initialization and schema migrations
│   └── main.js                # Server entry point
```

---

## Contribution Workflow

### 1. Create a Branch
Branch names should be descriptive:
```bash
git checkout -b feature/awesome-feature
# or
git checkout -b fix/chat-streaming-issue
```

### 2. Follow Coding Conventions
- **Style**: Follow clean, readable JavaScript / JSX conventions.
- **No Em-Dashes**: Marnie avoids em-dashes (`—`) in agent prompts and markdown templates; use standard hyphens (`-`).
- **No Emojis in Prompts**: Adhere to Marnie's clean, professional prompt design guidelines.
- **Tools Registration**: If introducing a new tool:
  - Implement tool logic in `src/components/tools/<toolName>.js`.
  - Register it in `src/components/tools/registry.js` with parameters and aliases.
  - Expose API endpoints in `src/api/routes/tools.js` if needed.
  - Add documentation in `.agents/skills/<skill-name>/SKILL.md`.

### 3. Verify Your Changes
- Ensure `npm run build` succeeds without bundle or syntax errors.
- Test modified tools and chat streaming flows end-to-end.
- Ensure no unintended files or local artifacts (`data/marnie.db`, `.env`) are committed.

### 4. Commit Messages
Write clear, imperative commit messages:
```text
feat(tools): add custom api request caller with axios
fix(search): improve duckduckgo fallback reliability
docs(skills): add documentation for web scraper skill
```

### 5. Submit a Pull Request
- Push your branch to your fork.
- Open a PR targeting the `main` branch of `moyshik7/marnie`.
- Provide a summary describing:
  - What changes were made and why.
  - Testing steps performed.
  - Screenshots or terminal outputs if relevant.

---

## Reporting Issues

If you encounter bugs or have feature proposals:
1. Search existing issues to prevent duplicates.
2. Open a new issue with:
   - Clear description of expected vs actual behavior.
   - Operating system and Node.js version.
   - Ollama model and backend logs if relevant.
