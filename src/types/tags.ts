import type { TagResponse } from './transactions';

export type { TagResponse };

export interface TagCreate {
  tag_name: string;
  color: string;
}

export interface TagStats {
  id: string;
  tag_name: string;
  color: string;
  transaction_count: number;
  total_amount: number;
  average_amount: number;
  most_recent_use: string | null;
}
