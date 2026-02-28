# AGENTS.md

## Cursor Cloud specific instructions

**Medieval Keep** is a client-side-only Phaser 3 + TypeScript RTS game. There is no backend, database, or external service.

### Services

| Service | Command | Port | Notes |
|---------|---------|------|-------|
| Vite dev server | `npm run dev` | 5173 | Pass `-- --open false` in headless environments to avoid launching a browser |

### Commands

- **Dev server**: `npm run dev`
- **Build** (TypeScript check + production bundle): `npm run build`
- **Preview production build**: `npm run preview` (port 4173)

No linter or test framework is configured in this project.

### Gotchas

- Vite config sets `open: true` by default, which tries to launch a browser. Use `npm run dev -- --open false` when running headlessly.
- The build produces a large chunk (>500 kB) from Phaser; this is expected and can be ignored.
