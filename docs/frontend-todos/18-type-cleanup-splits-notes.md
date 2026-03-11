# 18 — Type Cleanup: Remove Split Notes & SPLITS Relationship Type

## Background

Two small backend cleanups that need corresponding frontend type updates:

1. **Backend todo 04** — Removed `notes` column from `transaction_split_allocations`.
   The API no longer accepts or returns `notes` on split allocations.

2. **Backend todo 06** — Removed `SPLITS` from the `RelationshipType` enum. The API
   now rejects `SPLITS` as a relationship type. The frontend types still include it
   for backwards compatibility (per the backend todo note), but it can now be removed.

## Changes Required

### 1. Remove `notes` from split allocation types

```ts
// BEFORE:
export interface SplitAllocationResponse {
  id: string;
  category_uuid: string;
  category_name: string;
  subcategory_uuid: string | null;
  subcategory_name: string | null;
  amount: string;
  notes: string | null;  // REMOVE
}

export interface SplitAllocationCreate {
  category_uuid: string;
  subcategory_uuid?: string | null;
  amount: string;
  notes?: string;  // REMOVE
}
```

Also remove any notes input field from the `SplitCategoryDialog` component if one
exists (the dialog may have been built without it since the field was already unused).

### 2. Remove `SPLITS` from relationship types

```ts
// BEFORE:
export type RelationshipType = 'REFUNDS' | 'OFFSETS' | 'SPLITS' | 'FEES_FOR' | 'REVERSES';

// AFTER:
export type RelationshipType = 'REFUNDS' | 'OFFSETS' | 'FEES_FOR' | 'REVERSES';
```

Remove `SPLITS` from:
- `RelationshipType` union
- `RELATIONSHIP_TYPE_LABELS` mapping
- Any dropdown options in the relationship dialog
- `ABSORBING_RELATIONSHIP_TYPES` (SPLITS wasn't absorbing, but check anyway)

## Verify

- Split dialog does not show a notes field
- Split allocation responses parse without errors (no `notes` field expected)
- Relationship dialog does not offer SPLITS as an option
- Creating relationships with other types still works

## Files Changed

- Transaction types file — remove `notes` from split types, `SPLITS` from relationship types
- Split category dialog — remove notes input if present
- Relationship dialog — remove SPLITS from type options if present

## Estimated Scope

Small — ~10 lines removed across 2-3 files.
