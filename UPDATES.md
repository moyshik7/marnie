## Updates on 0.5.x
- Dedicated SQLite Database (better-sqlite3):
    - Created capacity.js managing ./data/capacity.db separately from marnie.db.
    - Built a documents schema with automatic SQLite fts5 virtual indexing and synchronization triggers for sub-millisecond keyword and semantic search
- Express API Routes:
    - Created capacity.js and mounted it at /api/capacity in main.js
    - Supports listing all documents (GET /api/capacity/documents), fetching document details (GET /api/capacity/documents/:id), uploading single/multiple files (POST /api/capacity/documents), deleting files (DELETE /api/capacity/documents/:id), and FTS querying (GET /api/capacity/search)
- AI Agent Tool & Skill:
    - Implemented expandedCapacity.js and registered retrieve_expanded_capacity (with aliases expanded_capacity, search_expanded_capacity, query_expanded_capacity, retrieve_capacity) in registry.js
    - Enabled tool formatting in chat.js
    - Injected tool instructions into the AI agent's system prompt in registry.js and index.js
- Added the Expanded Capacity button with a database icon (Database) immediately above Deep Research in Sidebar.jsx with styling matching the other sidebar buttons
- Created ExpandedCapacityView.jsx rendering in the main view area (just like ChatView and DeepResearchView)
    - Drag-and-drop listener across the window for .md and .txt files with visual drag state
    - + Upload files file picker and Copied text modal to paste text snippets directly
    - Grid of rounded reference cards styled like the screenshot with file type badges (< > code badge for markdown and text document badge for plain text)
    - Read-only preview modal (not editable) and file deletion
- Added the Search in chats feature to Marnie, integrated into the left sidebar and displayed in a full tab view


## Updates on 0.4.x
- Added a text editor with markdown, latex, mermaid preview and edit mode
- Edited / Created files can be viewed and edited in the browser
- Bug fix: File editor edits the source code of the app and renders the app corrupted. Fixed: Now the file edit and create can only edit / create files inside the workspace directory
- Adding BRAIN.md for persistant context about the user
- Added a notes feature
- Notes can now be viewed and edited by the user
- Added fetch notes skill
- Note viewer UI Bug fixed
- Notes not being updated bug fixed
- Implementing slash commands
- `/elim5` Slash command added. It injects a prompt to explain a hard subject or topic like the user is 5 years old
- `/btw` can be used to send a message without contributing in context
- Some other slash commands were added full list in README.md
- Bug fix: Previously researched reports cannot be deleted. Fixed
- Instructs the AI to use less emojis
- UI upgrade
- Several minor bug fixes

## Updates on 0.3.x
- Updated research report page
- Deep research can now use tools
- Research report preview now supports latex preview
- Research report preview now supports mermaid flowchart preview
- Research preview now mobile friendly and optimized for mobile
- Research preview pages can now be viewed without opening the dashboard with individual link
- Docker build now uses node 24.x
- Discord webhook embed issue fixed
- Fixed bug: Duckduckgo search returning zero results
- Major ui improvements
- [Full changelog](https://github.com/moyshik7/marnie/commits/0.3.3)
