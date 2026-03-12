# 15 — Investment Sale Profit/Loss Display

## Background

Backend todo 01 added `cost_basis_at_sale` (nullable decimal) to `InvestmentTransactionResponse`.
For SELL transactions, this field captures the average cost basis at the time of sale, enabling
profit/loss calculation without client-side math.

### Backend Endpoint

```
GET /investments/accounts/{account_uuid}/transactions
```

Response now includes:
```json
{
  "cost_basis_at_sale": "45.23"  // or null
}
```

## Current State

The frontend displays investment transactions but has no awareness of `cost_basis_at_sale`.
SELL transactions show price_per_share and quantity but no profit/loss indicator.

## Changes Required

### 1. Update types

Add `cost_basis_at_sale` to the investment transaction response type:

```ts
export interface InvestmentTransactionResponse {
  // ... existing fields
  cost_basis_at_sale: string | null;  // NEW
}
```

### 2. Color-code SELL transactions

On SELL transaction rows, compare `price_per_share` vs `cost_basis_at_sale`:

| Condition | Display |
|-----------|---------|
| `price_per_share > cost_basis_at_sale` | Green text/badge — profitable sale |
| `price_per_share < cost_basis_at_sale` | Red text/badge — sale at a loss |
| `price_per_share == cost_basis_at_sale` | Neutral — break-even |
| `cost_basis_at_sale` is null | Neutral/default — no cost basis data |

### 3. Show gain/loss amount per share

For SELL rows where `cost_basis_at_sale` is not null, display the per-share gain/loss:

```
gain_per_share = price_per_share - cost_basis_at_sale
total_gain = gain_per_share * quantity
```

This could appear as a tooltip, an extra column, or inline text like "+$2.15/share (+4.7%)".

### 4. Optional: Holdings rebuild prompt

If a user has existing SELL transactions with null `cost_basis_at_sale`, consider showing
a one-time prompt to trigger a holdings rebuild via `POST /investments/accounts/{uuid}/holdings/rebuild`
to backfill the data. This is low priority.

## Verify

- SELL transaction with cost_basis_at_sale > price_per_share shows red (loss)
- SELL transaction with cost_basis_at_sale < price_per_share shows green (profit)
- SELL transaction with null cost_basis_at_sale shows neutral
- BUY/DIVIDEND transactions are unaffected
- Values parse correctly from string decimals

## Files Changed

- Investment transaction type definition — add `cost_basis_at_sale` field
- Investment transactions table/list component — color-coding and gain/loss display

## Estimated Scope

Small — ~30 lines of type + display logic changes.
