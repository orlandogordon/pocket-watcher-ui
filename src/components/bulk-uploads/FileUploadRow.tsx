import { CheckCircle2, AlertCircle, RotateCw, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { INSTITUTION_LABELS } from '@/types/uploads';
import type { QueueItem } from './useUploadQueue';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FileUploadRowProps {
  item: QueueItem;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
}

export function FileUploadRow({ item, onRetry, onRemove }: FileUploadRowProps) {
  const failed = item.status === 'error' || item.status === 'too_large';
  return (
    <div className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
      <div className="shrink-0">
        {item.status === 'done' ? (
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        ) : failed ? (
          <AlertCircle className="h-4 w-4 text-destructive" />
        ) : item.status === 'uploading' ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <span className="block h-4 w-4 rounded-full border" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-medium">{item.file.name}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatSize(item.file.size)}
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {item.accountName} · {INSTITUTION_LABELS[item.institution]}
        </p>

        {item.status === 'uploading' && (
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.round(item.progress * 100)}%` }}
            />
          </div>
        )}
        {failed && item.error && (
          <p className="mt-0.5 text-xs text-destructive">{item.error}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {failed && item.status !== 'too_large' && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => onRetry(item.id)}
            title="Retry"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </Button>
        )}
        {item.status !== 'done' && (
          <Button
            size="icon"
            variant="ghost"
            className={cn('h-7 w-7 text-muted-foreground hover:text-destructive')}
            onClick={() => onRemove(item.id)}
            title="Remove"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
