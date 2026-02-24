# Backend Improvement Notes

## Parser / Data Consistency

### Inconsistent amount sign convention across institution parsers
- The API spec defines `amount` as negative for expenses and positive for income.
- AMEX transactions are correctly stored with negative amounts for `PURCHASE` type.
- Checking account (TD Bank) transactions are stored with positive amounts for `PURCHASE`
  type — violating the convention and causing them to display as green income in the UI.
- **Requirement:** Audit all institution parsers (CSV + PDF) and enforce a consistent rule:
  - Expense types (`PURCHASE`, `WITHDRAWAL`, `FEE`) → always negative
  - Income types (`DEPOSIT`, `CREDIT`, `INTEREST`) → always positive
  - `TRANSFER` → sign determined by direction (debit = negative, credit = positive)
- This is purely a backend/parser fix. The frontend correctly colors by sign and requires
  no changes once amounts are stored consistently.

## Data Model / API

### `institution_name` on `TransactionResponse` — likely redundant
- `Transaction` has its own `institution_name` field, but every transaction already belongs
  to an `Account` which has `institution_name`.
- In practice these will always be the same value (or the transaction one is left null).
- **Recommendation:** Remove `institution_name` from the transaction table/response and derive
  it from the linked account when needed. This avoids stale/inconsistent data if the account's
  institution is ever updated.

### `subcategory_uuid` vs `category_uuid` — two-level hierarchy already on `Category`
- Categories are already hierarchical (parent → children). Using both `category_uuid` and
  `subcategory_uuid` on a transaction duplicates the hierarchy in a less flexible way.
- **Recommendation:** Consider storing only one `category_uuid` (pointing to the leaf category)
  and deriving the parent from the category tree. Or document why both fields are needed.

## Endpoint Improvements

### `POST /uploads/preview/{id}/reject-item` — reject a unique (non-duplicate) ready-to-import item
- `POST /uploads/preview/{id}/review-duplicate` returns 404 for items with `source: 'unique'`
  because it only handles items that went through the duplicate review flow.
- Users need a way to exclude individual unique transactions from the import before confirming.
- **Requirement:** Add an endpoint (e.g. `POST /uploads/preview/{id}/reject-item` with body
  `{ "temp_id": "..." }`) that moves a unique ready-to-import item to a rejected/skipped state.
  Should return the full updated `PreviewResponse` like the other preview mutation endpoints.
- **Frontend note:** Once available, wire up the reject (X) button in `ReadyToImportTable` for
  `source === 'unique'` items. Currently the button is hidden for those items. Update
  `useStatementUpload.ts` to add a `useRejectUniqueItem(sessionId)` hook calling the new endpoint.

### Bulk state-transition endpoints for preview items
- Currently every state change (approve, reject, undo_reject, reject-item) requires one API
  call per item. When the user bulk-selects many rows and clicks a bulk action, the frontend
  fires N sequential requests, which is slow and can cause race conditions.
- **Requirement:** Add bulk variants of the preview mutation endpoints, e.g.:
  - `POST /uploads/preview/{id}/bulk-review-duplicate` with body
    `{ "items": [{ "temp_id": "...", "action": "approve|reject|undo_reject" }] }`
  - `POST /uploads/preview/{id}/bulk-reject-item` with body
    `{ "temp_ids": ["...", "..."] }`
  Both should process all items atomically and return the full updated `PreviewResponse`.
- **Frontend note:** Once available, update `useStatementUpload.ts` with bulk mutation hooks
  and call them from `PendingReviewTable` and `ReadyToImportTable` bulk action footers instead
  of looping over individual calls.

### `GET /uploads/previews` — list active preview sessions for the current user
- There is currently no way to retrieve in-progress upload preview sessions after navigating
  away from the uploads page. The session ID is only held in frontend local state and is lost
  on refresh or navigation.
