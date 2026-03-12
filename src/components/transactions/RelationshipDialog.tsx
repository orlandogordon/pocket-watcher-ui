import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  useTransactionRelationships,
  useCreateRelationship,
  useUpdateRelationship,
  useDeleteRelationship,
  useTransaction,
} from '@/hooks/useTransactions';
import { formatCurrency } from '@/lib/format';
import { TransactionSearchSelect } from './TransactionSearchSelect';
import type { TransactionResponse, TransactionRelationshipResponse } from '@/types/transactions';
import {
  ABSORBING_RELATIONSHIP_TYPES,
  RELATIONSHIP_TYPE_LABELS,
  type RelationshipType,
} from '@/types/transactions';

const RELATIONSHIP_TYPES: RelationshipType[] = ['REFUNDS', 'OFFSETS', 'REVERSES', 'FEES_FOR'];

const REVERSE_DIRECTION_LABELS: Record<RelationshipType, string> = {
  REFUNDS: 'Refunded by',
  OFFSETS: 'Offset by',
  REVERSES: 'Reversed by',
  FEES_FOR: 'Has fee',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: TransactionResponse | null;
}

export function RelationshipDialog({ open, onOpenChange, transaction }: Props) {
  const uuid = open && transaction ? transaction.id : null;
  const { data: relationships, isLoading } = useTransactionRelationships(uuid);
  const createMut = useCreateRelationship();
  const updateMut = useUpdateRelationship();
  const deleteMut = useDeleteRelationship();

  const [showForm, setShowForm] = useState(false);
  const [relType, setRelType] = useState<RelationshipType>('REFUNDS');
  const [direction, setDirection] = useState<'from' | 'to'>('from');
  const [targetUuid, setTargetUuid] = useState<string | null>(null);
  const [targetTx, setTargetTx] = useState<TransactionResponse | undefined>();
  const [amountAllocated, setAmountAllocated] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const [editingRel, setEditingRel] = useState<TransactionRelationshipResponse | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editError, setEditError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<TransactionRelationshipResponse | null>(null);

  const isAbsorbing = ABSORBING_RELATIONSHIP_TYPES.has(relType);

  // The "from" transaction is the one being absorbed (the refund/credit).
  // Its full amount is the default allocation.
  function getDefaultAllocation() {
    const fromTx = direction === 'from' ? transaction : targetTx;
    if (!fromTx) return '';
    return String(Math.abs(parseFloat(fromTx.amount)));
  }

  function resetForm() {
    setTargetUuid(null);
    setTargetTx(undefined);
    setRelType('REFUNDS');
    setDirection('from');
    setAmountAllocated('');
    setNotes('');
    setError('');
  }

  async function handleCreate() {
    if (!transaction || !targetUuid) return;
    setError('');
    // direction === 'from': current is from, target is to (default)
    // direction === 'to': current is to, target is from (reversed)
    const fromUuid = direction === 'from' ? transaction.id : targetUuid;
    const toUuid = direction === 'from' ? targetUuid : transaction.id;
    try {
      await createMut.mutateAsync({
        uuid: fromUuid,
        data: {
          to_transaction_uuid: toUuid,
          relationship_type: relType,
          amount_allocated: isAbsorbing && amountAllocated ? amountAllocated : undefined,
          notes: notes || undefined,
        },
      });
      resetForm();
      setShowForm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create relationship');
    }
  }

  function startEdit(rel: TransactionRelationshipResponse) {
    setEditingRel(rel);
    setEditAmount(rel.amount_allocated ?? '');
    setEditNotes(rel.notes ?? '');
    setEditError('');
  }

  async function handleUpdate() {
    if (!editingRel) return;
    setEditError('');
    try {
      await updateMut.mutateAsync({
        relationshipUuid: editingRel.id,
        data: {
          amount_allocated: editAmount || null,
          notes: editNotes || null,
        },
      });
      setEditingRel(null);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Failed to update');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteMut.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => {
        if (!o) { resetForm(); setShowForm(false); setEditingRel(null); }
        onOpenChange(o);
      }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transaction Relationships</DialogTitle>
            {transaction && (
              <DialogDescription className="truncate">
                {transaction.description} &mdash; {formatCurrency(transaction.amount)}
              </DialogDescription>
            )}
          </DialogHeader>

          {/* Existing relationships */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Linked Transactions</h3>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : !relationships?.length ? (
              <p className="text-sm text-muted-foreground">No linked transactions</p>
            ) : (
              <div className="space-y-2">
                {relationships.map((rel) => (
                  <RelationshipRow
                    key={rel.id}
                    rel={rel}
                    currentUuid={transaction!.id}
                    isEditing={editingRel?.id === rel.id}
                    editAmount={editAmount}
                    editNotes={editNotes}
                    editError={editError}
                    onEditAmountChange={setEditAmount}
                    onEditNotesChange={setEditNotes}
                    onStartEdit={() => startEdit(rel)}
                    onCancelEdit={() => setEditingRel(null)}
                    onSaveEdit={handleUpdate}
                    isSaving={updateMut.isPending}
                    onDelete={() => setDeleteTarget(rel)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Create form toggle */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? <ChevronUp className="mr-1 h-3.5 w-3.5" /> : <ChevronDown className="mr-1 h-3.5 w-3.5" />}
            {showForm ? 'Hide' : 'Link Transaction'}
          </Button>

          {showForm && (
            <div className="space-y-3 rounded-md border p-3">
              <div className="space-y-1.5">
                <Label>Target Transaction</Label>
                <TransactionSearchSelect
                  value={targetUuid}
                  onChange={(uuid, tx) => {
                    setTargetUuid(uuid);
                    setTargetTx(tx);
                    if (tx && isAbsorbing) {
                      const fromTx = direction === 'from' ? transaction : tx;
                      if (fromTx) setAmountAllocated(String(Math.abs(parseFloat(fromTx.amount))));
                    }
                  }}
                  excludeUuid={transaction?.id}
                  placeholder="Search for the original transaction..."
                />
              </div>

              <div className="space-y-1.5">
                <Label>Relationship Type</Label>
                <Select value={relType} onValueChange={(v) => {
                  const type = v as RelationshipType;
                  setRelType(type);
                  if (ABSORBING_RELATIONSHIP_TYPES.has(type)) {
                    const fromTx = direction === 'from' ? transaction : targetTx;
                    if (fromTx) setAmountAllocated(String(Math.abs(parseFloat(fromTx.amount))));
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIP_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {RELATIONSHIP_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Direction</Label>
                <Select value={direction} onValueChange={(v) => {
                  const dir = v as 'from' | 'to';
                  setDirection(dir);
                  if (isAbsorbing) {
                    const fromTx = dir === 'from' ? transaction : targetTx;
                    if (fromTx) setAmountAllocated(String(Math.abs(parseFloat(fromTx.amount))));
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="from">
                      This transaction {RELATIONSHIP_TYPE_LABELS[relType].toLowerCase()}...
                    </SelectItem>
                    <SelectItem value="to">
                      This transaction is {REVERSE_DIRECTION_LABELS[relType].toLowerCase()}...
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isAbsorbing && (
                <>
                  <div className="space-y-1.5">
                    <Label>Amount Allocated</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={amountAllocated}
                      onChange={(e) => setAmountAllocated(e.target.value)}
                      placeholder="Amount being refunded/offset"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {direction === 'from'
                      ? 'This transaction (the refund/credit) will be linked TO the original purchase.'
                      : 'The selected transaction (the refund/credit) will be linked TO this transaction (the original).'}
                    {' '}The allocated amount reduces the original's budget impact.
                  </p>
                </>
              )}

              <div className="space-y-1.5">
                <Label>Notes (optional)</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes..."
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button
                size="sm"
                className="w-full"
                disabled={!targetUuid || createMut.isPending}
                onClick={handleCreate}
              >
                {createMut.isPending ? 'Creating...' : 'Create Relationship'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Relationship</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the link between these transactions. Budget/stats will revert.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteMut.isPending}>
              {deleteMut.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// --- Sub-component for each relationship row ---

interface RelationshipRowProps {
  rel: TransactionRelationshipResponse;
  currentUuid: string;
  isEditing: boolean;
  editAmount: string;
  editNotes: string;
  editError: string;
  onEditAmountChange: (v: string) => void;
  onEditNotesChange: (v: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  isSaving: boolean;
  onDelete: () => void;
}

function RelationshipRow({
  rel, currentUuid, isEditing, editAmount, editNotes, editError,
  onEditAmountChange, onEditNotesChange, onStartEdit, onCancelEdit, onSaveEdit, isSaving, onDelete,
}: RelationshipRowProps) {
  const isFrom = rel.from_transaction_uuid === currentUuid;
  const linkedUuid = isFrom ? rel.to_transaction_uuid : rel.from_transaction_uuid;
  const { data: linkedTx } = useTransaction(linkedUuid);
  const isAbsorbing = ABSORBING_RELATIONSHIP_TYPES.has(rel.relationship_type);

  const directionLabel = isFrom
    ? `This ${RELATIONSHIP_TYPE_LABELS[rel.relationship_type].toLowerCase()}...`
    : REVERSE_DIRECTION_LABELS[rel.relationship_type];

  return (
    <div className="rounded-md border p-2 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Badge variant="secondary" className={isAbsorbing ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}>
            {RELATIONSHIP_TYPE_LABELS[rel.relationship_type]}
          </Badge>
          <span className="text-xs text-muted-foreground">{directionLabel}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onStartEdit}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={onDelete}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {linkedTx ? (
        <p className="text-sm truncate">
          <span className="font-medium">{linkedTx.description}</span>
          <span className="ml-2 text-muted-foreground">
            {format(parseISO(linkedTx.transaction_date), 'MMM d, yyyy')}
          </span>
          <span className="ml-2">{formatCurrency(linkedTx.amount)}</span>
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">Loading linked transaction...</p>
      )}

      {isAbsorbing && rel.amount_allocated && !isEditing && (
        <p className="text-xs text-muted-foreground">
          Allocated: {formatCurrency(rel.amount_allocated)}
        </p>
      )}
      {rel.notes && !isEditing && (
        <p className="text-xs text-muted-foreground">Note: {rel.notes}</p>
      )}

      {isEditing && (
        <div className="space-y-2 pt-1 border-t">
          {isAbsorbing && (
            <div className="space-y-1">
              <Label className="text-xs">Amount Allocated</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={editAmount}
                onChange={(e) => onEditAmountChange(e.target.value)}
                className="h-8"
              />
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs">Notes</Label>
            <Input
              value={editNotes}
              onChange={(e) => onEditNotesChange(e.target.value)}
              className="h-8"
              placeholder="Optional notes..."
            />
          </div>
          {editError && <p className="text-xs text-destructive">{editError}</p>}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-7" onClick={onCancelEdit}>Cancel</Button>
            <Button size="sm" className="h-7" onClick={onSaveEdit} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
