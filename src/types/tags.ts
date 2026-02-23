import type { TagResponse } from './transactions';

export type { TagResponse };

export interface TagCreate {
  tag_name: string;
  color: string;
}

export interface TagStats {
  tag_uuid: string;
  tag_name: string;
  color: string;
  transaction_count: number;
  total_amount: string;
}
