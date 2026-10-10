# In-App Edit & Preview Panel (Artifacts)

Marnie provides a Claude-like side-by-side **Artifact Panel** that allows users to create, view, edit, and preview files directly within the browser while maintaining active conversations.

---

## 1. Supported File Formats & Previews

The Artifact Panel provides specialized rendering and live sandboxing based on file extension:

| File Type | Extension | Rendering Engine |
| :--- | :--- | :--- |
| **HTML Web Applications** | `.html` | Sandboxed `<iframe>` with live script execution and DOM rendering |
| **Markdown Documents** | `.md` | Interactive GitHub-flavored Markdown viewer |
| **Mathematical Proofs** | Inline / Block | **KaTeX** math engine (`$...$` for inline, `$$...$$` for display equations) |
| **Flowcharts & Diagrams** | `.mmd`, ````mermaid```` | **Mermaid.js** live diagram and state machine renderer |
| **Vector Graphics** | `.svg` | Native SVG canvas renderer |
| **Source Code & Scripts** | `.js`, `.json`, `.css`, `.sh` | Syntax-highlighted code editor with line numbers |

---

## 2. Interactive Editing & Browser Previews

- **Live In-App Editor**: Switch between **Preview** and **Code** tabs to inspect and edit code directly in the interface.
- **Save to Workspace**: Edits made in the browser can be saved back to disk in `workspace/` via `PUT /api/workspace/file`.
- **Open in New Tab**: Click **Open in New Window** to render HTML applications in their own browser tab via the raw file route (`/api/workspace/raw/*filepath`).
- **Download**: Instant one-click file download to the host machine.

---

## 3. Strict Confinement & Security

To prevent accidental modification or corruption of the application's own server code:
- **Jail Directory**: All file interactions via the Artifact Panel and tool runner are strictly restricted to the `workspace/` folder.
- **Escape Blocking**: Traversal attacks (such as `../../src/main.js` or `/etc/passwd`) are caught by `resolveWorkspacePath()` in `src/utils/workspace.js`, throwing a `403 Forbidden` error before any filesystem access occurs.
