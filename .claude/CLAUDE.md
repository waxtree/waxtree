# Waxtree — development rules

These rules apply to **every** code change. Read them in full before writing.

## Stack

- **Framework**: React + TypeScript
- **Styling**: Tailwind CSS (v4, already configured with `@tailwindcss/vite`)
- **Routing**: React Router
- **State**: Zustand

## Required rules

| # | Topic | File |
|---|-------|------|
| 1 | React + Tailwind (no plain HTML/CSS) | [rules/01-react-tailwind.md](rules/01-react-tailwind.md) |
| 2 | Arrow functions / const (no `function`) | [rules/02-const-functions.md](rules/02-const-functions.md) |
| 3 | Review loop ×3 | [rules/03-review-loop.md](rules/03-review-loop.md) |
| 4 | One component per file, folders by route/action | [rules/04-component-structure.md](rules/04-component-structure.md) |

## Workflow

1. Read all rules in `.claude/rules/`
2. Write code following the conventions
3. Run the review loop ×3 (see rule 03)
4. Only after the third pass, consider the work complete

## Current folder structure

```
src/
  components/   # reusable components
  pages/        # route-bound components
  lib/          # logic, hooks, utilities
  api/          # API calls
```

When adding new components, follow this organization and rule 04.
