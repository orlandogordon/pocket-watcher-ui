# 12 — Transaction Relationships UI

## Background

Backend Tier 5.1 implements relationship-aware financial calculations. Transactions
can be linked (e.g. a refund linked to the original purchase) and absorbing
relationship types (REFUNDS, OFFSETS, REVERSES) automatically adjust budget spending
and stats. The backend endpoints exist but the frontend has zero awareness of
relationships.

### Backend Endpoints

```
GET    /transactions/{uuid}/relationships         -> List relationships (from or to side)
POST   /transactions/{uuid}/relationships         -> Create relationship
PUT    /transactions/relationships/{uuid}         -> Update relationship
DELETE /transactions/relationships/{uuid}         -> Delete relationship
```

### Relationship Types

- `REFUNDS` — credit/refund linked to original purchase (absorbing)
- `OFFSETS` — partial offset (absorbing)
- `REVERSES` — full reversal (absorbing)
- `FEES_FOR` — fee linked to a transaction (informational)
- `SPLITS` — split from a parent transaction (informational)

### Key Semantics

- **Direction:** `from` = the credit/refund/fee transaction, `to` = the original purchase
- **`amount_allocated`:** For absorbing types, the amount being refunded/offset (not
  the full credit amount, for partial refunds). The API rejects allocations that
  exceed the original transaction's amount.
- **Budget/stats impact:** Absorbing relationships reduce the original transaction's
  contribution to budgets by `amount_allocated`. The refund transaction is excluded
  entirely (absorbed). This happens server-side — no frontend math needed.
- **Informational types** (FEES_FOR, SPLITS) have no budget impact — they're purely
  for the user to see connections between transactions.

### Response Shape (verified against live API)

```ts
interface TransactionRelationshipResponse {
  id: string;                    // relationship UUID
  from_transaction_uuid: string;
  to_transaction_uuid: string;
  relationship_type: string;     // REFUNDS | OFFSETS | SPLITS | FEES_FOR | REVERSES
  amount_allocated: string | null;
  notes: string | null;
  created_at: string;
}
```

> **Note:** The response does NOT embed transaction descriptions/dates/amounts —
> only UUIDs. The frontend must resolve linked transaction details separately
> (fetch by UUID or match from cached data).

### HTTP Status Codes (verified)

- `GET  /transactions/{uuid}/relationships` → 200, returns `[]` if none
- `POST /transactions/{uuid}/relationships` → 201
- `PUT  /transactions/relationships/{uuid}` → 200
- `DELETE /transactions/relationships/{uuid}` → 204 (no body)
- Over-allocation → 400 with `{ "detail": "Total refund/offset amount ($X) would exceed..." }`
- Duplicate constraint → 400 with `{ "detail": "Relationship creation failed due to database constraint" }`

---

## Changes Required

### 1. Add types in `src/types/transactions.ts`

```ts
export type RelationshipType = 'REFUNDS' | 'OFFSETS' | 'SPLITS' | 'FEES_FOR' | 'REVERSES';

export const ABSORBING_RELATIONSHIP_TYPES: Set<RelationshipType> =
  new Set(['REFUNDS', 'OFFSETS', 'REVERSES']);

export const RELATIONSHIP_TYPE_LABELS: Record<RelationshipType, string> = {
  REFUNDS: 'Refunds',
  OFFSETS: 'Offsets',
  REVERSES: 'Reverses',
  FEES_FOR: 'Fee for',
  SPLITS: 'Split of',
};

export interface TransactionRelationshipResponse {
  id: string;
  from_transaction_uuid: string;
  to_transaction_uuid: string;
  relationship_type: RelationshipType;
  amount_allocated: string | null;
  notes: string | null;
  created_at: string;
}

export interface TransactionRelationshipCreate {
  to_transaction_uuid: string;
  relationship_type: RelationshipType;
  amount_allocated?: string;
  notes?: string;
}

export interface TransactionRelationshipUpdate {
  relationship_type?: RelationshipType;
  amount_allocated?: string | null;
  notes?: string | null;
}
```

### 2. Add hooks in `src/hooks/useTransactions.ts`

```ts
export function useTransactionRelationships(uuid: string | null) {
  return useQuery({
    queryKey: ['transactions', uuid, 'relationships'],
    queryFn: () => apiFetch<TransactionRelationshipResponse[]>(
      `/transactions/${uuid}/relationships`
    ),
    enabled: !!uuid,
  });
}

export function useCreateRelationship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ uuid, data }: {
      uuid: string;
      data: TransactionRelationshipCreate;
    }) =>
      apiFetch<TransactionRelationshipResponse>(
        `/transactions/${uuid}/relationships`,
        { method: 'POST', body: JSON.stringify(data) },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useUpdateRelationship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ relationshipUuid, data }: {
      relationshipUuid: string;
      data: TransactionRelationshipUpdate;
    }) =>
      apiFetch<TransactionRelationshipResponse>(
        `/transactions/relationships/${relationshipUuid}`,
        { method: 'PUT', body: JSON.stringify(data) },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useDeleteRelationship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (relationshipUuid: string) =>
      apiFetch<void>(
        `/transactions/relationships/${relationshipUuid}`,
        { method: 'DELETE' },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
```

### 3. Create `RelationshipDialog` component

**File:** `src/components/transactions/RelationshipDialog.tsx` (new)

A dialog opened from a transaction's action buttons. Two sections:

