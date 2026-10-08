'use strict';

const bash = require('./bash');
const codeRunner = require('./codeRunner');
const filesystem = require('./filesystem');
const fileCreate = require('./fileCreate');
const fileRead = require('./fileRead');
const fileWrite = require('./fileWrite');
const tasks = require('./tasks');
const cronManager = require('./cronManager');
const discord = require('./discord');
const timer = require('./timer');
const webSearch = require('./webSearch');

const TOOLS = {
  run_javascript: {
    description: 'Execute JavaScript code in a fresh, isolated Node.js child process.',
    parameters: {
      code: { type: 'string', description: 'JavaScript code snippet to execute', required: true },
      timeout: { type: 'number', description: 'Timeout in ms (default 15000)' },
    },
    execute: async ({ code, timeout }) => codeRunner.runJS({ code, timeout }),
  },
  run_bash: {
    description: 'Execute a terminal command in the host shell (bash/sh).',
    parameters: {
      command: { type: 'string', description: 'The shell command to run', required: true },
      cwd: { type: 'string', description: 'Working directory path (default: workspace)' },
    },
    execute: async ({ command, cwd }) => bash.run({ command, cwd }),
  },
  search_filesystem: {
    description: 'Recursively search files and directories matching a pattern.',
    parameters: {
      directory: { type: 'string', description: 'Directory to search in', required: true },
      pattern: { type: 'string', description: 'Filename pattern or substring' },
    },
    execute: async ({ directory, pattern }) => filesystem.search({ directory, pattern }),
  },
  read_file: {
    description: 'Read the contents of a local file (full or specific line range).',
    parameters: {
      filePath: { type: 'string', description: 'Path to file to read', required: true },
      startLine: { type: 'number', description: '1-based starting line number (optional)' },
      endLine: { type: 'number', description: '1-based ending line number (optional)' },
    },
    execute: async ({ filePath, startLine, endLine }) => fileRead.read({ filePath, startLine, endLine }),
  },
  create_file: {
    description: 'Create a new local file with initial content.',
    parameters: {
      filePath: { type: 'string', description: 'Path to the new file', required: true },
      content: { type: 'string', description: 'Initial file content' },
      overwrite: { type: 'boolean', description: 'Overwrite if file exists (default false)' },
    },
    execute: async ({ filePath, content, overwrite }) => fileCreate.create({ filePath, content, overwrite }),
  },
  write_file: {
    description: 'Write, append, or replace specific lines in a local file. Reads file before line replacement.',
    parameters: {
      filePath: { type: 'string', description: 'Path to the file to modify', required: true },
      content: { type: 'string', description: 'Content to insert or overwrite', required: true },
      startLine: { type: 'number', description: '1-based start line to replace (optional)' },
      endLine: { type: 'number', description: '1-based end line to replace (optional)' },
      append: { type: 'boolean', description: 'Append content to end of file (optional)' },
    },
    execute: async ({ filePath, content, startLine, endLine, append }) => fileWrite.write({ filePath, content, startLine, endLine, append }),
  },
  create_task: {
    description: 'Create a persistent task saved in SQLite.',
    parameters: {
      title: { type: 'string', description: 'Task title', required: true },
      description: { type: 'string', description: 'Task details or steps' },
      priority: { type: 'string', description: "'low' | 'medium' | 'high' (default 'medium')" },
    },
    execute: async ({ title, description, priority }) => tasks.createTask({ title, description, priority }),
  },
  list_tasks: {
    description: 'List existing tasks from SQLite storage.',
    parameters: {
      status: { type: 'string', description: "'pending' | 'in_progress' | 'done' | 'cancelled' (optional)" },
    },
    execute: async ({ status }) => tasks.listTasks({ status }),
  },
  create_cron: {
    description: 'Schedule a persistent recurring cron job.',
    parameters: {
      name: { type: 'string', description: 'Name of the job', required: true },
      expression: { type: 'string', description: "5-field cron expression (e.g. '0 9 * * *')", required: true },
      action_type: { type: 'string', description: "'bash' | 'discord' | 'http'", required: true },
      action_data: { type: 'object', description: 'Configuration object for the action', required: true },
    },
    execute: async ({ name, expression, action_type, action_data }) => cronManager.createJob({ name, expression, action_type, action_data }),
  },
  send_alert: {
    description: 'Send a notification or alert embed to the configured Discord webhook channel.',
    parameters: {
      message: { type: 'string', description: 'Message content for the embed', required: true },
      title: { type: 'string', description: 'Optional title for the embed' },
      level: { type: 'string', description: "'info' | 'success' | 'warning' | 'error' (default 'info')" },
    },
    execute: async ({ message, title, level }) => discord.sendAlert({ message, title, level }),
  },
  set_timer: {
    description: 'Set a countdown timer that sends a Discord alert notification when the time expires.',
    parameters: {
      seconds: { type: 'number', description: 'Duration in seconds (e.g. 60)' },
      duration: { type: 'string', description: "Duration string (e.g. '30s', '5m', '1h') if seconds not provided" },
      message: { type: 'string', description: 'Message to send to Discord when the timer finishes', required: true },
      title: { type: 'string', description: "Optional title for the Discord alert embed (default 'Timer Alert')" },
    },
    execute: async ({ seconds, duration, message, title }) => timer.setTimer({ seconds, duration, message, title }),
  },
  web_search: {
    description: 'Search the live web for up-to-date information, documentation, news, or answers using DuckDuckGo or SearXNG. Keep search queries short and focused (2 to 5 words, e.g. "latest nodejs release" or "deepseek r1 architecture") for best results.',
    parameters: {
      query: { type: 'string', description: 'The search keywords to look up. Keep search terms short and concise (strictly 2 to 5 words). Do NOT use long sentences, questions, or conversational queries.', required: true },
      max_results: { type: 'number', description: 'Maximum number of results to return (default 5)' },
      provider: { type: 'string', description: "Search provider override ('duckduckgo' or 'searxng')" },
    },
    execute: async ({ query, max_results, provider }) => webSearch.search({ query, maxResults: max_results, provider }),
  },
  fetch_webpage: {
    description: 'Fetch and extract the core textual content of a specific webpage using a lightweight scraper (Cheerio). Useful when you have a specific URL and want its body text.',
    parameters: {
      url: { type: 'string', description: 'The absolute HTTP/HTTPS URL of the webpage to scrape', required: true },
      max_length: { type: 'number', description: 'Maximum characters of text to extract (default 2000)' },
    },
    execute: async ({ url, max_length }) => {
      const content = await webSearch.fetchPageContent(url, max_length || 2000);
      return {
        url,
        content: content || 'Could not extract content from the specified URL.',
      };
    },
  },
};

