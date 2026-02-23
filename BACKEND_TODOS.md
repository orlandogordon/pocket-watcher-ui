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
