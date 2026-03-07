# 01 — Snapshot Cost Basis on SELL Transactions

## Goal

Enable the frontend to color SELL transactions green/red based on whether the
sale was profitable relative to the average cost basis at the time of the sale.

## Problem

`average_cost_basis` on the holding reflects the **current** average, not what it
was when a given SELL occurred. If the user buys at different prices over time,
the average shifts after each BUY, making retrospective profit/loss calculations
inaccurate.

## Changes Required

### 1. Schema — new column on `investment_transactions`

Add `cost_basis_at_sale: Decimal | None` (nullable, only populated for SELL
transactions).

### 2. Holding rebuild logic (`crud_investment.py`)

In the SELL branch (~line 137), before subtracting quantity, snapshot the current
average cost basis onto the transaction:

```python
elif txn_type == InvestmentTransactionType.SELL:
    if not symbol or symbol not in holdings_map:
        continue
    holding = holdings_map[symbol]
    qty = txn.quantity or Decimal('0')
    txn.cost_basis_at_sale = holding.average_cost_basis  # <-- new
    holding.quantity -= qty
    txn.holding_id = holding.holding_id
```

### 3. Response model (`models/investment.py`)

Add `cost_basis_at_sale: Optional[Decimal] = None` to
`InvestmentTransactionResponse` (inherited via `InvestmentTransactionBase` or
added directly on the response model).

### 4. Migration

Add the column with `ALTER TABLE` or via Alembic. Existing SELL transactions
will have `NULL` until the next holding rebuild populates them.

## Frontend Usage

Once available, the frontend can compare `price_per_share` vs
`cost_basis_at_sale` on SELL rows:

- `price_per_share > cost_basis_at_sale` → green (profitable sale)
- `price_per_share < cost_basis_at_sale` → red (loss)
- `cost_basis_at_sale` is null → neutral (no color)

## Estimated Scope

- 1 new DB column
- ~3 lines in holding rebuild logic
- 1 field added to response model
