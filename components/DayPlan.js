"use client";

import { useState } from "react";
import {
  BLOCKS,
  orderPlan,
  movePlace,
  dropPlace,
  canMove,
} from "@/lib/planOrder";
import { TIME_RANGE_LABELS } from "@/lib/openingHours";

// The places planned for one day, grouped by time of day. Reorder by dragging
// (also between times of day) or with the up/down buttons.
export default function DayPlan({ plan, onChange, onRemove }) {
  const [draggingId, setDraggingId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null); // "block:Morning" or a place id

  const ordered = orderPlan(plan);

  if (ordered.length === 0) {
    return (
      <p className="text-sm text-white/45">
        Nothing planned yet. Add places from the suggestions below.
      </p>
    );
  }

  const endDrag = () => {
    setDraggingId(null);
    setDropTarget(null);
  };

  const handleDrop = (block, beforeId) => {
    if (draggingId) onChange(dropPlace(ordered, draggingId, block, beforeId));
    endDrag();
  };

  // While dragging, every time of day is shown so places can be dropped into
  // an empty one.
  const blocks = BLOCKS.filter(
    (b) => draggingId || ordered.some((p) => p.timeBlock === b),
  );

  return (
    <div className="space-y-4">
      {blocks.map((block) => {
        const items = ordered.filter((p) => p.timeBlock === block);
        const blockKey = `block:${block}`;
        return (
          <div
            key={block}
            onDragOver={(e) => {
              if (!draggingId) return;
              e.preventDefault();
              if (dropTarget !== blockKey && !items.some((p) => p.id === dropTarget)) {
                setDropTarget(blockKey);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(block, null);
            }}
          >
            <h3 className="text-sm font-semibold text-white/60 mb-2">
              {block}
              <span className="ml-2 font-normal text-white/35">
                {TIME_RANGE_LABELS[block]}
              </span>
            </h3>
            <ul
              className={`space-y-2 rounded-xl transition-colors ${
                dropTarget === blockKey ? "bg-[#FF9F43]/10 outline outline-1 outline-[#FF9F43]/40" : ""
              } ${items.length === 0 ? "min-h-12 border border-dashed border-white/15 flex items-center justify-center" : ""}`}
            >
              {items.length === 0 && (
                <li className="text-xs text-white/40">Drop here</li>
              )}
              {items.map((p) => (
                <li
                  key={p.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", p.id);
                    setDraggingId(p.id);
                  }}
                  onDragEnd={endDrag}
                  onDragOver={(e) => {
                    if (!draggingId) return;
                    e.preventDefault();
                    e.stopPropagation();
                    if (dropTarget !== p.id) setDropTarget(p.id);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDrop(block, p.id);
                  }}
                  className={`flex items-center gap-3 rounded-xl border bg-white/[0.03] px-3 py-3 transition-colors ${
                    draggingId === p.id
                      ? "opacity-40 border-white/10"
                      : dropTarget === p.id
                        ? "border-[#FF9F43] shadow-[0_-2px_0_0_#FF9F43]"
                        : "border-white/10"
                  }`}
                >
                  <span
                    className="cursor-grab active:cursor-grabbing select-none text-white/35 hover:text-white/70 px-1"
                    title="Drag to reorder"
                    aria-hidden="true"
                  >
                    ⋮⋮
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-white truncate">
                      {p.name}
                    </span>
                    <span className="block text-xs text-white/40 truncate">
                      {p.category}
                      {p.address ? ` · ${p.address}` : ""}
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onChange(movePlace(ordered, p.id, -1))}
                      disabled={!canMove(ordered, p.id, -1)}
                      aria-label={`Move ${p.name} earlier`}
                      title="Move earlier"
                      className="w-7 h-7 rounded-md text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-25 disabled:hover:bg-transparent"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange(movePlace(ordered, p.id, 1))}
                      disabled={!canMove(ordered, p.id, 1)}
                      aria-label={`Move ${p.name} later`}
                      title="Move later"
                      className="w-7 h-7 rounded-md text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-25 disabled:hover:bg-transparent"
                    >
                      ↓
                    </button>
                  </span>
                  <a
                    href={p.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-white/60 hover:text-white"
                  >
                    Map
                  </a>
                  <button
                    type="button"
                    onClick={() => onRemove(p)}
                    className="text-xs text-white/50 hover:text-white"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
