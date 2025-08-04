/**
 * Receipt entity class representing a processed receipt record
 * Used for database storage and API responses
 */
export class Receipt {
  id: string;
  date: string;
  currency: string;
  vendor_name: string;
  receipt_items: Array<{ item_name: string; item_cost: number }>;
  tax: number;
  total: number;
  image_url: string;
}