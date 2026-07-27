# Local Benchmark Smoke

The benchmark smoke is a lightweight regression check for the local OmniFocus
query path. It is not a public latency SLA.

Run:

```bash
npm run benchmark:smoke
```

The command builds the project and measures:

- overdue and flagged counts;
- compact planned-today filtering;
- Inbox;
- seven-day Forecast;
- Inbox task-tree expansion to depth two.

Output contains numeric summaries only:

- success state;
- elapsed milliseconds;
- result count;
- UTF-8 response bytes.

It does not print or persist task names, IDs, notes, tags, dates, or other
personal OmniFocus content. Run it on the same machine and database when using
the numbers as a regression comparison.
