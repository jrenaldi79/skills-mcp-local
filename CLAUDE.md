# Skills MCP Local - Claude Instructions

This is the project-specific instructions file for the Skills MCP Local server. These instructions supplement the global CLAUDE.md and provide context for this TypeScript/Node.js MCP server project.

## Project Overview

**Skills MCP Local** is a Model Context Protocol (MCP) server that dynamically discovers and exposes local skills to AI agents.

### Current Status: Initial Development

This project is in early development. Core features will be defined as the project progresses.

---

## Essential Commands

### Development
```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript to dist/
npm start            # Start MCP server (stdio mode)
npm run lint         # Run ESLint
npm run lint:fix     # Auto-fix ESLint issues
```

### Testing
```bash
npm test                        # Run all tests
npm test tests/unit/            # Run unit tests only
npm test tests/integration/     # Run integration tests only
npm run test:coverage           # Generate coverage report
```

**Important**: Prefer running single test files during development for performance.

### Code Quality Monitoring
```bash
# Check line counts (monitor file sizes - target <300 lines)
find src -name "*.ts" -exec wc -l {} + | sort -n

# Find large files (>300 lines need refactoring)
find src -name "*.ts" -exec wc -l {} + | awk '$1 > 300'

# Monitor test coverage (target >60%)
npm run test:coverage
```

---

## Technical Stack

- **Language**: TypeScript / Node.js (ES2022+)
- **Module System**: ESM (`"type": "module"`)
- **MCP SDK**: `@modelcontextprotocol/sdk`
- **Testing**: Jest with ts-jest
- **Linting**: ESLint with TypeScript support
- **Node Version**: >=18.0.0

---

## Directory Structure

```
skills-mcp-local/
├── src/
│   ├── index.ts              # Entry point
│   ├── server/               # MCP Server setup and routing
│   ├── tools/                # Tool implementations (one file per tool)
│   ├── managers/             # Business logic (Discovery, Execution, etc.)
│   ├── utils/                # Shared utilities
│   └── types/                # TypeScript type definitions
├── tests/
│   ├── unit/                 # Unit tests (mocked dependencies)
│   ├── integration/          # Integration tests (real FS/process)
│   └── fixtures/             # Test data
├── docs/                     # Documentation
├── dist/                     # Compiled output (gitignored)
├── package.json
├── tsconfig.json
└── CLAUDE.md                 # This file
```

---

## 🏗️ Architectural Guidelines

### Modular Design Philosophy

The project follows a strict **Anti-Monolith** architecture to ensure maintainability and testability.

1. **Encapsulated Logic**: Each tool MUST be defined in its own file (e.g., `src/tools/skill_list.ts`).
   - **Exception**: Tightly coupled small tools may be grouped if total file size remains <200 lines.
   - **Goal**: Logic for a specific capability should be isolated and testable.

2. **Anti-Monolith Enforcement**:
   - **Rule**: Files must stay under **300 lines** of code.
   - **Action**: If a file exceeds this limit, it MUST be refactored or split immediately.

3. **Handler Pattern**:
   - Tools should follow the `handler(manager, args)` pattern.
   - `src/server/index.ts` should act as a lightweight router, dispatching requests to isolated handlers.

4. **Service Layer**:
   - Managers (`src/managers/`) act as the Service Layer.
   - They should remain focused and not become "God Objects".

### 🚫 File Size Limits (HARD LIMITS)

**REJECT any PR that violates these limits:**

| Entity | Max Lines | Action If Exceeded |
|--------|-----------|-------------------|
| **Any file** | 300 lines | MUST refactor immediately |
| **Any function** | 50 lines | MUST break into smaller functions |
| **Any class** | 200 lines | MUST split responsibilities |

### Complexity Indicators (Red Flags)

**STOP and refactor immediately if you see:**

- **>5 nested if/else statements** → Extract to separate functions
- **>3 try/catch blocks in one function** → Split error handling
- **>10 imports** → Consider splitting the module
- **Duplicate logic** → Extract to shared utilities in `src/utils/`
- **Mixed concerns** → One file handling routing AND business logic AND error handling

---

## 🚨 Mandatory TDD Process

**Every feature request MUST start with writing tests.**

### TDD Cycle

1. **Red Phase** (REQUIRED FIRST STEP):
   - Write failing tests in `tests/` defining expected behavior.
   - Run tests to confirm failure.
   - This validates that your test actually tests something.

2. **Green Phase**:
   - Implement simplest code to make tests pass.
   - Focus on making it work, not making it optimal.

3. **Refactor Phase**:
   - Clean up implementation.
   - Ensure tests still pass.
   - Improve both implementation AND test code.

### TDD Enforcement

**Do NOT start implementing `src/` files before tests exist and fail.**

Before writing ANY implementation code:
1. ✅ Explicitly state: "Following TDD - writing tests first"
2. ✅ Create test file in appropriate `tests/` directory
3. ✅ Write failing tests that define expected behavior
4. ✅ Run tests and show RED output proving tests fail
5. ✅ Only then write implementation
6. ✅ Run tests again and show GREEN output proving tests pass

---

## 📝 Documentation Maintenance

