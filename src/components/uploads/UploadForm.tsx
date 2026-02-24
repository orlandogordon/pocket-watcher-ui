import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { useAccounts } from '@/hooks/useAccounts';
import { useUploadStatement } from '@/hooks/useStatementUpload';
import { INSTITUTIONS, INSTITUTION_LABELS } from '@/types/uploads';
import type { PreviewResponse } from '@/types/uploads';

const schema = z.object({
  institution: z.enum(INSTITUTIONS, { required_error: 'Select an institution' }),
  account_uuid: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface UploadFormProps {
  onPreviewReady: (preview: PreviewResponse) => void;
}

export function UploadForm({ onPreviewReady }: UploadFormProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const { data: accounts } = useAccounts();
  const upload = useUploadStatement();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { institution: undefined, account_uuid: '' },
  });

  async function onSubmit(values: FormValues) {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setFileError('Please select a file');
      return;
    }
    setFileError(null);

    const formData = new FormData();
    formData.append('institution', values.institution);
    formData.append('file', file);
    if (values.account_uuid) {
      formData.append('account_uuid', values.account_uuid);
    }

    try {
      const result = await upload.mutateAsync(formData);
      onPreviewReady(result);
    } catch {
      // error displayed below
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Upload Statement</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Import transactions from a bank or brokerage statement (PDF or CSV).
        </p>
      </div>

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
            name="institution"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Institution</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select institution" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {INSTITUTIONS.map((inst) => (
                      <SelectItem key={inst} value={inst}>
                        {INSTITUTION_LABELS[inst]}
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
            name="account_uuid"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account (optional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Auto-detect" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(accounts ?? []).map((acc) => (
                      <SelectItem key={acc.uuid} value={acc.uuid}>
                        {acc.account_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-1">
            <label className="text-sm font-medium leading-none">Statement File</label>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.pdf"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm file:border-0 file:bg-transparent file:text-sm file:font-medium cursor-pointer"
              onChange={() => setFileError(null)}
            />
            {fileError && <p className="text-sm text-destructive">{fileError}</p>}
          </div>

          {upload.error && (
            <p className="text-sm text-destructive">{upload.error.message}</p>
          )}

          <Button type="submit" disabled={upload.isPending} className="w-full">
            <Upload className="h-4 w-4 mr-2" />
            {upload.isPending ? 'Uploading...' : 'Upload & Preview'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
