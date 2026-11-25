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
