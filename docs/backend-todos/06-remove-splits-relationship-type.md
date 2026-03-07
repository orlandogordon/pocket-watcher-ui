# 06 — Remove SPLITS Relationship Type

## Background

The `SPLITS` relationship type was intended to link child transactions back to a
parent transaction they were split from. In practice this use case is fully
covered by the existing split category allocations feature
(`split_allocations` on a single transaction), making the relationship type
redundant. It adds unnecessary complexity without a clear real-world scenario.

## Changes Required

1. **Remove `SPLITS` from the `RelationshipType` enum** in the backend models.
2. **Add a migration** to drop any existing `SPLITS` relationships from the
   database (if any exist).
3. **Update validation** — the relationship creation endpoint should reject
   `SPLITS` as an invalid type.
4. **Update any tests** that reference the `SPLITS` type.

## Notes

- The frontend has already removed `SPLITS` from the create form options.
- The frontend types still include `SPLITS` in the union for backwards
  compatibility with any existing data, but it can be removed once the backend
  migration is complete.
