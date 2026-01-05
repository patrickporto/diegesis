import * as formulajs from "@formulajs/formulajs";
import { compile } from "mathjs";

import { CellValue, ColumnSchema, RowValues } from "./types";

export class FormulaEngine {
  /**
   * Evaluate a formula for a given row.
   *
   * @param formula The formula string (e.g., "[Price] * [Quantity]")
   * @param rowValues Object containing values for the current row (keyed by column ID)
   * @param columns Schema definitions to map names to IDs
   * @returns The calculated result or an error message
   */
  static evaluate(
    formula: string,
    rowValues: RowValues,
    columns: ColumnSchema[]
  ): CellValue | string {
    if (!formula || !formula.trim()) return null;

    try {
      // 1. Create a scope with all FormulaJS functions
      // We wrap FLOOR and CEILING to have a default significance of 1,
      // which is a common expectation for "Excel-like" behavior.
      const scope: Record<string, unknown> = {
        ...(formulajs as unknown as Record<string, unknown>),
        FLOOR: (n: number, s = 1) =>
          (formulajs.FLOOR as (n: number, s: number) => number)(n, s),
        CEILING: (n: number, s = 1) =>
          (formulajs.CEILING as (n: number, s: number) => number)(n, s),
      };

      // 2. Pre-process formula to replace [Column Name] with safe variable names
      const varPrefix = "VAR_";
      let parsedFormula = formula;

      columns.forEach((col) => {
        const val = rowValues[col.id];
        const safeVarName = `${varPrefix}${col.id.replace(/-/g, "_")}`;

        // Add value to scope
        if (col.type === "number") {
          scope[safeVarName] = Number(val) || 0;
        } else if (col.type === "text") {
          scope[safeVarName] = String(val || "");
        } else if (col.type === "date") {
          scope[safeVarName] = val ? new Date(val as string).getTime() : 0;
        } else {
          scope[safeVarName] = val;
        }

        // Replace textual references: [Column Name] -> safeVarName
        const escapedName = col.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const pattern = new RegExp(`\\[${escapedName}\\]`, "gi");
        parsedFormula = parsedFormula.replace(pattern, safeVarName);
      });

      // 3. Evaluate
      const compiled = compile(parsedFormula);
      const result = compiled.evaluate(scope);

      return result as CellValue;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return `Error: ${error.message}`;
      }
      return "Unknown error";
    }
  }

  static getVariables(columns: ColumnSchema[]): string[] {
    return columns.map((c) => `[${c.name}]`);
  }
}
