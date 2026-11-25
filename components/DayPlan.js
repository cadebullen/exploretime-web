"use client";

import { useState } from "react";
import {
  BLOCKS,
  orderPlan,
  movePlace,
  dropPlace,
  canMove,
} from "@/lib/planOrder";
import { TIME_RANGE_LABELS, formatClock } from "@/lib/openingHours";
import { DURATION_OPTIONS, formatDuration, visitMinutes } from "@/lib/timeline";

// The places planned for one day, grouped by time of day. Reorder by dragging
// (also between times of day) or with the up/down buttons.
export default function DayPlan({
  plan,
  onChange,
  onRemove,
  selectedId = null,
  onSelect = () => {},
  legsByFromId = {},
  times = {}, // id -> { arrive, leave, overruns }
  issues = {}, // id -> warning text
  onDurationChange = () => {},
  blockWeather = null,
  onLegModeChange = () => {},
  defaultMode = "BEST",
  onUpdate = () => {}, // (id, patch)
  tripDays = [],
  dayNumber = 1,
  onMoveToDay = () => {},
}) {
  const [openDetails, setOpenDetails] = useState(null); // place id
  const [draggingId, setDraggingId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null); // "block:Morning" or a place id

  const ordered = orderPlan(plan);
  const numberOf = (id) => ordered.findIndex((p) => p.id === id) + 1;



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
  const blocks = BLOCKS;

  const iconButton =
    "w-7 h-7 rounded-md text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-25 disabled:hover:bg-transparent";

  return (
    <div className="grid gap-4 lg:grid-cols-3">
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
            className={`flex flex-col rounded-2xl border p-3 transition-colors ${
              dropTarget === blockKey
                ? "border-[#FF9F43]/60 bg-[#FF9F43]/10"
                : "border-white/10 bg-white/[0.02]"
            }`}
          >
            <div className="mb-3 px-1 flex items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-white/80">
                {block}
                <span className="ml-2 font-normal text-white/40">
                  {TIME_RANGE_LABELS[block]}
                </span>
              </h3>
              {blockWeather?.[block] && (
                <span
                  className="text-xs text-white/60 whitespace-nowrap"
                  title={blockWeather[block].condition}
                >
                  {blockWeather[block].icon} {blockWeather[block].temp}°
                  {blockWeather[block].rainChance >= 20 &&
                    ` · ${blockWeather[block].rainChance}% rain`}
                </span>
              )}
            </div>
            <ul className="space-y-2 flex-1">
              {items.length === 0 && (
                <li className="flex min-h-20 items-center justify-center rounded-xl border border-dashed border-white/15 px-3 text-center text-xs text-white/40">
                  {draggingId
                    ? "Drop here"
                    : `Nothing planned for the ${block.toLowerCase()}`}
                </li>
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
                  className={`rounded-xl border bg-black/40 px-3 py-2.5 transition-colors ${
                    draggingId === p.id
                      ? "opacity-40 border-white/10"
                      : dropTarget === p.id
                        ? "border-[#FF9F43] shadow-[0_-2px_0_0_#FF9F43]"
                        : selectedId === p.id
                          ? "border-white/40"
                          : "border-white/10"
                  }`}
                >
                  {/* Name row */}
                  <div className="flex items-center gap-2">
                    <span
                      className="cursor-grab active:cursor-grabbing select-none text-white/30 hover:text-white/70"
                      title="Drag to reorder"
                      aria-hidden="true"
                    >
                      ⋮⋮
                    </span>
                    <span
                      className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
                        selectedId === p.id
                          ? "bg-white text-[#1A1006]"
                          : "bg-[#FF9F43] text-[#1A1006]"
                      }`}
                    >
                      {numberOf(p.id)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onSelect(selectedId === p.id ? null : p.id)}
                      className="flex-1 min-w-0 text-left text-sm font-medium text-white truncate hover:underline underline-offset-2"
                      title={`${p.name} (show on map)`}
                    >
                      {p.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange(movePlace(ordered, p.id, -1))}
                      disabled={!canMove(ordered, p.id, -1)}
                      aria-label={`Move ${p.name} earlier`}
                      title="Move earlier"
                      className={iconButton}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange(movePlace(ordered, p.id, 1))}
                      disabled={!canMove(ordered, p.id, 1)}
                      aria-label={`Move ${p.name} later`}
                      title="Move later"
                      className={iconButton}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpenDetails(openDetails === p.id ? null : p.id)}
                      aria-expanded={openDetails === p.id}
                      aria-label={`Details for ${p.name}`}
                      title="Time, note, move to another day"
                      className={`${iconButton} ${openDetails === p.id || p.note || Number.isFinite(p.fixedTime) ? "text-[#FFC48A]" : ""}`}
                    >
                      ⋯
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(p)}
                      aria-label={`Remove ${p.name}`}
                      title="Remove"
                      className={iconButton}
                    >
                      ✕
                    </button>
                  </div>

                  {p.note && openDetails !== p.id && (
                    <p className="mt-1 pl-[3.25rem] text-xs italic text-white/60 line-clamp-2">
                      {p.note}
                    </p>
                  )}

                  {openDetails === p.id && (
                    <StopDetails
                      place={p}
                      onUpdate={(patch) => onUpdate(p.id, patch)}
                      tripDays={tripDays.filter((d) => d.n !== dayNumber)}
                      onMoveToDay={(n, copy) => {
                        setOpenDetails(null);
                        onMoveToDay(p, n, copy);
                      }}
                    />
                  )}

                  {/* Time, visit length, links */}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 pl-[3.25rem] text-xs text-white/55">
                    {times[p.id] && (
                      <span className={times[p.id].overruns ? "text-[#FFC48A]" : ""}>
                        {Number.isFinite(p.fixedTime) ? "📌 " : "~"}
                        {formatClock(times[p.id].arrive)} – {formatClock(times[p.id].leave)}
                      </span>
                    )}
                    <select
                      value={visitMinutes(p)}
                      onChange={(e) => onDurationChange(p.id, Number(e.target.value))}
                      aria-label={`Time to spend at ${p.name}`}
                      className="rounded border border-white/10 bg-zinc-900 px-1 py-0.5 text-xs text-white/70 outline-none focus:border-[#FF9F43]"
                    >
                      {[...new Set([...DURATION_OPTIONS, visitMinutes(p)])]
                        .sort((a, b) => a - b)
                        .map((m) => (
                          <option key={m} value={m}>
                            {formatDuration(m)}
                          </option>
                        ))}
                    </select>
                    {p.mapsUrl && (
                      <a
                        href={p.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/60 underline underline-offset-2 hover:text-white"
                      >
                        Map
                      </a>
                    )}
                    {p.website && (
                      <a
                        href={p.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/60 underline underline-offset-2 hover:text-white"
                      >
                        {p.category === "Food" && p.reservable ? "Book / website" : "Website"}
                      </a>
                    )}
                    {p.category === "Food" && p.phoneIntl && (
                      <a
                        href={`tel:${p.phoneIntl.replace(/\s+/g, "")}`}
                        className="text-white/60 underline underline-offset-2 hover:text-white"
                      >
                        Call
                      </a>
                    )}
                    {p.category === "Food" && p.reservable && (
                      <span className="text-white/60">Takes reservations</span>
                    )}
                  </div>

                  {!issues[p.id] && times[p.id]?.waitedFor > 0 && (
                    <p className="mt-1 pl-[3.25rem] text-xs text-white/45">
                      Opens at {formatClock(times[p.id].arrive)}, so the plan has
                      you arrive then.
                    </p>
                  )}
                  {issues[p.id] && (
                    <p className="mt-1 pl-[3.25rem] text-xs text-[#FFC48A]">
                      {issues[p.id]}
                    </p>
                  )}
                  {legsByFromId[p.id] ? (
                    <div className="mt-1 pl-[3.25rem] flex items-center gap-2 text-xs">
                      <span
                        className={`min-w-0 truncate ${
                          legsByFromId[p.id].far ? "text-[#FFC48A]" : "text-white/40"
                        }`}
                        title={legsByFromId[p.id].label}
                      >
                        Next: {legsByFromId[p.id].label}
                        {legsByFromId[p.id].far ? " (far)" : ""}
                      </span>
                      <select
                        value={legsByFromId[p.id].chosen ?? ""}
                        onChange={(e) => onLegModeChange(p.id, e.target.value || null)}
                        aria-label={`How to get from ${p.name} to the next stop`}
                        className="shrink-0 rounded border border-white/10 bg-zinc-900 px-1 py-0.5 text-xs text-white/60 outline-none focus:border-[#FF9F43]"
                      >
                        <option value="">
                          {{ BEST: "Best", WALK: "Walk", TRANSIT: "Transit", DRIVE: "Drive" }[defaultMode]}
                        </option>
                        {[
                          ["BEST", "Best"],
                          ["WALK", "Walk"],
                          ["TRANSIT", "Transit"],
                          ["DRIVE", "Drive"],
                        ]
                          .filter(([v]) => v !== defaultMode)
                          .map(([v, label]) => (
                            <option key={v} value={v}>
                              {label}
                            </option>
                          ))}
                      </select>
                    </div>
                  ) : (
                    <p className="mt-1 pl-[3.25rem] text-xs truncate text-white/40">
                      {p.address}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

// Per-stop options: fixed time, note, move or copy to another day.
function StopDetails({ place, onUpdate, tripDays, onMoveToDay }) {
  const [note, setNote] = useState(place.note ?? "");
  const [target, setTarget] = useState("");
  // 5:00 AM to 1:45 AM, every 15 minutes
  const timeOptions = Array.from({ length: (26 * 60 - 5 * 60) / 15 }, (_, i) => 5 * 60 + i * 15);

  return (
    <div className="mt-2 ml-[3.25rem] space-y-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs">
      <label className="flex items-center gap-2 text-white/60">
        Time
        <select
          value={Number.isFinite(place.fixedTime) ? place.fixedTime : ""}
          onChange={(e) =>
            onUpdate({ fixedTime: e.target.value === "" ? null : Number(e.target.value) })
          }
          className="rounded border border-white/10 bg-zinc-900 px-1 py-0.5 text-xs text-white outline-none focus:border-[#FF9F43]"
        >
          <option value="">Flexible</option>
          {timeOptions.map((m) => (
            <option key={m} value={m}>
              {formatClock(m)}
            </option>
          ))}
        </select>
        <span className="text-white/35">for bookings, tours, reservations</span>
      </label>

      <label className="block text-white/60">
        Note
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => note !== (place.note ?? "") && onUpdate({ note: note.trim() || null })}
          rows={2}
          maxLength={500}
          placeholder="Confirmation number, what to order, who you're meeting…"
          className="mt-1 w-full rounded border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-[#FF9F43]"
        />
      </label>

      {tripDays.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-white/60">
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            aria-label="Another day of the trip"
            className="rounded border border-white/10 bg-zinc-900 px-1 py-0.5 text-xs text-white outline-none focus:border-[#FF9F43]"
          >
            <option value="">Choose a day…</option>
            {tripDays.map((d) => (
              <option key={d.n} value={d.n}>
                {d.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!target}
            onClick={() => onMoveToDay(Number(target), false)}
            className="rounded border border-white/15 px-2 py-0.5 text-white/80 hover:text-white disabled:opacity-40"
          >
            Move there
          </button>
          <button
            type="button"
            disabled={!target}
            onClick={() => onMoveToDay(Number(target), true)}
            className="rounded border border-white/15 px-2 py-0.5 text-white/80 hover:text-white disabled:opacity-40"
          >
            Copy there
          </button>
        </div>
      )}
    </div>
  );
}
