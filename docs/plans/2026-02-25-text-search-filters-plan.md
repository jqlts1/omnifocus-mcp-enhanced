# Text Search Filters Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `nameContains`, `noteContains`, and `keyword` text search filters to `query_omnifocus` so users can find tasks/projects by name or note content.

**Architecture:** Three new optional string filters added to the existing `filters` object in `query_omnifocus`. Each generates a case-insensitive `.includes()` check in the OmniJS script. A new `escapeJXAString()` utility sanitizes all user-provided strings before injection into JXA templates.

**Tech Stack:** TypeScript, Zod, OmniJS (JavaScript for Automation), node:test

---

### Task 1: Add escapeJXAString utility and tests

**Files:**
- Modify: `src/tools/primitives/queryOmnifocus.ts` (add helper function at bottom)
- Create: `src/tools/definitions/textSearchFilters.test.ts`

**Step 1: Write the failing test**

Create `src/tools/definitions/textSearchFilters.test.ts`:

```typescript
import assert from 'node:assert/strict';
import test from 'node:test';
import { schema } from './queryOmnifocus.js';

// Schema validation tests for new text search filters

test('query_omnifocus schema accepts nameContains filter', () => {
  const parsed = schema.parse({
    entity: 'tasks',
    filters: { nameContains: 'compression' }
  }) as any;

  assert.equal(parsed.filters.nameContains, 'compression');
});

test('query_omnifocus schema accepts noteContains filter', () => {
  const parsed = schema.parse({
    entity: 'tasks',
    filters: { noteContains: 'session context' }
  }) as any;

  assert.equal(parsed.filters.noteContains, 'session context');
});

test('query_omnifocus schema accepts keyword filter', () => {
  const parsed = schema.parse({
    entity: 'tasks',
    filters: { keyword: 'GTD' }
  }) as any;

  assert.equal(parsed.filters.keyword, 'GTD');
});

test('query_omnifocus schema accepts all three text filters together', () => {
  const parsed = schema.parse({
    entity: 'projects',
    filters: { nameContains: 'work', noteContains: 'deadline', keyword: 'urgent' }
  }) as any;

  assert.equal(parsed.filters.nameContains, 'work');
  assert.equal(parsed.filters.noteContains, 'deadline');
  assert.equal(parsed.filters.keyword, 'urgent');
});

test('query_omnifocus schema accepts text filters combined with existing filters', () => {
  const parsed = schema.parse({
    entity: 'tasks',
    filters: { nameContains: 'review', flagged: true, status: ['Available'] }
  }) as any;

  assert.equal(parsed.filters.nameContains, 'review');
  assert.equal(parsed.filters.flagged, true);
  assert.deepEqual(parsed.filters.status, ['Available']);
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/yixuan.yhl/developers/claude-plugins/omnifocus-mcp-ultimate && npm run build && node --test dist/tools/definitions/textSearchFilters.test.js`

Expected: FAIL — `nameContains`, `noteContains`, `keyword` will be stripped by Zod (not in schema yet).

**Step 3: Add 3 filter fields to Zod schema in definition**

Modify `src/tools/definitions/queryOmnifocus.ts` — add inside the `filters: z.object({...})` block, after the `plannedOn` field (line 22):

```typescript
    nameContains: z.string().optional().describe("Search items by name. CASE-INSENSITIVE PARTIAL MATCHING - 'compress' matches 'Agent Session Compression', 'File Compressor', etc. Works for tasks, projects, and folders"),
    noteContains: z.string().optional().describe("Search items by note content. CASE-INSENSITIVE PARTIAL MATCHING. Works for tasks and projects"),
    keyword: z.string().optional().describe("Full-text search across name AND note. CASE-INSENSITIVE. Matches if EITHER name or note contains the keyword. Works for tasks and projects"),
```

Also update `formatFilters()` in the same file — add after the `plannedOn` line (around line 134):

```typescript
  if (filters.nameContains) parts.push(`name contains: "${filters.nameContains}"`);
  if (filters.noteContains) parts.push(`note contains: "${filters.noteContains}"`);
  if (filters.keyword) parts.push(`keyword: "${filters.keyword}"`);
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/yixuan.yhl/developers/claude-plugins/omnifocus-mcp-ultimate && npm run build && node --test dist/tools/definitions/textSearchFilters.test.js`

Expected: All 5 tests PASS.

**Step 5: Commit**

```bash
cd /Users/yixuan.yhl/developers/claude-plugins/omnifocus-mcp-ultimate
git add src/tools/definitions/queryOmnifocus.ts src/tools/definitions/textSearchFilters.test.ts
git commit -m "feat: add nameContains, noteContains, keyword to query_omnifocus schema"
```

---

### Task 2: Add escapeJXAString and filter conditions in primitive

**Files:**
- Modify: `src/tools/primitives/queryOmnifocus.ts`

**Step 1: Add 3 fields to QueryOmnifocusParams interface**

In `src/tools/primitives/queryOmnifocus.ts`, add to the `filters` interface (after `plannedOn?: number;` around line 19):

```typescript
    nameContains?: string;
    noteContains?: string;
    keyword?: string;
```

**Step 2: Add escapeJXAString helper function**

Add at the bottom of `src/tools/primitives/queryOmnifocus.ts` (after `generateFieldMapping`):

```typescript
function escapeJXAString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}
```

**Step 3: Add filter conditions in generateFilterConditions**

In `generateFilterConditions()`, add the following conditions.

For the `tasks` entity block (inside `if (entity === 'tasks')`, before the closing `}`):

