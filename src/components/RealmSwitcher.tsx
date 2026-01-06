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
        className={`w-full px-4 py-3 flex items-center justify-between transition-all border-b border-slate-200 ${
          isOpen ? "bg-slate-50" : "hover:bg-slate-50"
        }`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div
            className={`w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm ${
              activeRealm?.id === "default"
                ? "bg-slate-800"
                : "bg-indigo-500 bg-gradient-to-br from-indigo-500 to-violet-600"
            }`}
          >
            {activeRealm?.id === "default" ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-3 h-3"
              >
                <path
                  fillRule="evenodd"
                  d="M10 2a3 3 0 00-3 3v2H6a2 2 0 00-2 2v6a2 2 0 002 2h8a2 2 0 002-2v-6a2 2 0 00-2-2h-1V5a3 3 0 00-3-3zm1 5h-2V5a1 1 0 112 0v2z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              activeRealm?.name.substring(0, 1).toUpperCase()
            )}
          </div>
          <span className="text-sm font-semibold text-slate-700 truncate">
            {activeRealm?.name || "Select Realm"}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
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
        <div className="absolute top-full left-0 right-0 mt-1 mx-1 bg-white shadow-2xl ring-1 ring-black/5 rounded-xl overflow-hidden max-h-[80vh] flex flex-col origin-top animate-in fade-in zoom-in-95 duration-100 z-50">
          <div className="p-1 overflow-y-auto flex-1 max-h-60 custom-scrollbar">
            {realms.map((realm) => (
              <div
                key={realm.id}
                onClick={() => {
                  if (editingId !== realm.id) {
                    switchRealm(realm.id);
                    setIsOpen(false);
                  }
                }}
                className={`px-3 py-2 flex items-center justify-between group cursor-pointer rounded-lg mb-0.5 transition-colors ${
                  activeRealmId === realm.id
                    ? "bg-indigo-50/80 text-indigo-900"
                    : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                {editingId === realm.id ? (
                  <form
                    onSubmit={(e) => handleUpdate(e, realm.id)}
                    className="flex-1 flex gap-2 items-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      autoFocus
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-2 py-1.5 text-xs border border-indigo-200 rounded focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                    />
                    <button
                      type="submit"
                      className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
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
                      className="p-1 text-slate-400 hover:bg-slate-100 rounded"
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
                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                      {realm.id === "default" && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="w-3 h-3 text-slate-400 shrink-0"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 2a3 3 0 00-3 3v2H6a2 2 0 00-2 2v6a2 2 0 002 2h8a2 2 0 002-2v-6a2 2 0 00-2-2h-1V5a3 3 0 00-3-3zm1 5h-2V5a1 1 0 112 0v2z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                      <span className="text-sm font-medium truncate">
                        {realm.name}
                      </span>
                    </div>

                    {/* Actions - Only for non-default realms */}
                    {realm.id !== "default" && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => startEdit(e, realm)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                          title="Rename"
                        >
                          <svg
                            className="w-3.5 h-3.5"
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
                        <button
                          onClick={(e) => handleDelete(e, realm.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          title="Delete"
                        >
                          <svg
                            className="w-3.5 h-3.5"
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
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="p-2 border-t border-slate-100 bg-slate-50/50">
            {isCreating ? (
              <form
                onSubmit={handleCreate}
                className="flex items-center gap-1.5"
              >
                <input
                  autoFocus
                  type="text"
                  placeholder="New Realm"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full min-w-0 px-2 py-1.5 text-xs border border-slate-300 rounded-md focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1.5 bg-indigo-600 text-white rounded-md text-xs font-semibold hover:bg-indigo-700 shadow-sm transition-colors whitespace-nowrap shrink-0"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-md shrink-0"
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
                className="w-full flex items-center justify-center gap-2 text-xs font-medium text-slate-500 hover:text-indigo-600 py-2 border border-dashed border-slate-300 rounded-md hover:border-indigo-300 hover:bg-indigo-50/50 transition-all group"
              >
                <div className="w-4 h-4 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center group-hover:bg-indigo-100 group-hover:text-indigo-500 transition-colors">
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
                </div>
                Create New Realm
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
