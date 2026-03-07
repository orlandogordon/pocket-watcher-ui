import * as React from 'react';
import { ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface MultiSelectOption {
  value: string;
  label: string;
  color?: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const selected = new Set(value);

  function toggle(optionValue: string) {
    const next = new Set(selected);
    if (next.has(optionValue)) {
      next.delete(optionValue);
    } else {
      next.add(optionValue);
    }
    onChange(Array.from(next));
  }

  const selectedLabels = options.filter((o) => selected.has(o.value));

  let triggerLabel: React.ReactNode;
  if (selectedLabels.length === 0) {
    triggerLabel = <span className="text-muted-foreground">{placeholder}</span>;
  } else if (selectedLabels.length <= 2) {
    triggerLabel = (
      <span className="flex items-center gap-1 truncate">
        {selectedLabels.map((o) => (
          <Badge key={o.value} variant="secondary" className="text-xs px-1.5 py-0">
            {o.color && (
              <span
                className="inline-block h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: o.color }}
              />
            )}
            {o.label}
          </Badge>
        ))}
      </span>
    );
  } else {
    triggerLabel = (
      <Badge variant="secondary" className="text-xs">
        {selectedLabels.length} selected
      </Badge>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'justify-between font-normal h-9',
            !value.length && 'text-muted-foreground',
            className,
          )}
        >
          {triggerLabel}
          <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        {value.length > 0 && (
          <button
            type="button"
            className="flex w-full items-center gap-1.5 border-b px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onChange([])}
          >
            <X className="h-3 w-3" />
            Clear all
          </button>
        )}
        <div className="max-h-60 overflow-y-auto p-1">
          {options.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">No options</p>
          ) : (
            options.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
              >
                <Checkbox
                  checked={selected.has(option.value)}
                  onCheckedChange={() => toggle(option.value)}
                />
                {option.color && (
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: option.color }}
                  />
                )}
                {option.label}
              </label>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
