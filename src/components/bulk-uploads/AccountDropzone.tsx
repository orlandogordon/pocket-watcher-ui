import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccountDropzoneProps {
  disabled?: boolean;
  onFiles: (files: File[]) => void;
}

/**
 * Drag-drop / click zone. The user picks all files for an account in one
 * gesture; the parent's upload queue transmits them one request at a time.
 */
export function AccountDropzone({ disabled, onFiles }: AccountDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    onFiles(Array.from(list));
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        if (disabled) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        if (disabled) return;
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        'flex flex-col items-center justify-center gap-1 rounded-md border border-dashed px-4 py-6 text-center text-sm transition-colors',
        disabled
          ? 'cursor-not-allowed opacity-50'
          : 'cursor-pointer hover:border-primary/60 hover:bg-accent/40',
        dragging && !disabled && 'border-primary bg-accent/60',
      )}
    >
      <Upload className="h-5 w-5 text-muted-foreground" />
      <span className="font-medium">
        {disabled ? 'Select an institution first' : 'Drop statements or click to browse'}
      </span>
      <span className="text-xs text-muted-foreground">PDF or CSV · up to 25 MB each</span>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".csv,.pdf"
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = ''; // allow re-selecting the same file
        }}
      />
    </div>
  );
}