/**
 * Execute a tool by name with arguments.
 */
async function executeTool(name, args = {}) {
  // Normalize tool aliases
  const aliasMap = {
    javascript: 'run_javascript',
    js: 'run_javascript',
    code_run: 'run_javascript',
    bash: 'run_bash',
    terminal: 'run_bash',
    search_file: 'search_filesystem',
    search_files: 'search_filesystem',
    find_files: 'search_filesystem',
    file_create: 'create_file',
    file_read: 'read_file',
    file_write: 'write_file',
    task_create: 'create_task',
    task_list: 'list_tasks',
    cron_create: 'create_cron',
    discord_alert: 'send_alert',
    timer: 'set_timer',
    create_timer: 'set_timer',
    countdown: 'set_timer',
    search: 'web_search',
    duckduckgo: 'web_search',
    duckduckgo_search: 'web_search',
    ddg: 'web_search',
    ddg_search: 'web_search',
    searxng: 'web_search',
    searxng_search: 'web_search',
    google: 'web_search',
    scrape_webpage: 'fetch_webpage',
    scrape_url: 'fetch_webpage',
    fetch_url: 'fetch_webpage',
    scrape: 'fetch_webpage',
  };

  const toolName = aliasMap[name] || name;
  const tool = TOOLS[toolName];
  if (!tool) {
    throw new Error(`Unknown tool "${name}". Available tools: ${Object.keys(TOOLS).join(', ')}`);
  }

  return tool.execute(args);
}

