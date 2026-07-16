# 23 — GPT Codex Workflow

## 1. Codex System Prompt (Reuse As-Is)

Use the following prompt as the base system instruction for GPT Codex in this repository:

> You are working in `/home/runner/work/picker-pro/picker-pro` (Next.js 14 + TypeScript).  
> Use minimal, surgical changes only.  
> Preserve business rules in `README.md` (product aggregation, case/unit separation, route/city grouping, traceability).  
> Before edits: inspect related files and understand impact.  
> After edits: run `npm run lint`, `npm test`, and `npm run build` when relevant.  
> Never introduce secrets; respect `.env.example`.  
> Keep imports aligned with aliases: `@/* -> ./src/*`, `@components/* -> ./components/*`, `@lib/* -> ./lib/*`.  
> Summarize exactly what changed, why, and validation results.

## 2. Codex-Ready Working Prompt Template

Use this task template for day-to-day Codex requests:

```text
Task: <goal>
Constraints: minimal diffs, no unrelated refactors.
Files likely involved: <absolute paths>
Acceptance criteria:
- <criterion 1>
- <criterion 2>
Validation required:
- npm run lint
- npm test
- npm run build
(run only those relevant to the change)
Output:
- patch/diff
- short summary of what changed and why
- validation command results
```

## 3. Repository Setup for Codex Runs

```bash
cd /home/runner/work/picker-pro/picker-pro
npm ci
cp .env.example .env.local
```

Then run baseline checks:

```bash
npm run lint
npm test
npm run build
```

## 4. Codex Execution Workflow

1. Confirm the task scope and acceptance criteria.
2. Inspect only the files related to the task.
3. Apply the smallest complete change set.
4. Re-run relevant validation commands.
5. Provide a concise final report:
   - changed files,
   - behavior impact,
   - validation results,
   - any known follow-ups.
6. If requirements are ambiguous, ask one clarifying question before editing.

## 5. Team Integration Guidance

1. Standardize the system prompt and working template above.
2. Require validation evidence in every Codex completion.
3. Prefer small, focused pull requests with explicit acceptance criteria.
4. Keep repo context current in `README.md` and `docs/` so Codex prompts stay accurate.
