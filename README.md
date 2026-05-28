# BotUI - AI Money Coach

BotUI is an AI Money Coach application designed for the FinTech domain. It allows users to upload bank statement CSVs, automatically classify transactions, visualize spending insights, and supports human review for uncertain categorization.

## Tech Stack

This project is built as a monorepo managed by [Bun](https://bun.sh/) and [Turborepo](https://turbo.build/). 
- **Frontend**: Next.js App Router (`apps/web/`)
- **UI Components**: React, Tailwind CSS, shadcn/ui (`packages/ui/`)

## Prerequisites

- [Bun](https://bun.sh/) installed on your local machine.

## Getting Started

1. **Install dependencies**:
   ```bash
   bun install
   ```

2. **Start the development server**:
   ```bash
   bun run dev
   ```
   This command starts the Next.js frontend along with Turbopack. You can view the application at [http://localhost:3000](http://localhost:3000).

## Available Commands

- `bun run build`: Produce the Next.js production build.
- `bun run lint`: Run ESLint across participating workspaces.
- `bun run typecheck`: Check TypeScript without emitting files.
- `bun run format`: Format workspace TypeScript and TSX files with Prettier.

## ECC & Codex Configuration

This repo includes project-local ECC/Codex configuration:

- `.codex/config.toml`: Codex defaults, MCP servers, and multi-agent settings.
- `.codex/agents/`: read-only explorer, reviewer, and docs researcher roles.
- `.agents/skills/`: reusable ECC workflows for TDD, security review, verification, frontend/backend work, FastAPI, Postgres, deployment, and research.
- `.agents/rules/`: common, TypeScript, Python, and web engineering rules.

Configured MCP servers include GitHub, Context7, Exa, Memory, Playwright, and Sequential Thinking. Keep credentialed or heavier integrations user-level unless a task specifically needs them.

## Project Structure

- `apps/web/`: The main Next.js web application. Routes and layouts are in `app/`, and app-specific components are in `components/`.
- `packages/ui/`: Shared UI components utilizing shadcn/ui primitives.
- `docs/`: Project documentation and architecture details.

## UI Components & Design System

For UI work, we prioritize `shadcn/ui` primitives and blocks. To search and add a new component to the shared UI package, you can run:

```bash
bunx --bun shadcn@latest add <component_name> -c apps/web
```

This ensures components are properly placed inside `packages/ui/src/components/` and can be imported using the `@workspace/ui` alias.
