# Interactive Notes

The Notes feature provides a dedicated, persistent working notebook and task checklist stored in `workspace/NOTES.md`.

---

## 1. Distinction Between Notes and Brain Memory

While **Brain Memory** (`BRAIN.md`) is automatically injected into every prompt to maintain continuous persona and user awareness, **Notes** (`NOTES.md`) are kept separate to conserve the model's context window:
- **On-Demand Access**: The model only fetches Notes when needed (via `fetch_notes`), or updates them (via `edit_notes` / `update_notes`).
- **Interactive UI Modal**: Users can click the **Notes** button in the sidebar or tools panel to view and edit notes in an interactive modal dialog with markdown formatting.
- **Section Parsing**: The system parses markdown headers (`#`, `##`, `###`), allowing the model or user to read or append items directly under specific sections like `Active Tasks & Checklist` or `Project Directives`.

---

## 2. Typical Layout of `NOTES.md`

```markdown
# Marnie Workspace Notes

## Active Tasks & Checklist
- [x] Configure local Ollama connection
- [ ] Implement custom webhook handler
- [ ] Review benchmark results

## Architecture Decisions
- SQLite WAL mode selected for low-latency concurrent operations.
- Express 5 deployed with strict route parameter syntax.

## Scratchpad & Reference
- Docker command: `docker compose up -d`
- Local API URL: `http://localhost:3000`
```

---

## 3. API Endpoints

- `GET /api/notes`: Retrieves the markdown content, line count, character count, and last modification timestamp of `workspace/NOTES.md`.
- `PUT /api/notes`: Overwrites the entire contents of `workspace/NOTES.md`.
- `POST /api/notes/append`: Appends text or bullet points, optionally targeted under a specific section heading.
