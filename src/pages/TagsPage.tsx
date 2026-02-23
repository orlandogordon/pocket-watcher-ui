import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useTags, useTagStats } from '@/hooks/useTags';
import { TagFormDialog } from '@/components/tags/TagFormDialog';
import { DeleteTagDialog } from '@/components/tags/DeleteTagDialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/format';
import type { TagResponse } from '@/types/transactions';
import type { TagStats } from '@/types/tags';

export function TagsPage() {
  const { data: tags, isLoading, isError } = useTags();
  const { data: statsData } = useTagStats();

  const [formOpen, setFormOpen] = useState(false);
  const [editTag, setEditTag] = useState<TagResponse | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<TagResponse | null>(null);

  // Build a map of tag_uuid → TagStats for O(1) lookup
  const statsMap = new Map<string, TagStats>();
  for (const s of statsData ?? []) {
    statsMap.set(s.tag_uuid, s);
  }

  function openCreate() {
    setEditTag(undefined);
    setFormOpen(true);
  }

  function openEdit(tag: TagResponse) {
    setEditTag(tag);
    setFormOpen(true);
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Tags</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            User-defined labels for transactions.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          Add Tag
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading tags...</p>
      ) : isError ? (
        <p className="text-sm text-destructive">
          Failed to load tags. Make sure the API is running at{' '}
          <code className="font-mono">http://localhost:8000</code>.
        </p>
      ) : !tags?.length ? (
        <p className="text-sm text-muted-foreground">No tags yet. Add one to get started.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tag</TableHead>
                <TableHead className="text-right">Transactions</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tags.map((tag) => {
                const stats = statsMap.get(tag.id);
                return (
                  <TableRow key={tag.id}>
                    <TableCell>
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                        style={{ backgroundColor: tag.color }}
                      >
                        {tag.tag_name}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {stats?.transaction_count ?? 0}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {stats ? formatCurrency(stats.total_amount) : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => openEdit(tag)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(tag)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <TagFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        tag={editTag}
      />
      <DeleteTagDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        tag={deleteTarget}
      />
    </div>
  );
}