**Critical**: Documentation must stay in sync with the codebase.

- If you add a new tool, update the **Tools Specification** section.
- If you change the architecture, update the **Architecture** diagram.
- If you add environment variables, update the **Configuration** section.
- **Rule**: If the code changes, the documentation must change in the same PR/task.

---

## 📊 Structured Logging Best Practices

**CRITICAL for debugging and observability:**

- **Use a Logger utility** (`src/utils/logger.ts`) - DO NOT use `console.log` in production code
- **Log levels**: `error`, `warn`, `info`, `debug` - configured via `LOG_LEVEL` env var
- **Include context**: Every log should include relevant context

```typescript
// ❌ BAD
console.log('Skill executed');

// ✅ GOOD
logger.info('Skill executed', { skillName, duration: `${ms}ms` });
```

**Log Level Guidelines:**
| Level | When to Use | Example |
|-------|-------------|---------|
| `debug` | Development/verbose info | `Checking file existence at path...` |
| `info` | Important events | `Server started`, `Skill discovered` |
| `warn` | Recoverable issues | `Config file not found, using defaults` |
| `error` | Failures requiring attention | `Failed to parse skill manifest` |

---

## 📋 Development Workflow Checklist

### Before Starting New Work
1. **Check file sizes** - Run `find src -name "*.ts" -exec wc -l {} + | sort -n`
2. **Review CLAUDE.md** - Ensure you understand current architecture
3. **Check test coverage** - Run `npm run test:coverage` (target >60%)
4. **Plan refactoring** - If files approaching 300 lines, refactor BEFORE adding features

### During Development
1. **Write tests first** (TDD)
2. **Monitor file growth** - Don't let any file exceed 300 lines
3. **Extract utilities** - Don't duplicate logic
4. **Single responsibility** - Each function/module should do one thing well

### Before Committing
1. **ALWAYS run tests** - `npm test`
2. **Check file sizes** - No file >300 lines, no function >50 lines
3. **Update documentation** - If you changed architecture, update CLAUDE.md
4. **Run linter** - `npm run lint`

---

## ✅ Code Review Checklist

**Before submitting or approving PRs:**

- [ ] Tests written first (TDD) and passing
- [ ] No file >300 lines
- [ ] No function >50 lines
- [ ] Documentation updated if architecture changed
- [ ] No duplicated code
- [ ] Clear separation of concerns
- [ ] Proper error handling with meaningful messages
- [ ] Structured logging (not `console.log`)
- [ ] TypeScript types properly defined (no `any` without justification)

---

## Configuration

Environment variables (create `.env` file):

```bash
# Required
SKILLS_DIRECTORY=~/skills           # Path to skills folder

# Optional
LOG_LEVEL=info                      # Log verbosity (debug, info, warn, error)
```

---

## Testing Strategy

### Test Types
- **Unit Tests** (`tests/unit/`): Focus on logic verification with mocked dependencies.
- **Integration Tests** (`tests/integration/`): Verify file system interactions and tool chains.

### Test Configuration Notes
- Use Jest with ts-jest for TypeScript support
- ESM modules require proper Jest configuration (`extensionsToTreatAsEsm`, `transform` settings)
- Prefer `process.cwd()` over `import.meta.url` for compatibility with Jest

---

## MCP Server Development Guidelines

### MCP Protocol Essentials

1. **Tool Registration**: All tools must be registered with proper schemas
2. **Error Handling**: Return structured errors that clients can parse
3. **stdio Mode**: Primary transport - server reads from stdin, writes to stdout
4. **Logging**: Use stderr for logs to avoid polluting MCP protocol on stdout

### Tool Implementation Pattern

```typescript
// src/tools/my_tool.ts
import { z } from 'zod';

export const myToolSchema = z.object({
  param: z.string().describe('Parameter description'),
});

export type MyToolInput = z.infer<typeof myToolSchema>;

export async function handleMyTool(
  manager: SomeManager,
  args: MyToolInput
): Promise<ToolResult> {
  // Implementation
}
```

### Server Structure Pattern

```typescript
// src/server/index.ts - Keep this lightweight!
// Route requests to tool handlers, don't implement logic here
```

---

## Debugging & Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Server changes not taking effect | MCP client using old build | Restart MCP client |
| TypeScript compilation errors | Missing types or incorrect config | Run `npm run build` to see full errors |
| ESLint errors blocking commits | Code style violations | Run `npm run lint:fix` |
| Tests timing out | Async operations not awaited | Check for missing `await` statements |
| Jest ESM issues | Incorrect module configuration | Check `jest.config.js` and tsconfig |

---

## Response Constraints

When working on this project:

- **ALWAYS write tests first** - TDD is mandatory
- **DO NOT create files >300 lines** - Refactor if approaching limit
- **DO NOT remove existing code** unless necessary
- **DO NOT remove comments** unless necessary
- **KEEP documentation in sync** with code changes
- **USE structured logging** - no `console.log` in production code

---

## Maintenance

Update this file when:
- [ ] Adding new tools or features
- [ ] Changing architecture or patterns
- [ ] Adding environment variables
- [ ] Discovering important debugging information
- [ ] Changing testing strategy
