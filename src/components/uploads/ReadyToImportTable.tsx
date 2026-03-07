import { useState, useCallback } from 'react';
import { Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format';
import { useCategories, buildCategoryMap, getCategoryLabel } from '@/hooks/useCategories';
import { useTags } from '@/hooks/useTags';
import type { PreviewItem, EditedData } from '@/types/uploads';

function effective(item: PreviewItem, field: keyof EditedData): unknown {
  const edited = (item.edited_data ?? {}) as EditedData;
  return edited[field] ?? (item.parsed_data as Record<string, unknown>)[field];
}

function effectiveStr(item: PreviewItem, field: keyof EditedData): string {
  return (effective(item, field) as string) ?? '';
}

interface ReadyToImportTableProps {
  items: PreviewItem[];
  onMoveToReview: (tempId: string) => void;
  onBulkMoveToReview: (tempIds: string[]) => void;
  isPending: boolean;
  pendingTempId: string | null;
}

export function ReadyToImportTable({ items, onMoveToReview, onBulkMoveToReview, isPending, pendingTempId }: ReadyToImportTableProps) {
  const { data: categoriesData = [] } = useCategories();
  const categoryMap = buildCategoryMap(categoriesData);
  const { data: allTags = [] } = useTags();
  const tagMap = new Map(allTags.map((t) => [t.id, t]));

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((tempId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tempId)) next.delete(tempId); else next.add(tempId);
      return next;
    });
  }, []);

  const allSelected = items.length > 0 && items.every((i) => selected.has(i.temp_id));
  const someSelected = selected.size > 0 && !allSelected;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(items.map((i) => i.temp_id)));
  }

  function handleBulkMoveToReview() {
    onBulkMoveToReview([...selected]);
    setSelected(new Set());
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No items ready to import yet.
      </p>
    );
  }

  return (
    <div className="rounded-md border">
      <div className="max-h-[420px] overflow-x-auto overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                  onCheckedChange={toggleAll}
                  disabled={isPending || items.length === 0}
                />
              </TableHead>
              <TableHead className="w-28">Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-28 text-right">Amount</TableHead>
              <TableHead className="w-32">Type</TableHead>
              <TableHead className="w-40">Category</TableHead>
              <TableHead className="w-40">Subcategory</TableHead>
              <TableHead className="w-36">Tags</TableHead>
              <TableHead className="w-36">Comments</TableHead>
              <TableHead className="w-28">Source</TableHead>
              <TableHead className="w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const edited = (item.edited_data ?? {}) as EditedData;
              const desc = effectiveStr(item, 'description');
              const amt = effectiveStr(item, 'amount');
              const type = effectiveStr(item, 'transaction_type');
              const categoryUuid = edited.category_uuid ?? '';
              const subcategoryUuid = edited.subcategory_uuid ?? '';
              const tagUuids = Array.isArray(edited.tag_uuids) ? edited.tag_uuids : [];
              const comments = edited.comments ?? '';
              const isThisRowPending = pendingTempId === item.temp_id;
              const disabled = isPending || isThisRowPending;

              return (
                <TableRow key={item.temp_id}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(item.temp_id)}
                      onCheckedChange={() => toggle(item.temp_id)}
                      disabled={disabled}
                    />
                  </TableCell>
                  <TableCell className="text-sm">{item.parsed_data.transaction_date}</TableCell>
                  <TableCell className="text-sm">{desc}</TableCell>
                  <TableCell className="text-sm text-right">
                    {formatCurrency(parseFloat(amt))}
                  </TableCell>
                  <TableCell className="text-xs">{type}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {categoryUuid ? (
                      <span className="text-foreground">{getCategoryLabel(categoryUuid, categoryMap)}</span>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {subcategoryUuid ? (
                      <span className="text-foreground">{getCategoryLabel(subcategoryUuid, categoryMap)}</span>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    {tagUuids.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {tagUuids.map((uuid) => {
                          const tag = tagMap.get(uuid);
                          if (!tag) return null;
                          return (
                            <span
                              key={uuid}
                              className="inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium text-white"
                              style={{ backgroundColor: tag.color }}
                            >
                              {tag.tag_name}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {comments || '—'}
                  </TableCell>
                  <TableCell>
                    {item.source === 'approved_duplicate' ? (
                      <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border-blue-200">
                        Approved
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        New
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={disabled}
                      onClick={() => onMoveToReview(item.temp_id)}
                      title="Move back to Needs Review"
                    >
                      <Undo2 className="h-3 w-3 mr-1" />
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {selected.size > 0 && (
        <div className="flex items-center gap-2 border-t bg-muted/40 px-4 py-2">
          <span className="text-xs text-muted-foreground mr-2">{selected.size} selected</span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={handleBulkMoveToReview}
            disabled={isPending}
          >
            <Undo2 className="h-3 w-3 mr-1" />
            Move to Review
          </Button>
        </div>
      )}
    </div>
  );
}
