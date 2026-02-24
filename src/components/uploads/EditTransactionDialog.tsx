import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCategories, buildCategoryMap, getCategoryLabel } from '@/hooks/useCategories';
import { useEditPreviewTransaction } from '@/hooks/useStatementUpload';
import type { PreviewItem, EditedData } from '@/types/uploads';

const TRANSACTION_TYPES = ['PURCHASE', 'WITHDRAWAL', 'FEE', 'DEPOSIT', 'CREDIT', 'INTEREST', 'TRANSFER'] as const;

const schema = z.object({
  description: z.string().optional(),
  amount: z.string().optional(),
  transaction_type: z
    .union([z.enum(TRANSACTION_TYPES), z.literal('')])
    .optional(),
  merchant_name: z.string().optional(),
  category_uuid: z.string().optional(),
  comments: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface EditTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: PreviewItem | null;
  sessionId: string;
}

export function EditTransactionDialog({ open, onOpenChange, item, sessionId }: EditTransactionDialogProps) {
  const { data: categories } = useCategories();
  const editMutation = useEditPreviewTransaction(sessionId);

  const categoryMap = buildCategoryMap(categories ?? []);
  const sortedCategories = [...(categories ?? [])].sort((a, b) => {
    return getCategoryLabel(a.id, categoryMap).localeCompare(getCategoryLabel(b.id, categoryMap));
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: '',
      amount: '',
      transaction_type: '',
      merchant_name: '',
      category_uuid: '',
      comments: '',
    },
  });

  useEffect(() => {
    if (open && item) {
      const edited = (item.edited_data ?? {}) as EditedData;
      form.reset({
        description: (edited.description ?? item.parsed_data.description) ?? '',
        amount: (edited.amount ?? item.parsed_data.amount) ?? '',
        transaction_type:
          ((edited.transaction_type ?? item.parsed_data.transaction_type) as FormValues['transaction_type']) ?? '',
        merchant_name: edited.merchant_name ?? '',
        category_uuid: edited.category_uuid ?? '',
        comments: edited.comments ?? '',
      });
    }
  }, [open, item, form]);

  async function onSubmit(values: FormValues) {
    if (!item) return;
    const editedData: Record<string, unknown> = {};
    if (values.description) editedData.description = values.description;
    if (values.amount) editedData.amount = values.amount;
    if (values.transaction_type) editedData.transaction_type = values.transaction_type;
    if (values.merchant_name) editedData.merchant_name = values.merchant_name;
    if (values.category_uuid) editedData.category_uuid = values.category_uuid;
    if (values.comments) editedData.comments = values.comments;

    editMutation.mutate(
      { temp_id: item.temp_id, edited_data: editedData },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit(onSubmit)();
            }}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Transaction description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="transaction_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TRANSACTION_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="merchant_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Merchant Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional merchant name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category_uuid"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="No category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sortedCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {getCategoryLabel(cat.id, categoryMap)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="comments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comments</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional notes" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {editMutation.error && (
              <p className="text-sm text-destructive">{editMutation.error.message}</p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editMutation.isPending}>
                {editMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
