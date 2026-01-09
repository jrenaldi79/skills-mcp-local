# Skills MCP Server

> **Alpha Release** - This project is in early development. APIs and features may change.

A Model Context Protocol (MCP) server that discovers and manages local skills for AI agents. Skills are specialized capabilities defined in SKILL.md files that extend what Claude and other LLMs can do.

## Features

- **Dynamic Skill Discovery** - Automatically discovers skills installed on your machine
- **Marketplace Integration** - Browse and install skills from GitHub-based marketplaces
- **Update Detection** - Checks for skill updates at startup and notifies you
- **Easy Updates** - One command to update all skills or specific ones

## Installation

```bash
# Clone the repository
git clone https://github.com/jrenaldi79/skills-mcp-local.git
cd skills-mcp-local

# Install dependencies
npm install

# Build
npm run build
```

## Configuration

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "skills": {
      "command": "node",
      "args": ["/path/to/skills-mcp-local/dist/index.js"]
    }
  }
}
```

## Available Tools

| Tool | Description |
|------|-------------|
| `skills_list_installed` | List all installed skills (metadata shown in tool description) |
| `skills_discover` | Browse skills from configured marketplaces |
| `skills_install` | Download and install a skill from a marketplace |
| `skills_update` | Update installed skills to latest versions |
| `skills_configure_marketplace` | Add, remove, or list marketplace URLs |
| `skills_get_info` | Get detailed information about a skill |
| `skills_onboarding` | Learn how skills work |

## Skill Locations

Skills are discovered from these locations (in order of priority):

1. `~/skills/` - Primary location
2. `~/.claude/skills/` - Claude-specific
3. `.claude/skills/` - Current project
4. `~/Documents/skills/` - Fallback
5. `~/.local/share/skills/` - XDG location
6. `/usr/local/share/skills/` - System-wide

## Marketplaces

The default marketplace is:
```
https://github.com/anthropics/skills/tree/main/skills
```

Add custom marketplaces using `skills_configure_marketplace`:
```
action: "add"
url: "https://github.com/your-org/your-skills/tree/main/skills"
```

## How Updates Work

1. When you install a skill via `skills_install`, the commit hash is saved
2. At server startup, each skill's source is checked against the marketplace
3. If a newer commit exists, the skill shows "Update available" in the tool description
4. Run `skills_update` to download the latest version

Skills installed manually (not via `skills_install`) cannot be auto-updated.

## Development

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint
npm run lint

# Build
npm run build
```

## Skill Format

Skills follow the [agentskills.io specification](https://agentskills.io/specification). Each skill requires a `SKILL.md` file with YAML frontmatter:

```markdown
---
name: my-skill
description: What this skill does and when to use it
license: MIT
compatibility: Works with Claude Code
metadata:
  author: your-name
  version: "0.1.0"
---

# My Skill

Instructions for using this skill...
```

## Project Structure

```
skills-mcp-local/
├── src/
│   ├── index.ts              # Entry point
│   ├── server/               # MCP server setup
│   ├── tools/                # Tool implementations
│   ├── managers/             # Business logic
│   ├── utils/                # Utilities
│   └── types/                # TypeScript types
├── tests/                    # Test files
├── skills/                   # Test marketplace
└── dist/                     # Compiled output
```

## License

MIT

## Contributing

This project is in alpha. Contributions welcome but expect breaking changes.
