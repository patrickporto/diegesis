import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { uuidv7 } from "uuidv7";

import { Layer } from "./types";

interface LayerManagerPanelProps {
  layers: Layer[];
  activeLayerId: string;
  onUpdateLayers: (layers: Layer[]) => void;
  onSetActiveLayer: (id: string) => void;
  onClose?: () => void;
}

interface SortableLayerItemProps {
  layer: Layer;
  activeLayerId: string;
  isRestricted: boolean;
  layerEditingId: string | null;
  layerEditName: string;
  onSetActiveLayer: (id: string) => void;
  onToggleVisible: (id: string) => void;
  onToggleLock: (id: string) => void;
  onStartEditing: (layer: Layer) => void;
  onSaveEditing: () => void;
  onEditNameChange: (name: string) => void;
  onDelete: (id: string) => void;
}

function SortableLayerItem({
  layer,
  activeLayerId,
  isRestricted,
  layerEditingId,
  layerEditName,
  onSetActiveLayer,
  onToggleVisible,
  onToggleLock,
  onStartEditing,
  onSaveEditing,
  onEditNameChange,
  onDelete,
}: SortableLayerItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: layer.id,
    disabled: isRestricted,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
        activeLayerId === layer.id
          ? "bg-sky-600/20 border-sky-500/50"
          : "bg-slate-900/50 border-slate-700 hover:border-slate-600"
      } ${isDragging ? "z-50 shadow-lg" : ""}`}
      onClick={() => onSetActiveLayer(layer.id)}
    >
      {/* Drag Handle */}
      {!isRestricted && (
        <button
          {...attributes}
          {...listeners}
          className="p-1 text-slate-500 hover:text-slate-300 cursor-grab active:cursor-grabbing touch-none"
          onClick={(e) => e.stopPropagation()}
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
              d="M4 8h16M4 16h16"
            />
          </svg>
        </button>
      )}

      {/* Visibility Toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleVisible(layer.id);
        }}
        className={`p-1 rounded ${
          layer.visible ? "text-sky-400" : "text-slate-600"
        }`}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {layer.visible ? (
            <>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </>
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M3 3l18 18"
            />
          )}
        </svg>
      </button>

      {/* Lock Toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleLock(layer.id);
        }}
        className={`p-1 rounded ${
          layer.locked
            ? "text-amber-500"
            : "text-slate-600 hover:text-slate-400"
        }`}
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {layer.locked ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
            />
          )}
        </svg>
      </button>

      {/* Layer Name */}
      <div
        className="flex-1 text-sm truncate select-none"
        onDoubleClick={() => !isRestricted && onStartEditing(layer)}
      >
        {layerEditingId === layer.id ? (
          <input
            type="text"
            value={layerEditName}
            onChange={(e) => onEditNameChange(e.target.value)}
            onBlur={onSaveEditing}
            onKeyDown={(e) => e.key === "Enter" && onSaveEditing()}
            autoFocus
            className="w-full bg-slate-800 px-1 py-0.5 border border-sky-500 rounded text-xs text-white"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className={
              layer.visible ? "text-slate-200" : "text-slate-500 italic"
            }
          >
            {layer.name}
          </span>
        )}
      </div>

      {/* Delete Button */}
      {!isRestricted && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(layer.id);
          }}
          className="p-1 text-slate-600 hover:text-red-500"
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
      )}
    </div>
  );
}

const RESTRICTED_LAYER_IDS = [
  "background",
  "grid",
  "fog",
  "tokens",
  "walls",
  "map",
];

export function LayerManagerPanel({
  layers,
  activeLayerId,
  onUpdateLayers,
  onSetActiveLayer,
}: LayerManagerPanelProps) {
  const [layerEditingId, setLayerEditingId] = useState<string | null>(null);
  const [layerEditName, setLayerEditName] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sort layers by sortOrder descending (top layers first)
  const sortedLayers = [...layers].sort((a, b) => b.sortOrder - a.sortOrder);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedLayers.findIndex((l) => l.id === active.id);
      const newIndex = sortedLayers.findIndex((l) => l.id === over.id);

      const reordered = arrayMove(sortedLayers, oldIndex, newIndex);
      // Update sortOrder (reversed since we display top-first)
      reordered.forEach((l, i) => {
        l.sortOrder = reordered.length - 1 - i;
      });
      onUpdateLayers(reordered);
    }
  };

  const handleToggleVisible = (id: string) => {
    onUpdateLayers(
      layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l))
    );
  };

  const handleToggleLock = (id: string) => {
    onUpdateLayers(
      layers.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l))
    );
  };

  const handleDeleteLayer = (id: string) => {
    if (layers.length <= 1) return;
    const newLayers = layers.filter((l) => l.id !== id);
    onUpdateLayers(newLayers);
    if (activeLayerId === id) {
      onSetActiveLayer(newLayers[0].id);
    }
  };

  const startLayerEditing = (layer: Layer) => {
    setLayerEditingId(layer.id);
    setLayerEditName(layer.name);
  };

  const saveLayerEditing = () => {
    if (layerEditingId) {
      onUpdateLayers(
        layers.map((l) =>
          l.id === layerEditingId ? { ...l, name: layerEditName } : l
        )
      );
      setLayerEditingId(null);
    }
  };

  const handleAddLayer = () => {
    const newLayer: Layer = {
      id: uuidv7(),
      name: "New Layer",
      type: "tokens",
      visible: true,
      locked: false,
      opacity: 1,
      sortOrder: layers.length,
    };
    onUpdateLayers([...layers, newLayer]);
    onSetActiveLayer(newLayer.id);
  };

  return (
    <div className="h-full flex flex-col bg-slate-800 text-slate-100 p-3 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Layers
        </h3>
        <button
          onClick={handleAddLayer}
          className="text-sky-400 hover:text-sky-300 p-1.5 hover:bg-slate-700/50 rounded-md transition-colors"
          title="Add Layer"
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
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortedLayers.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex-1 overflow-y-auto space-y-2">
            {sortedLayers.map((layer) => {
              const isRestricted = RESTRICTED_LAYER_IDS.includes(layer.id);
              return (
                <SortableLayerItem
                  key={layer.id}
                  layer={layer}
                  activeLayerId={activeLayerId}
                  isRestricted={isRestricted}
                  layerEditingId={layerEditingId}
                  layerEditName={layerEditName}
                  onSetActiveLayer={onSetActiveLayer}
                  onToggleVisible={handleToggleVisible}
                  onToggleLock={handleToggleLock}
                  onStartEditing={startLayerEditing}
                  onSaveEditing={saveLayerEditing}
                  onEditNameChange={setLayerEditName}
                  onDelete={handleDeleteLayer}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
