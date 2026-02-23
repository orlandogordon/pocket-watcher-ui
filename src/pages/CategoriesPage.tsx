import { useState } from 'react';
import { useCategories } from '@/hooks/useCategories';
import { CategoryFormDialog } from '@/components/categories/CategoryFormDialog';
import { DeleteCategoryDialog } from '@/components/categories/DeleteCategoryDialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Plus } from 'lucide-react';
import type { CategoryResponse } from '@/types/categories';

export function CategoriesPage() {
  const { data: categories, isLoading, isError } = useCategories();

  const [formOpen, setFormOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<CategoryResponse | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<CategoryResponse | null>(null);

  const topLevel = categories?.filter((c) => !c.parent_category_uuid) ?? [];

  // Build map: parent id → children[]
  const childrenByParent = new Map<string, CategoryResponse[]>();
  for (const cat of categories ?? []) {
    if (cat.parent_category_uuid) {
      const list = childrenByParent.get(cat.parent_category_uuid) ?? [];
      list.push(cat);
      childrenByParent.set(cat.parent_category_uuid, list);
    }
  }

  // Build ordered rows: parent then its children, then orphaned children last
  const rows: Array<{ cat: CategoryResponse; isChild: boolean }> = [];
  const seen = new Set<string>();
  for (const parent of topLevel) {
    rows.push({ cat: parent, isChild: false });
    seen.add(parent.id);
    for (const child of childrenByParent.get(parent.id) ?? []) {
      rows.push({ cat: child, isChild: true });
      seen.add(child.id);
    }
  }
  // orphaned children (parent was deleted)
  for (const cat of categories ?? []) {
    if (!seen.has(cat.id)) {
      rows.push({ cat, isChild: true });
    }
  }

  function openCreate() {
    setEditCategory(undefined);
    setFormOpen(true);
  }

  function openEdit(cat: CategoryResponse) {
    setEditCategory(cat);
    setFormOpen(true);
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Categories</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Hierarchical labels used to organize transactions and budgets.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          Add Category
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading categories...</p>
      ) : isError ? (
        <p className="text-sm text-destructive">
          Failed to load categories. Make sure the API is running at{' '}
          <code className="font-mono">http://localhost:8000</code>.
        </p>
      ) : !rows.length ? (
        <p className="text-sm text-muted-foreground">
          No categories yet. Add one to get started.
        </p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Level</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ cat, isChild }) => (
                <TableRow key={cat.id}>
                  <TableCell className={isChild ? 'pl-8' : 'font-medium'}>
                    {isChild ? (
                      <span className="text-muted-foreground mr-1.5">↳</span>
                    ) : null}
                    {cat.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant={isChild ? 'outline' : 'secondary'}>
                      {isChild ? 'Sub-category' : 'Category'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => openEdit(cat)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(cat)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        category={editCategory}
        topLevelCategories={topLevel}
      />
      <DeleteCategoryDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        category={deleteTarget}
      />
    </div>
  );
}
