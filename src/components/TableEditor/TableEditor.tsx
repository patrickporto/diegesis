import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const [draggedColumnIdx, setDraggedColumnIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

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
          {
            id: uuidv7(),
            name: "Tags",
            type: "multi-select",
            options: [
              { id: uuidv7(), label: "Work", color: "#fb7185" },
              { id: uuidv7(), label: "Personal", color: "#60a5fa" },
            ],
          },
        ]);
      });
    }

    return () => schemaArray.unobserve(observer);
  }, [schemaArray, doc]);

  // Observer for Rows
  useEffect(() => {
    const observer = () => {
      setRows(
        rowsArray.toArray().map((yMap) => {
          const data = yMap.toJSON();
          // Ensure id exists even for legacy data
          if (!data.id) data.id = uuidv7();
          return data as RowValues;
        })
      );
    };
    rowsArray.observeDeep(observer);
    observer(); // Initial load

    return () => rowsArray.unobserveDeep(observer);
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
      const newRowMap = new Y.Map<CellValue>();
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

  const reorderColumns = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    doc.transact(() => {
      const col = schemaArray.get(fromIdx);
      schemaArray.delete(fromIdx, 1);
      schemaArray.insert(toIdx, [col]);
    });
  };

  // Drag and Drop Handlers
  const handleDragStart = (idx: number) => {
    setDraggedColumnIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedColumnIdx !== null && draggedColumnIdx !== idx) {
      setDragOverIdx(idx);
    }
  };

  const handleDrop = (idx: number) => {
    if (draggedColumnIdx !== null && draggedColumnIdx !== idx) {
      reorderColumns(draggedColumnIdx, idx);
    }
    setDraggedColumnIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDraggedColumnIdx(null);
    setDragOverIdx(null);
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
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={() => handleDrop(idx)}
                    onDragEnd={handleDragEnd}
                    className={`text-left bg-white group border-r border-slate-100 last:border-r-0 cursor-grab active:cursor-grabbing transition-all duration-200 select-none ${
                      idx === 0
                        ? "sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
                        : ""
                    } ${
                      dragOverIdx === idx
                        ? "bg-slate-50 !border-l-sky-500 !border-l-2"
                        : ""
                    } ${
                      draggedColumnIdx === idx
                        ? "opacity-30 bg-slate-50 scale-95"
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
                <tr key={row.id} className="group/row hover:bg-slate-50">
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
                            options={col.options}
                            onChange={(val) => updateCell(rIdx, col.id, val)}
                            onAddOption={(newOption) => {
                              // We need to update the column schema with the new option
                              const currentOptions = col.options || [];
                              // Simple check to prevent duplicates
                              if (
                                currentOptions.some(
                                  (o) =>
                                    o.label.toLowerCase() ===
                                    newOption.label.toLowerCase()
                                )
                              ) {
                                return;
                              }
                              updateColumn(cIdx, {
                                options: [...currentOptions, newOption],
                              });
                            }}
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

const SelectCell = ({
  value,
  options,
  onChange,
}: {
  value: CellValue;
  options?: { id: string; label: string; color: string }[];
  onChange: (val: CellValue) => void;
}) => (
  <div className="relative w-full h-full group/select">
    <select
      className="w-full h-full px-3 py-1.5 bg-transparent outline-none text-sm text-slate-700 appearance-none cursor-pointer"
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
    >
      <option key="default" value="" disabled className="text-slate-300">
        Select option...
      </option>
      {(options || []).map((opt, idx) => (
        <option key={opt.id || `opt-${idx}`} value={opt.label}>
          {opt.label}
        </option>
      ))}
    </select>
    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover/select:text-slate-600">
      <svg
        className="w-3 h-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </div>
  </div>
);

const MultiSelectCell = ({
  value,
  options,
  onChange,
  onAddOption,
}: {
  value: CellValue;
  options?: { id: string; label: string; color: string }[];
  onChange: (val: CellValue) => void;
  onAddOption?: (opt: { id: string; label: string; color: string }) => void;
}) => {
  const selectedValues = Array.isArray(value) ? value : [];
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const buttonRef = useRef<HTMLButtonElement>(null);

  const filteredOptions = (options || []).filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const toggleValue = (label: string) => {
    if (selectedValues.includes(label)) {
      onChange(selectedValues.filter((v) => v !== label));
    } else {
      onChange([...selectedValues, label]);
    }
  };

  const handleCreateOption = () => {
    if (!onAddOption || !search.trim()) return;
    const colors = [
      "#f87171",
      "#fb923c",
      "#fbbf24",
      "#a3e635",
      "#4ade80",
      "#34d399",
      "#22d3ee",
      "#60a5fa",
      "#818cf8",
      "#a78bfa",
      "#c084fc",
      "#e879f9",
      "#fb7185",
    ];
    onAddOption({
      id: uuidv7(),
      label: search.trim(),
      color: colors[Math.floor(Math.random() * colors.length)],
    });
    toggleValue(search.trim());
    setSearch("");
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-full text-left px-2 flex items-center gap-1.5 overflow-hidden hover:bg-slate-50"
      >
        {selectedValues.length === 0 && (
          <span className="text-slate-300 text-sm pl-1">Empty</span>
        )}
        {selectedValues.map((val) => {
          const opt = (options || []).find((o) => o.label === val);
          return (
            <span
              key={val}
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-4 shadow-sm"
              style={{
                backgroundColor: opt?.color || "#e2e8f0",
                color: "#fff",
                textShadow: "0px 1px 1px rgba(0,0,0,0.2)",
              }}
            >
              {val}
            </span>
          );
        })}
      </button>

      {isOpen &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[60] bg-transparent"
              onClick={() => setIsOpen(false)}
            />
            <div
              style={{
                top:
                  (buttonRef.current?.getBoundingClientRect().bottom || 0) + 4,
                left: buttonRef.current?.getBoundingClientRect().left || 0,
              }}
              className="fixed z-[70] w-64 bg-white border border-slate-200 shadow-xl rounded-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100 p-1"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                autoFocus
                className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded mb-1 outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Search or create..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && search.trim()) {
                    const exact = (options || []).find(
                      (o) =>
                        o.label.toLowerCase() === search.trim().toLowerCase()
                    );
                    if (exact) {
                      toggleValue(exact.label);
                      setSearch("");
                    } else {
                      handleCreateOption();
                    }
                  }
                }}
              />
              <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                Select an option or create one
              </div>
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {filteredOptions.map((opt) => {
                  const isSelected = selectedValues.includes(opt.label);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => toggleValue(opt.label)}
                      className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full shadow-sm"
                          style={{ backgroundColor: opt.color }}
                        />
                        <span
                          className={
                            isSelected
                              ? "opacity-100 font-medium"
                              : "opacity-80"
                          }
                        >
                          {opt.label}
                        </span>
                      </div>
                      {isSelected && (
                        <svg
                          className="w-3.5 h-3.5 text-blue-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </button>
                  );
                })}
                {search.trim() &&
                  !filteredOptions.some(
                    (o) => o.label.toLowerCase() === search.trim().toLowerCase()
                  ) && (
                    <button
                      onClick={handleCreateOption}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
                    >
                      <span className="text-slate-400">Create</span>
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] text-white"
                        style={{ backgroundColor: "#fb7185" }}
                      >
                        {search}
                      </span>
                    </button>
                  )}
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
};

function CellInput({
  value,
  type,
  onChange,
  options,
  onAddOption,
}: {
  value: CellValue;
  type: ColumnType;
  onChange: (val: CellValue) => void;
  options?: { id: string; label: string; color: string }[];
  onAddOption?: (opt: { id: string; label: string; color: string }) => void;
}) {
  if (type === "number") {
    return (
      <input
        type="number"
        className="w-full h-full px-3 py-1.5 bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-300"
        value={value ? String(value) : ""}
        onChange={(e) => onChange(Number(e.target.value))}
        placeholder="Empty"
      />
    );
  }

  if (type === "select") {
    return <SelectCell value={value} options={options} onChange={onChange} />;
  }

  if (type === "multi-select") {
    return (
      <MultiSelectCell
        value={value}
        options={options}
        onChange={onChange}
        onAddOption={onAddOption}
      />
    );
  }

  return (
    <input
      type="text"
      className="w-full h-full px-3 py-1.5 bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-300"
      value={value ? String(value) : ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Empty"
    />
  );
}
