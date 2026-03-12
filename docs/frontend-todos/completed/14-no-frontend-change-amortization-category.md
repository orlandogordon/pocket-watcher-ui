# 14 — Amortization Category Inheritance (No Frontend Change)

**Status:** No frontend work required

## Backend Change (Todo 05)

Amortization schedules no longer store their own `category_id`/`subcategory_id`. Those
columns were dropped entirely from `TransactionAmortizationScheduleDB`. Category is now
resolved at read time from the parent transaction. Budget spending calculations
(`calculate_category_spending`) filter by the parent transaction's category instead of the
schedule row's category.

## Why No Frontend Change

The frontend had already removed category fields from the amortization dialog and no longer
sends `category_uuid`/`subcategory_uuid` in the PUT payload (noted in the backend todo).
The response fields `category_uuid`/`category_name` are now `Optional` but the frontend
already handles null categories gracefully.
