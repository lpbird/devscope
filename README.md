# devscope

> Development environment at a glance — detect, install, and manage your dev tools. Scan & visualize all local code projects. MCP-native.

[![npm version](https://img.shields.io/npm/v/devscope)](https://www.npmjs.com/package/devscope)
[![license](https://img.shields.io/npm/l/devscope)](./LICENSE)

---

## Why devscope?

Setting up a new machine or onboarding onto a team? **devscope** answers three questions instantly:

1. **What's installed?** — Detect runtimes, package managers, and version managers in seconds.
2. **What's missing?** — One command to install everything you need.
3. **What's on this machine?** — Scan all your code projects, see languages, frameworks, Git status, and dependencies at a glance.

It also works as an **MCP Server**, so AI agents (Cursor, Claude Desktop, etc.) can query your dev environment directly.

## Features

- **Environment Detection** — Node, Go, Python, Rust, Java, Ruby, PHP, .NET, Swift, Dart + package managers + version managers
- **One-Click Setup** — Interactively install missing tools via Homebrew / apt / winget / official installers
- **Project Scanner** — Discover all code projects across your machine, extract metadata, frameworks, Git info
- **Visual Dashboard** — Self-contained HTML report with Environment / Projects / Insights views
- **MCP Server** — AI agents can detect environments, install tools, scan projects, and generate reports
- **Beautiful CLI** — Colorful terminal output with progress indicators

## Quick Start

```bash
# No install needed — run directly
npx devscope env        # Show what's installed
npx devscope setup      # Install missing tools
npx devscope scan       # Scan your projects
npx devscope list       # List all projects
npx devscope report     # Generate visual report
```

Or install globally:

```bash
npm install -g devscope
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `devscope env` | Detect installed runtimes, package managers, version managers |
| `devscope setup` | Interactively install missing tools |
| `devscope setup --all` | Install all missing tools without prompting |
| `devscope setup --only node,go` | Install specific tools |
| `devscope scan [dirs...]` | Scan directories for code projects |
| `devscope list` | List scanned projects |
| `devscope list --lang node` | Filter by language |
| `devscope list --active` | Show only active projects |
| `devscope show <name>` | Show detailed info for a project |
| `devscope report` | Generate HTML report and open in browser |
| `devscope mcp` | Start as MCP Server |

## MCP Integration

devscope works as an MCP Server for AI-powered development tools.

### Cursor

Settings → MCP → Add:

```json
{
  "mcpServers": {
    "devscope": {
      "command": "npx",
      "args": ["-y", "devscope", "mcp"]
    }
  }
}
```

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "devscope": {
      "command": "npx",
      "args": ["-y", "devscope", "mcp"]
    }
  }
}
```

### MCP Tools

| Tool | Description |
|------|-------------|
| `detect_environment` | Detect all installed runtimes and tools |
| `install_tool` | Install a specific runtime or package manager |
| `scan_directories` | Scan directories and discover projects |
| `generate_report` | Generate visual HTML report |

### Example Prompts

> "What development tools do I have installed?"

> "Install Go and Rust on my machine"

> "Scan ~/workspace and show me all my projects"

> "Generate a report of all my code projects"

## Detected Technologies

### Runtimes
Node.js · Go · Python · Rust · Java · Ruby · PHP · .NET · Swift · Dart

### Package Managers
npm · yarn · pnpm · bun · cargo · pip · uv · composer · gem · Homebrew

### Version Managers
nvm · fnm · volta · n · pyenv · rustup · mise · asdf · sdkman · rbenv

### Project Languages
Node.js (`package.json`) · Python (`requirements.txt`, `pyproject.toml`) · Go (`go.mod`) · Java (`pom.xml`, `build.gradle`) · Rust (`Cargo.toml`)

### Frameworks
React · Vue · Angular · Svelte · Next.js · Nuxt · Electron · Tauri · Express · NestJS · Fastify · Koa

## Output

| File | Path | Description |
|------|------|-------------|
| JSONL | `~/.devscope/results.jsonl` | Raw scan data |
| HTML | `~/.devscope/report.html` | Visual report |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

[MIT](./LICENSE)
