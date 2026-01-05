export type ColumnType =
  | "text"
  | "number"
  | "select"
  | "multi-select"
  | "formula"
  | "date";

export type CellValue = string | number | boolean | null | undefined | string[];

export interface ColumnSchema {
  id: string;
  name: string;
  type: ColumnType;
  options?: { id: string; label: string; color: string }[]; // For select & multi-select
  formula?: string; // For formula type, e.g., "price * quantity"
  width?: number;
}

export interface RowValues {
  id: string;
  [columnId: string]: CellValue;
}