```typescript
    if (filters.nameContains) {
      const escaped = escapeJXAString(filters.nameContains.toLowerCase());
      conditions.push(`if (!item.name || !item.name.toLowerCase().includes("${escaped}")) return false;`);
    }

    if (filters.noteContains) {
      const escaped = escapeJXAString(filters.noteContains.toLowerCase());
      conditions.push(`
        const noteStrForContains = item.note || "";
        if (!noteStrForContains.toLowerCase().includes("${escaped}")) return false;
      `);
    }

    if (filters.keyword) {
      const escaped = escapeJXAString(filters.keyword.toLowerCase());
      conditions.push(`
        const kwName = (item.name || "").toLowerCase();
        const kwNote = (item.note || "").toLowerCase();
        if (!kwName.includes("${escaped}") && !kwNote.includes("${escaped}")) return false;
      `);
    }
```

For the `projects` entity block (inside `if (entity === 'projects')`, before the closing `}`):

```typescript
    if (filters.nameContains) {
      const escaped = escapeJXAString(filters.nameContains.toLowerCase());
      conditions.push(`if (!item.name || !item.name.toLowerCase().includes("${escaped}")) return false;`);
    }

    if (filters.noteContains) {
      const escaped = escapeJXAString(filters.noteContains.toLowerCase());
      conditions.push(`
        const noteStrForContains = item.note || "";
        if (!noteStrForContains.toLowerCase().includes("${escaped}")) return false;
      `);
    }

    if (filters.keyword) {
      const escaped = escapeJXAString(filters.keyword.toLowerCase());
      conditions.push(`
        const kwName = (item.name || "").toLowerCase();
        const kwNote = (item.note || "").toLowerCase();
        if (!kwName.includes("${escaped}") && !kwNote.includes("${escaped}")) return false;
      `);
    }
```

Add a new `folders` entity block after `projects` (folders only support `nameContains`):

```typescript
  if (entity === 'folders') {
    if (filters.nameContains) {
      const escaped = escapeJXAString(filters.nameContains.toLowerCase());
      conditions.push(`if (!item.name || !item.name.toLowerCase().includes("${escaped}")) return false;`);
    }
  }
```

**Step 4: Harden existing projectName filter with escapeJXAString**

In `generateFilterConditions()`, update the existing `projectName` condition (around line 197-206) to use escaping:

Change:
```typescript
    if (filters.projectName) {
      conditions.push(`
        if (item.containingProject) {
          const projectName = item.containingProject.name.toLowerCase();
          if (!projectName.includes("${filters.projectName.toLowerCase()}")) return false;
        } else if ("${filters.projectName.toLowerCase()}" !== "inbox") {
          return false;
        }
      `);
    }
```

To:
```typescript
    if (filters.projectName) {
      const escaped = escapeJXAString(filters.projectName.toLowerCase());
      conditions.push(`
        if (item.containingProject) {
          const projectName = item.containingProject.name.toLowerCase();
          if (!projectName.includes("${escaped}")) return false;
        } else if ("${escaped}" !== "inbox") {
          return false;
        }
      `);
    }
```

**Step 5: Build and verify compilation**

Run: `cd /Users/yixuan.yhl/developers/claude-plugins/omnifocus-mcp-ultimate && npm run build`

Expected: Compiles with no errors.

**Step 6: Run schema tests to verify nothing broke**

Run: `cd /Users/yixuan.yhl/developers/claude-plugins/omnifocus-mcp-ultimate && node --test dist/tools/definitions/textSearchFilters.test.js && node --test dist/tools/definitions/plannedDateSchemas.test.js`

Expected: All tests PASS.

**Step 7: Commit**

```bash
cd /Users/yixuan.yhl/developers/claude-plugins/omnifocus-mcp-ultimate
git add src/tools/primitives/queryOmnifocus.ts
git commit -m "feat: implement text search filter conditions with JXA string escaping"
```

---

### Task 3: Live integration test and rebuild

**Files:**
- No new files — uses `dist/server.js` directly

**Step 1: Clean build**

Run: `cd /Users/yixuan.yhl/developers/claude-plugins/omnifocus-mcp-ultimate && rm -rf dist && npm run build`

Expected: Clean build with no errors.

**Step 2: Test nameContains via MCP tool call**

Use the `omnifocus` MCP server from Claude Code:
```
query_omnifocus(entity: "tasks", filters: { nameContains: "compression" }, fields: ["id", "name", "projectName"])
```

Expected: Returns tasks whose names contain "compression" (case-insensitive).

**Step 3: Test keyword via MCP tool call**

```
query_omnifocus(entity: "projects", filters: { keyword: "review" }, fields: ["id", "name", "note"])
```

Expected: Returns projects whose name OR note contains "review".

**Step 4: Test combined filters**

```
query_omnifocus(entity: "tasks", filters: { nameContains: "agent", status: ["Available"] }, fields: ["id", "name", "taskStatus"])
```

Expected: Returns only Available tasks whose name contains "agent".

**Step 5: Commit build artifacts are clean (no stale files)**

Verify: `ls dist/tools/definitions/textSearchFilters.test.js` exists.

**Step 6: Final commit if any fixes needed**

```bash
cd /Users/yixuan.yhl/developers/claude-plugins/omnifocus-mcp-ultimate
git add -A
git commit -m "fix: address integration test findings"
```

---

### Task 4: Push to remote

**Step 1: Push to feature branch**

```bash
cd /Users/yixuan.yhl/developers/claude-plugins/omnifocus-mcp-ultimate
git push origin feature/ultimate-merge
```

Expected: Push succeeds to `darrenyao/omnifocus-mcp-enhanced`.