- **Requirement:** Add `GET /uploads/previews` returning all unexpired Redis-backed preview
  sessions for the current user (user_id=1), e.g.:
  ```json
  [
    {
      "preview_session_id": "abc123",
      "institution": "tdbank",
      "expires_at": "2026-02-23T18:00:00Z",
      "summary": { "total_parsed": 42, "pending_review": 5, "ready_to_import": 37, "rejected": 0, "can_confirm": false }
    }
  ]
  ```
- **Frontend note:** Once available, the uploads page upload form can display a "Resume
  session" list above the upload form, fetching this endpoint on mount. Each entry would
  link directly into the preview step for that session ID.

### `GET /budgets/` — per-category `spent_amount` is always `null`
- With `?include_spending=true`, the top-level `total_spent` is calculated correctly (e.g.
  `"416.49"`), but `budget_categories[n].spent_amount`, `remaining_amount`, and
  `percentage_used` are all returned as `null` for every category.
- **Requirement:** The per-category spending aggregation needs to be fixed so that
  `spent_amount` is populated for each `BudgetCategoryResponse` by summing transactions
  whose `category_uuid` matches and whose `transaction_date` falls within the budget's
  `start_date`–`end_date` range.
- The frontend dashboard reads `spent_amount` per category to render progress bars — it will
  work correctly once this is fixed (null is already handled as $0.00 in the UI).



### HTTP status codes — all endpoints return 200
- All endpoints currently return `200 OK` regardless of the operation.
- **Requirement:** Follow REST conventions:
  - `POST` (create) → `201 Created`
  - `PUT` / `PATCH` (update) → `200 OK` ✓ (this one is fine)
  - `DELETE` → `204 No Content`
- The frontend's `apiFetch` only checks `res.ok` (2xx range) so this won't break anything,
  but correct status codes improve API clarity and tooling compatibility.

### `PUT /transactions/{uuid}` — `null` values for optional fields are ignored on update
- Sending `null` for `subcategory_uuid` (and likely `category_uuid`) in a PUT request does
  not clear the field — the API returns the unchanged value in the response.
- **Requirement:** The API should treat an explicit `null` as "clear this field", distinct
  from omitting the field entirely (which should leave it unchanged).
- This is already handled correctly on the frontend: the payload sends `null` when the user
  clears a field. No frontend changes needed once the backend is fixed.

### `PUT /transactions/{uuid}` — `account_uuid` is ignored on update
- The API silently ignores `account_uuid` in PUT requests — the transaction always keeps
  its original account regardless of what is sent in the payload.
- **Requirement:** Either support changing `account_uuid` on update, or return a 400 if a
  different `account_uuid` is sent so the client knows it was rejected.
- **Frontend reminder:** Once supported, remove the `disabled={isEdit}` prop and the
  helper text from the Account field in `TransactionFormDialog.tsx`.

### `GET /transactions/` — multi-category and multi-subcategory filtering
- Currently only accepts a single `category_uuid` and single `subcategory_uuid` query param.
- **Requirement:** Support multiple values for both (OR logic), e.g.
  `?category_uuid=abc&category_uuid=def&subcategory_uuid=xyz`.
- **Frontend reminder:** Once supported, replace the single-select category/subcategory
  dropdowns in `TransactionsPage.tsx` with multi-select inputs. Keep the behaviour where
  deselecting a category also removes its subcategories from the active filters.

### `GET /transactions/` — multi-tag filtering
- Currently only accepts a single `tag_uuid` query param.
- **Requirement:** Support multiple `tag_uuid` values (OR logic) so users can filter by any
  combination of tags, e.g. `?tag_uuid=abc&tag_uuid=def`.
- **Frontend reminder:** Once this is supported, add a multi-select tag filter to
  `TransactionsPage.tsx` (fetch tags via `GET /tags/`, render as a multi-select chip input,
  pass each selected uuid as a separate `tag_uuid` param).

### `GET /transactions/stats` should accept same filter params as `GET /transactions/`
- Currently assumed to mirror the list filters — verify this is implemented and consistent.

### `GET /accounts/summary` response shape
- The frontend guide documents this as returning `{ uuid, name, type, balance }` but
  `AccountResponse` uses `account_name` not `name`. Clarify/standardize field naming.
