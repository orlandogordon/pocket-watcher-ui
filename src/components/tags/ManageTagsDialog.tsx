import { useState } from 'react';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useTransaction } from '@/hooks/useTransactions';
import { useAddTagToTransaction, useRemoveTagFromTransaction } from '@/hooks/useTags';
import type { TagResponse } from '@/types/transactions';

interface ManageTagsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: string | null;
  allTags: TagResponse[];
}

export function ManageTagsDialog({
  open,
  onOpenChange,
  transactionId,
  allTags,
}: ManageTagsDialogProps) {
  const [selectedTagId, setSelectedTagId] = useState<string>('');

  const { data: transaction, isLoading } = useTransaction(transactionId);
  const addTag = useAddTagToTransaction();
  const removeTag = useRemoveTagFromTransaction();

  const currentTagIds = new Set((transaction?.tags ?? []).map((t) => t.id));
  const availableTags = allTags.filter((t) => !currentTagIds.has(t.id));

  function handleAdd() {
    if (!transactionId || !selectedTagId) return;
    addTag.mutate(
      { transaction_uuid: transactionId, tag_uuid: selectedTagId },
      { onSuccess: () => setSelectedTagId('') },
    );
  }

  function handleRemove(tagId: string) {
    if (!transactionId) return;
    removeTag.mutate({ transaction_uuid: transactionId, tag_uuid: tagId });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Manage Tags</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground truncate" title={transaction?.description}>
            {transaction?.description}
          </p>

          {/* Current tags */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Current tags</p>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (transaction?.tags ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No tags assigned.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {(transaction?.tags ?? []).map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.tag_name}
                    <button
                      type="button"
                      onClick={() => handleRemove(tag.id)}
                      disabled={removeTag.isPending}
                      className="ml-0.5 rounded-full hover:opacity-75 cursor-pointer disabled:opacity-50"
                      aria-label={`Remove ${tag.tag_name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Add tag */}
          {availableTags.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Add a tag</p>
              <div className="flex items-center gap-2">
                <Select value={selectedTagId} onValueChange={setSelectedTagId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select tag..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTags.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        <span className="flex items-center gap-1.5">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: t.color }}
                          />
                          {t.tag_name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  size="sm"
                  disabled={!selectedTagId || addTag.isPending}
                  onClick={handleAdd}
                >
                  {addTag.isPending ? 'Adding...' : 'Add'}
                </Button>
              </div>
              {addTag.error && (
                <p className="text-sm text-destructive mt-1">{addTag.error.message}</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
