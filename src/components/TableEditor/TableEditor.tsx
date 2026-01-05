import { useEffect, useMemo, useState } from "react";
import { uuidv7 } from "uuidv7";
import * as Y from "yjs";

import { FormulaEngine } from "./FormulaEngine";
import { TableHeader } from "./TableHeader";
import { CellValue, ColumnSchema, ColumnType, RowValues } from "./types";

interface TableEditorProps {
  fileId: string;
  doc: Y.Doc;
}

export function TableEditor({ fileId, doc }: TableEditorProps) {
  // Yjs Structures
  const schemaArray = useMemo(
    () => doc.getArray<ColumnSchema>(`schema-${fileId}`),
    [doc, fileId]
  );
  const rowsArray = useMemo(
    () => doc.getArray<Y.Map<CellValue>>(`rows-${fileId}`),
    [doc, fileId]
  );

  // Local State
  const [columns, setColumns] = useState<ColumnSchema[]>([]);
  const [rows, setRows] = useState<RowValues[]>([]);

  // Observer for Schema
  useEffect(() => {
    const observer = () => {
      setColumns(schemaArray.toArray());
    };
    schemaArray.observe(observer);
    observer(); // Initial load

    // Initialize default columns if empty
    if (schemaArray.length === 0) {
      doc.transact(() => {
        schemaArray.push([
          { id: uuidv7(), name: "Name", type: "text" },
          { id: uuidv7(), name: "Tags", type: "select", options: ["A", "B"] },
        ]);
      });
    }

    return () => schemaArray.unobserve(observer);
  }, [schemaArray, doc]);

  // Observer for Rows
  useEffect(() => {
    const observer = () => {
      setRows(rowsArray.toArray().map((yMap) => yMap.toJSON() as RowValues));
    };
    rowsArray.observeDeep(observer);
    observer(); // Initial load

    return () => rowsArray.unobserve(observer);
  }, [rowsArray]);

  // Actions
  const addColumn = () => {
    doc.transact(() => {
      schemaArray.push([{ id: uuidv7(), name: "New Column", type: "text" }]);
    });
  };

  const updateColumn = (index: number, updates: Partial<ColumnSchema>) => {
    doc.transact(() => {
      const oldCol = schemaArray.get(index);
      schemaArray.delete(index, 1);
      schemaArray.insert(index, [{ ...oldCol, ...updates }]);
    });
  };

  const deleteColumn = (index: number) => {
    doc.transact(() => {
      schemaArray.delete(index, 1);
    });
  };

  const addRow = () => {
    doc.transact(() => {
      const newRowMap = new Y.Map();
      newRowMap.set("id", uuidv7());
      rowsArray.push([newRowMap]);
    });
  };

  const updateCell = (rowIndex: number, colId: string, value: CellValue) => {
    doc.transact(() => {
      const rowMap = rowsArray.get(rowIndex);
      rowMap.set(colId, value);
    });
  };

  const deleteRow = (rowIndex: number) => {
    doc.transact(() => {
      rowsArray.delete(rowIndex, 1);
    });
  };

  // Rendering Support
  const getCellValue = (row: RowValues, col: ColumnSchema) => {
    if (col.type === "formula") {
      return FormulaEngine.evaluate(col.formula || "", row, columns);
    }
    return row[col.id];
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      <div className="flex-1 overflow-auto pb-20">
        <div className="inline-block min-w-full align-middle">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-200">
                {columns.map((col, idx) => (
                  <th
                    key={col.id}
                    className={`text-left bg-white group border-r border-slate-100 last:border-r-0 ${
                      idx === 0
                        ? "sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
                        : ""
                    }`}
                    style={{ minWidth: 150, width: col.width }}
                  >
                    <TableHeader
                      column={col}
                      onUpdate={(updates) => updateColumn(idx, updates)}
                      onDelete={() => deleteColumn(idx)}
                      isFirst={idx === 0}
                    />
                  </th>
                ))}
                <th className="w-10 px-1 py-1 border-b border-slate-200">
                  <button
                    onClick={addColumn}
                    className="p-1 hover:bg-slate-100 rounded text-slate-400"
                    title="Add Column"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rIdx) => (
                <tr
                  key={row.id || rIdx}
                  className="group/row hover:bg-slate-50"
                >
                  {columns.map((col, cIdx) => (
                    <td
                      key={col.id}
                      className={`border-b border-r border-slate-100 last:border-r-0 p-0 relative ${
                        cIdx === 0
                          ? "sticky left-0 bg-white group-hover/row:bg-slate-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
                          : ""
                      }`}
                    >
                      <div className="h-full w-full min-h-[34px] flex items-center">
                        {col.type === "formula" ? (
                          <div className="px-3 py-1.5 text-sm text-slate-600 w-full truncate cursor-default">
                            {String(getCellValue(row, col) ?? "")}
                          </div>
                        ) : (
                          <CellInput
                            value={row[col.id]}
                            type={col.type}
                            onChange={(val) => updateCell(rIdx, col.id, val)}
                          />
                        )}
                      </div>
                    </td>
                  ))}
                  <td className="border-b border-slate-100 px-1 text-center">
                    <button
                      onClick={() => deleteRow(rIdx)}
                      className="opacity-0 group-hover/row:opacity-100 text-slate-300 hover:text-red-500 transition-all p-1"
                      title="Delete Row"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="px-3 py-2 border-t border-slate-100"
                >
                  <button
                    onClick={addRow}
                    className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    New
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CellInput({
  value,
  type,
  onChange,
}: {
  value: CellValue;
  type: ColumnType;
  onChange: (val: CellValue) => void;
}) {
  if (type === "number") {
    return (
      <input
        type="number"
        className="w-full h-full px-3 py-1.5 bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-300"
        value={value ?? ""}
        onChange={(e) => onChange(Number(e.target.value))}
        placeholder="Empty"
      />
    );
  }
  if (type === "select") {
    // Basic select implementation - could be enhanced with a real badge system
    return (
      <input
        className="w-full h-full px-3 py-1.5 bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-300"
        value={value ?? ""}
        placeholder="Convert to Select..."
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  return (
    <input
      type="text"
      className="w-full h-full px-3 py-1.5 bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-300"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Empty"
    />
  );
}