/**
 * Build the system prompt detailing persona, live environment, and tools.
 */
function buildSystemPrompt(customSystemPrompt = '') {
  const toolsDescription = Object.entries(TOOLS)
    .map(([name, def]) => {
      const params = Object.entries(def.parameters)
        .map(([pName, pDef]) => `    - \`${pName}\` (${pDef.type}${pDef.required ? ', required' : ''}): ${pDef.description}`)
        .join('\n');
      return `- **\`${name}\`**: ${def.description}\n  Parameters:\n${params}`;
    })
    .join('\n\n');

  return `You are Marnie, an advanced self-hosted AI workspace assistant (like Odysseus).
You operate inside a real Linux environment and are equipped with native tools to interact directly with the operating system, terminal, filesystem, code runner, tasks, and integrations.

CRITICAL INSTRUCTIONS:
1. NEVER apologize or state "As an AI language model, I cannot execute code", "I cannot access external environments", or "I cannot interact with the operating system". You ARE connected to a real live backend and CAN execute code and commands.
2. Whenever the user requests running code, testing commands, searching files, creating files, scheduling jobs, sending discord alerts, or creating tasks, YOU MUST EXECUTE the appropriate tool.
3. STRICT NO-EMOJI RULE: DO NOT use emojis anywhere in your responses, thought process, tool arguments, reminders, cron actions, or discord alerts (absolutely NO bells, party poppers, cakes, or other emojis). All text must be clean, professional, plain text without emojis unless the user explicitly requests emojis.
4. DO NOT write fake markdown headers like "> **Executed Tool:** ..." or "> 🛠️ **Executed Tool:** ...". The backend automatically runs your tool and returns real execution output. Writing fake execution markdown will fail and will not perform the action.
5. To execute a tool, write a tool call block using either of the following formats (or use native tool calling):

<tool_call>
{"name": "send_alert", "arguments": {"message": "Happy Birthday!"}}
</tool_call>

or

\`\`\`tool_call
{
  "name": "run_bash",
  "arguments": {
    "command": "uname -a"
  }
}
\`\`\`

AVAILABLE TOOLS:
${toolsDescription}

TOOL USAGE GUIDELINES:
- WEB SEARCH INSTRUCTIONS: For searching the live internet for recent facts, news, documentation, or answers, call \`web_search\`. CRITICAL: Keep search terms short and concise (strictly 2 to 5 words, e.g. "latest nodejs release" or "qwen 2.5 benchmarks"). Do NOT use long sentences, questions, or conversational queries, as short keywords produce significantly better results.
- SYNTHESIZING SEARCH RESULTS: After \`web_search\` is executed and results are retrieved, you MUST synthesize the retrieved information and provide a comprehensive, direct, and well-structured answer to the user's question citing the relevant facts or links. Never stop after the tool execution.
- For sending Discord alerts, notifications, or messages right now, call \`send_alert\`.
- For setting countdown timers that trigger a Discord alert after a given time, call \`set_timer\`.
- For scheduling timers, reminders, or background jobs, call \`create_cron\`.
- For running JavaScript or Node.js code snippets, call \`run_javascript\`.
- For shell commands (e.g., git, package managers, system status), call \`run_bash\`.
- For reading files before making edits, call \`read_file\` first, then \`write_file\`.
- For saving user tasks and to-dos, call \`create_task\`.
- MERMAID & DIAGRAMS INSTRUCTION: Whenever illustrating workflows, systems, architectures, timelines, state diagrams, or schemas, ALWAYS provide clear, valid Mermaid diagrams enclosed in \`\`\`mermaid code blocks. The workspace has built-in live preview for Mermaid diagrams.
- LATEX MATH INSTRUCTION: For mathematical equations, proofs, and formulas, ALWAYS use LaTeX notation ($$...$$ for display block equations, $...$ for inline math). The workspace renders LaTeX with KaTeX.
- NO EM DASHES INSTRUCTION: NEVER use em dashes (—). Always use standard hyphens or dashes (-) in your text.
- When you emit a tool call, the system will execute it and deliver the real stdout/stderr back to the workspace.
- For sending Discord alerts, notifications, or messages right now, call \`send_alert\`.
- For setting countdown timers that trigger a Discord alert after a given time, call \`set_timer\`.
- For scheduling timers, reminders, or background jobs, call \`create_cron\`.
- For running JavaScript or Node.js code snippets, call \`run_javascript\`.
- For shell commands (e.g., git, package managers, system status), call \`run_bash\`.
- For reading files before making edits, call \`read_file\` first, then \`write_file\`.
- For saving user tasks and to-dos, call \`create_task\`.
- MERMAID & DIAGRAMS INSTRUCTION: Whenever illustrating workflows, systems, architectures, timelines, state diagrams, or schemas, ALWAYS provide clear, valid Mermaid diagrams enclosed in \`\`\`mermaid code blocks. The workspace has built-in live preview for Mermaid diagrams.
- LATEX MATH INSTRUCTION: For mathematical equations, proofs, and formulas, ALWAYS use LaTeX notation ($$...$$ for display block equations, $...$ for inline math). The workspace renders LaTeX with KaTeX.
- NO EM DASHES INSTRUCTION: NEVER use em dashes (—). Always use standard hyphens or dashes (-) in your text.
- When you emit a tool call, the system will execute it and deliver the real stdout/stderr back to the workspace.

${customSystemPrompt ? `\nADDITIONAL USER INSTRUCTIONS:\n${customSystemPrompt}` : ''}`.trim();
}

