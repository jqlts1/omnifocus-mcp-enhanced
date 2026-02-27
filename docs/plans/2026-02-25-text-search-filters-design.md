# Text Search Filters for query_omnifocus

**Date:** 2026-02-25
**Status:** Approved

## Problem

`query_omnifocus` cannot search by task/project name or note content. Users must know the exact project name or use `dump_database` to find tasks by name — defeating the purpose of a targeted query tool.

## Solution

Add 3 text search filters to `query_omnifocus`:

| Filter | Purpose | Match Mode | Entities |
|--------|---------|------------|----------|
| `nameContains` | Search by item name | Case-insensitive partial | tasks, projects, folders |
| `noteContains` | Search by note content | Case-insensitive partial | tasks, projects |
| `keyword` | Full-text search name + note | Case-insensitive, OR (either field matches) | tasks, projects |

All 3 filters combine with existing filters via AND logic (consistent with current behavior).

## Implementation

### Files Changed

1. **`src/tools/definitions/queryOmnifocus.ts`**
   - Add `nameContains`, `noteContains`, `keyword` to Zod schema
   - Update `formatFilters()` to display new filters

2. **`src/tools/primitives/queryOmnifocus.ts`**
   - Add 3 fields to `QueryOmnifocusParams.filters` interface
   - Add `escapeJXAString()` helper to sanitize user input for JXA script injection
   - Add filter conditions in `generateFilterConditions()` for all 3 entity types
   - Apply `escapeJXAString()` to existing `projectName` filter as well (security hardening)

### Generated JXA Filter Logic

```javascript
// nameContains
if (!item.name || !item.name.toLowerCase().includes("search term")) return false;

// noteContains
const noteStr = item.note || "";
if (!noteStr.toLowerCase().includes("search term")) return false;

// keyword (OR across name + note)
const nameStr = (item.name || "").toLowerCase();
const noteStr = (item.note || "").toLowerCase();
if (!nameStr.includes("search term") && !noteStr.includes("search term")) return false;
```

### Security

Add `escapeJXAString()` to sanitize all user-provided strings before injection into JXA script templates. Escapes: `\`, `"`, newlines, carriage returns. Applied to all string filters including existing `projectName`.
