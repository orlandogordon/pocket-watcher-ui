export interface CategoryResponse {
  id: string;
  name: string;
  parent_category_uuid?: string;
  children?: CategoryResponse[];
}
