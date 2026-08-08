# Rule 03 — Review loop ×3

## Required

After writing code, run **three consecutive review passes**.
In each pass, behave as if the code was written by a stranger
and you must review it from scratch.

## Procedure (repeat 3 times)

### Pass N (1, 2, 3)

1. **Read** all produced code as if you had never seen it before.
2. **Report** — write a brief report covering:
   - What the code does
   - Issues found (bugs, edge cases, naming, accessibility, performance)
   - Violations of rules in `.claude/rules/`
   - What you would improve
3. **Fix** every issue flagged in the report.
4. **Verify** that fixes did not introduce new problems.

Only after the **third pass** is the code considered ready.

## What to check in each pass

- [ ] Follows rule 01 (React + Tailwind, no plain HTML/CSS)
- [ ] Follows rule 02 (no `function`, only `const`)
- [ ] Follows rule 04 (one component per file, correct folders)
- [ ] TypeScript: correct types, no unnecessary `any`
- [ ] No dead code or unused imports
- [ ] Clear naming consistent with the rest of the project
- [ ] Simple logic, no over-engineering

## Report format (example)

```
### Review pass 1/3

**Summary**: [what the code does]

**Issues**:
- [issue 1]
- [issue 2]

**Fixes applied**:
- [fix 1]
- [fix 2]
```

Repeat until pass 3/3.
