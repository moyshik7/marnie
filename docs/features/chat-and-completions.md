# Chat, Completions & Slash Commands

The conversational core of Marnie enables streaming chat interactions with local Ollama models, tool execution handling, branch forking, history search, and slash command automations.

---

## 1. Chat Execution Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Frontend as Web Interface
    participant Express as Express API (/complete)
    participant DB as SQLite DB
    participant Brain as Memory Injection
    participant Ollama as Local Ollama

    User->>Frontend: Types prompt (or slash command)
    Frontend->>Express: POST /api/chat/complete (Stream: true)
    Express->>DB: Fetch conversation history
    Express->>Brain: Inject BRAIN.md into System Prompt
    Express->>Ollama: POST /api/chat (tools + messages)
    loop Stream tokens
        Ollama-->>Express: SSE chunks
        Express-->>Frontend: Stream text tokens to user
    end
    opt Model calls a tool
        Ollama-->>Express: tool_calls block
        Express->>Express: Execute tool locally
        Express->>Ollama: Send tool result back
        Ollama-->>Frontend: Stream final synthesized answer
    end
    Express->>DB: Persist assistant message & tool execution
```

---

## 2. Interactive Slash Commands

Typing `/` in the prompt input triggers an interactive command autocomplete popup.

| Slash Command | Usage | Description |
| :--- | :--- | :--- |
| **`/elim5 [topic]`** | `/elim5 quantum computing` | Injects instructions to explain complex concepts as if the user is 5 years old, using plain analogies. |
| **`/btw <question>`** | `/btw what port did we use?` | Sends a quick side-query that accesses conversation history without recording the exchange into permanent context. |
| **`/fork [new-title]`** | `/fork refactoring-v2` | Clones the current conversation up to the active point into an independent branch for exploring alternatives. |
| **`/title <new-title>`** | `/title Backend Architecture` | Updates the conversation title across the database and interface. |
| **`/compact`** | `/compact` | Condenses past conversation turns using the LLM to free up context window space while retaining critical facts. |
| **`/output-style [style]`** | `/output-style concise` | Changes response formatting. Styles: `standard`, `concise`, `technical`, `creative`, `bullet-points`. |

---

## 3. Search in Chats

Marnie features a dedicated **Search in Chats** tab in the sidebar:
- Performs instant keyword and substring search across all past conversations and messages stored in SQLite.
- Displays matches with conversation titles and surrounding message snippets.
- Allows jumping directly to any past thread in the main chat view.
