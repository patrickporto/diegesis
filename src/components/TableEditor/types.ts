export type ColumnType = "text" | "number" | "select" | "formula" | "date";

export type CellValue = string | number | boolean | null | undefined;

export interface ColumnSchema {
  id: string;
  name: string;
  type: ColumnType;
  options?: string[]; // For select type
  formula?: string; // For formula type, e.g., "price * quantity"
  width?: number;
}

export interface RowData {
  id: string;
  [columnId: string]: CellValue;
}

// Map of Column ID -> Value
export type RowValues = Record<string, CellValue>;
