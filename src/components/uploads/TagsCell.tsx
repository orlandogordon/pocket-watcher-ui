import { Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { TagResponse } from '@/types/transactions';

export function TagsCell({
  tagUuids, allTags, onToggle, disabled,
}: {
  tagUuids: string[];
  allTags: TagResponse[];
  onToggle: (uuid: string) => void;
  disabled: boolean;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs w-full justify-start font-normal"
          disabled={disabled}
        >
          <Tag className="h-3 w-3 mr-1 shrink-0" />
          {tagUuids.length === 0
            ? 'No tags'
            : tagUuids.length === 1
              ? (allTags.find((t) => t.id === tagUuids[0])?.tag_name ?? '1 tag')
              : `${tagUuids.length} tags`}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        {allTags.length === 0 ? (
          <p className="text-xs text-muted-foreground px-1">No tags available</p>
        ) : (
          <div className="space-y-1">
            {allTags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center gap-2 rounded px-1 py-0.5 cursor-pointer hover:bg-muted"
                onClick={() => onToggle(tag.id)}
              >
                <Checkbox
                  checked={tagUuids.includes(tag.id)}
                  onCheckedChange={() => onToggle(tag.id)}
                />
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="text-xs">{tag.tag_name}</span>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