**a) Existing relationships list:**
- Fetches `GET /transactions/{uuid}/relationships` on open
- The response only contains UUIDs for linked transactions — resolve details by
  fetching each linked transaction via `GET /transactions/{uuid}` (or batch from
  cached query data). Since relationship counts are typically low (1-3), individual
  fetches are fine.
- Shows a table/list of linked transactions with:
  - Direction indicator: "This refunds..." or "Refunded by..."
  - Linked transaction description, date, amount (resolved from fetch)
  - Relationship type badge (color-coded: absorbing = amber, informational = blue)
  - `amount_allocated` for absorbing types
  - Notes (if any)
  - Edit button (inline or sub-dialog) to update `amount_allocated` / notes
  - Delete button with confirmation
- Empty state: "No linked transactions"

**b) "Link Transaction" form (collapsible or inline):**
- **Transaction search/select:** A searchable dropdown or combobox to pick the
  target transaction. Options:
  - Simple approach: `<Select>` with recent transactions from the same account
    (re-use existing `useTransactions` with a filter)
  - Better UX: A searchable combobox using the `description_search` filter param
    to search across all transactions. Could use a debounced text input that
    queries `GET /transactions/?description_search=...&limit=10`.
- **Relationship type:** `<Select>` with the 5 types, each with a label
- **Amount allocated:** Optional number input. Show only for absorbing types.
  Pre-fill with the `from` transaction's amount (full refund default).
  Validate: cannot exceed the `to` transaction's amount (API also enforces this).
- **Notes:** Optional text input
- **Direction guidance:** When an absorbing type is selected, show helper text:
  "This transaction (the refund/credit) will be linked TO the original purchase."
  The `from` side is always the current transaction; the user picks the `to` side.
- Submit calls `POST /transactions/{uuid}/relationships`

### 4. Add "Link" action button to `TransactionsPage.tsx`

Add a link/chain icon button to the actions column:

```tsx
import { Link2 } from 'lucide-react';

// State
const [relationshipTarget, setRelationshipTarget] = useState<TransactionResponse | null>(null);

// In action buttons (after Tag button, before Edit):
<Button
  size="icon"
  variant="ghost"
  className="h-7 w-7"
  title="Manage relationships"
  onClick={() => setRelationshipTarget(tx)}
>
  <Link2 className="h-3.5 w-3.5" />
</Button>

// Dialog render:
<RelationshipDialog
  open={!!relationshipTarget}
  onOpenChange={(open) => { if (!open) setRelationshipTarget(null); }}
  transaction={relationshipTarget}
/>
```

### 5. Optional: Relationship indicator in the transaction table

Show a small icon/badge on transactions that have relationships. Two approaches:

**Option A (deferred — no extra data):** Skip for now. The user discovers
relationships by clicking the link icon.

**Option B (if backend adds a field):** If `TransactionResponse` later includes
a `has_relationships: boolean` or `relationship_count: number` field, show a
small chain icon or badge next to the description. This avoids N+1 queries.

Recommend Option A for the initial implementation.

### 6. Transaction search sub-component

**File:** `src/components/transactions/TransactionSearchSelect.tsx` (new)

A reusable searchable transaction picker. Uses a debounced text input that queries
`GET /transactions/?description_search=...&limit=10` and displays results in a
dropdown/popover. Each result shows: description, date, amount, account name.

This component is used inside `RelationshipDialog` for selecting the target
transaction. It could also be useful for other features later.

Props:
```ts
interface TransactionSearchSelectProps {
  value: string | null;              // selected transaction UUID
  onChange: (uuid: string | null) => void;
  excludeUuid?: string;             // exclude the current transaction
  placeholder?: string;
}
```

---

## Implementation Order

1. **Types** — Add all types to `transactions.ts`
2. **Hooks** — Add all 4 hooks to `useTransactions.ts`
3. **TransactionSearchSelect** — Build the search component first (needed by dialog)
4. **RelationshipDialog** — Build the main dialog (list + create + edit + delete)
5. **TransactionsPage integration** — Add action button + dialog wiring
6. **Polish** — Error handling (400 for over-allocation), loading states, empty states

## Verify

- Open relationship dialog on a transaction with no relationships -> shows empty state
- Search and link a transaction -> relationship appears in the list
- Create a REFUNDS relationship with amount_allocated -> budget/stats update
  (verify via budget detail page or stats cards)
- Edit amount_allocated on existing relationship -> saves correctly
- Delete a relationship -> removed from list, budget/stats revert
- API rejects over-allocation (amount_allocated > original amount) -> error shown
- FEES_FOR / SPLITS types don't show amount_allocated field
- Direction is correct: current transaction is `from`, selected is `to`

## Files Created

- `src/components/transactions/RelationshipDialog.tsx`
- `src/components/transactions/TransactionSearchSelect.tsx`

## Files Changed

- `src/types/transactions.ts` — relationship types + create/update interfaces
- `src/hooks/useTransactions.ts` — 4 relationship hooks
- `src/pages/TransactionsPage.tsx` — link action button + dialog state

## Estimated Scope

- ~50 lines for types
- ~50 lines for hooks
- ~80 lines for `TransactionSearchSelect`
- ~200 lines for `RelationshipDialog`
- ~15 lines for `TransactionsPage` integration
- **Total: ~400 lines** across 5 files (2 new, 3 modified)
