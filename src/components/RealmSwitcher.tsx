import { useEffect, useRef, useState } from "react";

import { useRealm } from "@/contexts/RealmContext";

export function RealmSwitcher() {
  const {
    realms,
    activeRealmId,
    createRealm,
    switchRealm,
    deleteRealm,
    updateRealm,
  } = useRealm();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
        setEditingId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeRealm = realms.find((r) => r.id === activeRealmId);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      createRealm(newName.trim());
      setNewName("");
      setIsCreating(false);
      setIsOpen(false);
    }
  };

  const handleUpdate = (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (editName.trim()) {
      updateRealm(id, editName.trim());
      setEditingId(null);
    }
  };

  const startEdit = (
    e: React.MouseEvent,
    realm: { id: string; name: string }
  ) => {
    e.stopPropagation();
    setEditingId(realm.id);
    setEditName(realm.name);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (
      confirm(
        "Are you sure you want to delete this realm? All data will be lost."
      )
    ) {
      deleteRealm(id);
    }
  };

  return (
    <div className="relative z-10" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-slate-200"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-5 h-5 bg-indigo-500 rounded flex items-center justify-center text-white text-xs font-bold shrink-0">
            {activeRealm?.name.substring(0, 1).toUpperCase()}
          </div>
          <span className="text-sm font-medium text-slate-700 truncate">
            {activeRealm?.name || "Select Realm"}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
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
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 w-full bg-white shadow-xl border border-slate-200 rounded-b-lg overflow-hidden max-h-80 flex flex-col">
          <div className="overflow-y-auto flex-1">
            {realms.map((realm) => (
              <div
                key={realm.id}
                onClick={() => {
                  if (editingId !== realm.id) {
                    switchRealm(realm.id);
                    setIsOpen(false);
                  }
                }}
                className={`px-4 py-2 flex items-center justify-between group cursor-pointer ${
                  activeRealmId === realm.id
                    ? "bg-indigo-50 text-indigo-700"
                    : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                {editingId === realm.id ? (
                  <form
                    onSubmit={(e) => handleUpdate(e, realm.id)}
                    className="flex-1 flex gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      autoFocus
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-2 py-1 text-xs border border-slate-300 rounded"
                    />
                    <button
                      type="submit"
                      className="text-emerald-500 hover:text-emerald-600"
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
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="text-slate-400 hover:text-slate-600"
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
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </form>
                ) : (
                  <>
                    <span className="text-sm truncate flex-1">
                      {realm.name}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => startEdit(e, realm)}
                        className="p-1 text-slate-400 hover:text-sky-500 rounded"
                        title="Rename"
                      >
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
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                          />
                        </svg>
                      </button>
                      {realms.length > 1 && (
                        <button
                          onClick={(e) => handleDelete(e, realm.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded"
                          title="Delete"
                        >
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
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="p-2 border-t border-slate-100 bg-slate-50">
            {isCreating ? (
              <form onSubmit={handleCreate} className="flex gap-2">
                <input
                  autoFocus
                  type="text"
                  placeholder="Realm Name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1 px-2 py-1 text-xs border border-slate-300 rounded focus:border-indigo-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-2 py-1 bg-indigo-500 text-white rounded text-xs hover:bg-indigo-600"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-slate-400 hover:text-slate-600"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </form>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="w-full flex items-center justify-center gap-1 text-xs text-slate-500 hover:text-indigo-600 py-1 border border-dashed border-slate-300 rounded hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
              >
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Create New Realm
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
