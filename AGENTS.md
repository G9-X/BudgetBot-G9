# Repository Guidelines

## ECC & Codex Configuration

Project-level ECC assets live in `.agents/` and `.codex/`.
Use `.agents/skills/` for reusable task workflows, `.agents/rules/` for
project-local engineering rules, and `.codex/config.toml` for Codex MCP and
multi-agent defaults. Repo-local Codex agents are defined in `.codex/agents/`.

The default Codex surface for this repo includes GitHub, Context7, Exa,
Memory, Playwright, and Sequential Thinking MCP servers. Keep heavier or
credentialed integrations user-level unless a task needs them.

## Project Structure & Module Organization

This monorepo is initialized as a Bun-managed Turborepo.
`apps/web/` is the Next.js App Router frontend; put routes/layouts in `app/`
and app components in `components/`. Add the FastAPI service as `apps/api/`,
not inside frontend code. Put reusable UI in `packages/ui/src/components/`
and shared contracts/configuration in `packages/`. Version IaC under `infra/`
and required submission material in `docs/W7_evidence.md`.

## Product & UI Direction

This W7 project targets the FinTech **AI Money Coach** flow: upload a bank
statement CSV, classify transactions, show spending insights, and support
human review for uncertain categories. Read `architecture_context.md`,
`case_studies_urls.md`, `evidence_pack_domain_b.md`,
`docs/W7/W7_learner_guide.md`, and `docs/W7/starter_apps/budgetbot/` before
changing product flow. The blueprint and starter backend describe different
endpoints and review behavior; define the active API contract before wiring
screens.

For UI work, prioritize shadcn/ui primitives and blocks from the official
[Registry Directory](https://ui.shadcn.com/docs/directory) over handcrafted
UI. Search with `bunx --bun shadcn@latest search @shadcn -q "dashboard"` and
review third-party registry code before installation.

## Build, Test, and Development Commands

- `bun install`: install workspace dependencies from `bun.lock`.
- `bun run dev`: start development tasks through Turbo, including the Next.js
  app with Turbopack.
- `bun run build`: produce the Next.js production build.
- `bun run lint`: run ESLint across participating workspaces.
- `bun run typecheck`: check TypeScript without emitting files.
- `bun run format`: format workspace TypeScript and TSX files with Prettier.

## Coding Style & Naming Conventions

Use TypeScript and React function components. Prettier enforces 2-space
indentation, double quotes, no semicolons, and sorted Tailwind utilities. Run
lint and format before submitting changes. Use PascalCase for exported React
components and kebab-case filenames such as `theme-provider.tsx`. Prefer
aliases: `@/` for web-local modules and `@workspace/ui/*` for shared UI.

## Testing Guidelines

No application test suite is currently configured. Validate changes with
`bun run lint`, `bun run typecheck`, and `bun run build`. When introducing a
runner, add its root script and use a consistent colocated or `tests/` layout.

## Commit & Pull Request Guidelines

History begins with `feat: initial commit`; use prefixes such as `feat:`,
`fix:`, `docs:`, or `chore:` with an imperative summary. Pull requests should
explain the change, list validation, link issues, and include screenshots for
visual changes.
