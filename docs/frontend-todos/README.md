# Frontend TODOs

## Open Items

Based on completed backend todos (Phases 1-5) and existing gaps:

| # | Item | Backend Source | Size |
|---|------|---------------|------|
| 13 | Verify: snapshot recalc on delete (no frontend change expected) | Backend 03 | Small |
| 14 | Verify: amortization category inheritance (no frontend change expected) | Backend 05 | Small |
| 15 | Investment sale profit/loss display | Backend 01 (cost basis snapshot) | Small |
| 16 | Snapshot edit dialog | Backend 02 (edit snapshot on review) | Medium |
| 19 | Budget template system | Backend 08 (budget redesign) | Large |
| 20 | Monthly average analytics page | Backend 09 (analytics endpoint) | Medium-Large |

### Recommended Execution Order

```
Phase A — Investment & Snapshot improvements (15, 16)
  Independent of each other, medium effort.

Phase B — Budget template rebuild (19)
  Largest item — full rebuild of budget UI. Do this when ready for a focused session.

Phase C — Analytics page (20)
  New page, no existing UI to replace. Good standalone task.
```

## Completed Items

| # | Item | Commit |
|---|------|--------|
| 01 | Remove frontend plan date sync | `9ec62a9` |
| 02 | Multi-select transaction filters (categories, subcategories, tags) | `fd1433a` |
| 03 | Enable account change on transaction edit | `9ec62a9` |
| 04 | Bulk preview actions | `483e92b` |
| 05 | Resume preview sessions | `483e92b` |
| 06 | Bulk month creation | `a422bfe` |
| 07 | Remove holding CRUD UI | `9ec62a9` |
| 08 | Dismiss snapshot review | `a422bfe` |
| 09 | Split category UI | `7ed9cd2` |
| 10 | Amortization UI | `7ed9cd2` |
| 11 | Amount sign coloring audit | `9ec62a9` |
| 12 | Transaction relationships UI | `7982135` |
| 17 | Enable amortization for all transaction types | `pending` |
| 18 | Type cleanup: remove split notes & SPLITS relationship type | `pending` |
