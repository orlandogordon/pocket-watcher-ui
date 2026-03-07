# 03 — Enable Account Change on Transaction Edit

## Background

Backend item 3.4 added `account_uuid` support on `PUT /transactions/{uuid}`. The
backend now handles balance adjustments on both old and new accounts when a
transaction is moved. The frontend currently disables the account field on edit.

## Current Code

### `src/components/transactions/TransactionFormDialog.tsx`

Line 176 — Account `<Select>` has `disabled={isEdit}`:
```tsx
<Select onValueChange={field.onChange} value={field.value} disabled={isEdit}>
```

Lines 190-192 — Helper text shown during edit:
```tsx
{isEdit && (
  <p className="text-xs text-muted-foreground">Account cannot be changed after creation.</p>
)}
```

## Changes Required

### 1. `src/components/transactions/TransactionFormDialog.tsx`

- **Line 176:** Remove `disabled={isEdit}` from the Account `<Select>`.
- **Lines 190-192:** Delete the helper text paragraph.

No other changes needed — `account_uuid` is already included in the `TransactionCreate`
payload (line 130) and sent on both create and update paths.

## Verify

- Edit a transaction -> account dropdown is enabled
- Change the account -> save -> transaction moves to new account
- Old account balance adjusted, new account balance adjusted
- Creating a new transaction still works as before

## Estimated Scope

2 lines changed in 1 file.
