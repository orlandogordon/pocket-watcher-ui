import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, ArrowLeft, Star } from 'lucide-react';
import { useTemplates } from '@/hooks/useBudgets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TemplateFormDialog } from '@/components/budgets/TemplateFormDialog';
import { DeleteTemplateDialog } from '@/components/budgets/DeleteTemplateDialog';
import type { BudgetTemplateResponse } from '@/types/budgets';
import { formatCurrency } from '@/lib/format';

export function BudgetTemplatesPage() {
  const { data: templates, isLoading } = useTemplates();
  const [formOpen, setFormOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<BudgetTemplateResponse | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<BudgetTemplateResponse | null>(null);

  function openCreate() {
    setEditTemplate(undefined);
    setFormOpen(true);
  }

  function openEdit(t: BudgetTemplateResponse) {
    setEditTemplate(t);
    setFormOpen(true);
  }

  const sorted = [...(templates ?? [])].sort((a, b) => {
    if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
    return a.template_name.localeCompare(b.template_name);
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/budgets">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Budget Templates</h1>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}

      {!isLoading && sorted.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No templates yet. Create one to get started with budgeting.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map((t) => {
          const totalAllocated = t.categories.reduce(
            (sum, c) => sum + parseFloat(c.allocated_amount),
            0,
          );

          return (
            <Card key={t.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{t.template_name}</CardTitle>
                    {t.is_default && (
                      <Badge variant="secondary" className="text-xs">
                        <Star className="h-3 w-3 mr-1" />
                        Default
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(t)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(t)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>{t.categories.length} categories</p>
                  <p className="font-medium text-foreground">
                    Total: {formatCurrency(String(totalAllocated))}
                  </p>
                </div>
                {t.categories.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {t.categories.slice(0, 4).map((cat) => (
                      <div key={cat.id} className="flex justify-between text-xs">
                        <span className="text-muted-foreground truncate mr-2">
                          {cat.subcategory
                            ? `${cat.category.name} > ${cat.subcategory.name}`
                            : cat.category.name}
                        </span>
                        <span className="tabular-nums shrink-0">
                          {formatCurrency(cat.allocated_amount)}
                        </span>
                      </div>
                    ))}
                    {t.categories.length > 4 && (
                      <p className="text-xs text-muted-foreground">
                        +{t.categories.length - 4} more
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <TemplateFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        template={editTemplate}
      />
      <DeleteTemplateDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        template={deleteTarget}
      />
    </div>
  );
}
