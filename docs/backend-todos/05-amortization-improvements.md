# 05 — Amortization Improvements

## 1. Inherit category from parent transaction

**Current behavior:** `PUT /transactions/{uuid}/amortization` requires `category_uuid` /
`subcategory_uuid` or falls back to the transaction's category at creation time. The category
is then stored independently on each amortization schedule entry.

**Desired behavior:** The amortization schedule should NOT store its own category. Instead,
`GET /transactions/{uuid}/amortization` and `calculate_category_spending()` should resolve the
category from the parent transaction at read time. This means:

- Changing a transaction's category automatically updates its amortization for budget calculations
- No `category_uuid` / `subcategory_uuid` fields needed on the PUT endpoint
- The `category_uuid` / `category_name` / `subcategory_uuid` / `subcategory_name` fields on
  `AmortizationAllocation` in the response should be populated from the parent transaction
- The 400 error "Transaction has no category and no category_uuid was provided" goes away —
  uncategorized transactions can still be amortized (they just won't contribute to any
  budget category until categorized)

**Frontend note:** The frontend already removed category fields from the amortization dialog
and no longer sends `category_uuid` / `subcategory_uuid` in the PUT payload.

## 2. Disallow amortization on split transactions (mutual exclusion)

Split transactions distribute their amount across multiple categories. Amortization spreads a
single amount across multiple months. Combining both would require a matrix of category x month
allocations, which adds significant complexity for a niche edge case.

**Recommendation:** The two features should be mutually exclusive:

- `PUT /transactions/{uuid}/amortization` should return 400 if the transaction has active
  split allocations
- `PUT /transactions/{uuid}/splits` should return 400 if the transaction has an active
  amortization schedule

**Frontend note:** The frontend already hides the Amortize button for transactions that have
splits. Hiding the Split button for amortized transactions is deferred since detecting
amortization per-row requires an extra query.