/**
 * Parse tool calls from a model text output.
 * Handles <tool_call>...</tool_call> or ```tool_call...```
 */
function parseToolCalls(text) {
  if (!text || typeof text !== 'string') return [];
  const calls = [];

  // 1. Check <tool_call>...</tool_call>
  const xmlRegex = /<tool_call>([\s\S]*?)<\/tool_call>/gi;
  let match;
  while ((match = xmlRegex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (parsed.name) {
        calls.push({
          raw: match[0],
          name: parsed.name,
          arguments: parsed.arguments || parsed.parameters || {},
        });
      }
    } catch {}
  }

  // 2. Check ```tool_call ... ```
  const mdRegex = /```(?:tool_call|json:tool_call)\s*([\s\S]*?)```/gi;
  while ((match = mdRegex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const toolName = parsed.name || parsed.tool;
      if (toolName) {
        calls.push({
          raw: match[0],
          name: toolName,
          arguments: parsed.arguments || parsed.parameters || {},
        });
      }
    } catch {}
  }

  // 3. Check generic ```json ... ``` blocks containing a tool name
  const jsonRegex = /```json\s*([\s\S]*?)```/gi;
  while ((match = jsonRegex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const toolName = parsed.name || parsed.tool;
      if (toolName && typeof toolName === 'string') {
        const knownTools = ['run_javascript', 'run_bash', 'search_filesystem', 'read_file', 'create_file', 'write_file', 'create_task', 'list_tasks', 'create_cron', 'send_alert', 'set_timer', 'timer', 'web_search', 'search', 'javascript', 'bash', 'terminal', 'js'];
        if (knownTools.includes(toolName.toLowerCase()) && !calls.some(c => c.raw === match[0])) {
          calls.push({
            raw: match[0],
            name: toolName,
            arguments: parsed.arguments || parsed.parameters || {},
          });
        }
      }
    } catch {}
  }

  return calls;
}

const OLLAMA_TOOLS = Object.entries(TOOLS).map(([name, def]) => ({
  type: 'function',
  function: {
    name,
    description: def.description,
    parameters: {
      type: 'object',
      properties: Object.fromEntries(
        Object.entries(def.parameters).map(([pName, pDef]) => [
          pName,
          {
            type: pDef.type,
            description: pDef.description,
          },
        ])
      ),
      required: Object.entries(def.parameters)
        .filter(([_, pDef]) => pDef.required)
        .map(([pName]) => pName),
    },
  },
}));

module.exports = {
  TOOLS,
  OLLAMA_TOOLS,
  executeTool,
  buildSystemPrompt,
  parseToolCalls,
};
