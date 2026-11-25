// Ordering helpers for a day's plan. A plan is a list of places, each with a
// timeBlock; it is kept sorted Morning → Afternoon → Evening, and the order
// within each time of day is the order the user chose.

export const BLOCKS = ["Morning", "Afternoon", "Evening"];

// Sorts by time of day, keeping the user's order within each.
export function orderPlan(plan) {
  return BLOCKS.flatMap((b) => plan.filter((p) => p.timeBlock === b));
}

// Moves a place one step up (-1) or down (+1). At the edge of a time of day
// it moves into the neighbouring one instead (end of the previous / start of
// the next).
export function movePlace(plan, id, dir) {
  const list = orderPlan(plan);
  const i = list.findIndex((p) => p.id === id);
  if (i === -1) return list;
  const item = list[i];
  const j = i + dir;

  if (j >= 0 && j < list.length && list[j].timeBlock === item.timeBlock) {
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  }

  const b = BLOCKS.indexOf(item.timeBlock) + dir;
  if (b < 0 || b >= BLOCKS.length) return list;
  const moved = { ...item, timeBlock: BLOCKS[b] };
  const rest = list.filter((p) => p.id !== id);
  // Entering the previous block from below lands at its end; entering the
  // next block from above lands at its start. orderPlan does both.
  const insertAt =
    dir < 0
      ? rest.findIndex((p) => BLOCKS.indexOf(p.timeBlock) > b)
      : rest.findIndex((p) => BLOCKS.indexOf(p.timeBlock) >= b);
  const at = insertAt === -1 ? rest.length : insertAt;
  return orderPlan([...rest.slice(0, at), moved, ...rest.slice(at)]);
}

// Drops a dragged place before another place (taking that place's time of
// day), or at the end of a time of day when beforeId is null.
export function dropPlace(plan, id, block, beforeId = null) {
  const list = orderPlan(plan);
  const item = list.find((p) => p.id === id);
  if (!item || id === beforeId) return list;
  const moved = { ...item, timeBlock: block };
  const rest = list.filter((p) => p.id !== id);

  let at = beforeId ? rest.findIndex((p) => p.id === beforeId) : -1;
  if (at === -1) {
    // End of the block: before the first place of any later block.
    at = rest.findIndex(
      (p) => BLOCKS.indexOf(p.timeBlock) > BLOCKS.indexOf(block),
    );
    if (at === -1) at = rest.length;
  }
  return orderPlan([...rest.slice(0, at), moved, ...rest.slice(at)]);
}

// Whether a place can move up / down at all.
export function canMove(plan, id, dir) {
  const list = orderPlan(plan);
  const i = list.findIndex((p) => p.id === id);
  if (i === -1) return false;
  const b = BLOCKS.indexOf(list[i].timeBlock);
  return dir < 0 ? !(i === 0 && b === 0) : !(i === list.length - 1 && b === BLOCKS.length - 1);
}

// ── Shortest order ───────────────────────────────────────────────────────

// Straight-line distance in metres between { lat, lng } points.
function distance(a, b) {
  const R = 6371000;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function pathLength(from, places) {
  let total = 0;
  let prev = from;
  for (const p of places) {
    if (prev) total += distance(prev, p.location);
    prev = p.location;
  }
  return total;
}

function permutations(items) {
  if (items.length <= 1) return [items];
  return items.flatMap((item, i) =>
    permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [
      item,
      ...rest,
    ]),
  );
}

// Shortest path from `from` (or from any of them, when from is null)
// visiting every place once. Exact for up to 8 places; nearest-neighbour
// plus 2-opt improvement beyond that.
function shortestPath(from, places) {
  if (places.length <= 1) return places;
  if (places.length <= 8) {
    let best = places;
    let bestLen = pathLength(from, places);
    for (const order of permutations(places)) {
      const len = pathLength(from, order);
      if (len < bestLen - 1e-6) {
        best = order;
        bestLen = len;
      }
    }
    return best;
  }

  const left = [...places];
  const path = [];
  let at = from ?? left[0].location;
  while (left.length) {
    let k = 0;
    left.forEach((p, i) => {
      if (distance(at, p.location) < distance(at, left[k].location)) k = i;
    });
    const [next] = left.splice(k, 1);
    path.push(next);
    at = next.location;
  }
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < path.length - 1; i++) {
      for (let j = i + 1; j < path.length; j++) {
        const candidate = [
          ...path.slice(0, i),
          ...path.slice(i, j + 1).reverse(),
          ...path.slice(j + 1),
        ];
        if (pathLength(from, candidate) < pathLength(from, path) - 1e-6) {
          path.splice(0, path.length, ...candidate);
          improved = true;
        }
      }
    }
  }
  return path;
}

// Reorders each time of day for the least travel, keeping places in their
// time of day. Morning starts from the starting point (if any); each later
// time of day starts from where the previous one ended. Places without
// coordinates stay at the end of their time of day.
export function shortestOrder(plan, start = null) {
  const list = orderPlan(plan);
  let anchor = start?.location ?? null;
  const out = [];
  for (const block of BLOCKS) {
    const items = list.filter((p) => p.timeBlock === block);
    const located = items.filter((p) => p.location);
    const unlocated = items.filter((p) => !p.location);
    const best = shortestPath(anchor, located);
    out.push(...best, ...unlocated);
    if (best.length) anchor = best[best.length - 1].location;
  }
  return out;
}

// Whether the plan is already in its shortest order.
export function isShortestOrder(plan, start = null) {
  const current = orderPlan(plan).map((p) => p.id).join(",");
  return shortestOrder(plan, start).map((p) => p.id).join(",") === current;
}
