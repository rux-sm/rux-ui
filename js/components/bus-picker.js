// Singleton "Move to Bus" popover — imported by the scheduler inline script.
//
// onSelect(newBus, conflictAssignmentId | null)
//   conflictAssignmentId is set when the user clicks "Swap" — signals that
//   the conflicting trip should be moved back to the original bus.

let el        = null;
let listEl    = null;
let _onSelect = null;

// ── Build (once) ───────────────────────────────────────────────────────────

function build() {
  el = document.createElement("div");
  el.className = "rux-bus-picker";
  el.setAttribute("hidden", "");
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-label", "Move to bus");

  el.innerHTML = `
    <p class="rux-bus-picker__heading">Move to Bus</p>
    <div class="rux-bus-picker__list" id="bus-picker-list"></div>
  `;
  document.body.appendChild(el);
  listEl = el.querySelector("#bus-picker-list");

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("mousedown", onOutsideClick);
}

// ── Conflict detection ─────────────────────────────────────────────────────

function datesOverlap(aStart, aEnd, bStart, bEnd) {
  const as = aStart || "", ae = aEnd   || aStart || "";
  const bs = bStart || "", be = bEnd   || bStart || "";
  return as <= be && ae >= bs;
}

function findConflict(busId, trip, currentTrips) {
  return Object.values(currentTrips).find(
    t => t.busId === busId &&
         t.assignmentId !== trip.assignmentId &&
         datesOverlap(t.startDate, t.endDate, trip.startDate, trip.endDate)
  ) || null;
}

// ── Render ─────────────────────────────────────────────────────────────────

function renderList(trip, buses, currentTrips) {
  listEl.innerHTML = "";
  let currentRow = null;

  buses.forEach(bus => {
    const isCurrent  = bus.id === trip.busId;
    const conflict   = !isCurrent ? findConflict(bus.id, trip, currentTrips) : null;

    const row = document.createElement("div");
    row.className = "rux-bus-picker__row" + (isCurrent ? " is-current" : "");

    if (isCurrent) {
      // Non-interactive — just shows which bus the trip is currently on
      const numEl = document.createElement("span");
      numEl.className = "rux-bus-picker__number";
      numEl.textContent = bus.number;
      row.appendChild(numEl);
      currentRow = row;
    } else {
      // Move button — full-width, always clickable (force-moves even if conflict)
      const moveBtn = document.createElement("button");
      moveBtn.type = "button";
      moveBtn.className = "rux-button rux-button--ghost rux-button--block rux-bus-picker__move";
      moveBtn.setAttribute("aria-label", `Move to bus ${bus.number}`);

      const numEl = document.createElement("span");
      numEl.className = "rux-bus-picker__number";
      numEl.textContent = bus.number;
      moveBtn.appendChild(numEl);

      moveBtn.addEventListener("click", () => {
        hide();
        _onSelect?.(bus, null);
      });
      row.appendChild(moveBtn);

      // Swap button — only shown when bus has a conflicting trip
      if (conflict) {
        const swapBtn = document.createElement("button");
        swapBtn.type = "button";
        swapBtn.className = "rux-button rux-button--ghost rux-button--icon rux-bus-picker__swap";
        swapBtn.setAttribute("aria-label", `Swap with bus ${bus.number}`);
        swapBtn.innerHTML = `<span class="rux-icon" aria-hidden="true">swap_horiz</span>`;
        swapBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          hide();
          _onSelect?.(bus, conflict.assignmentId);
        });
        row.appendChild(swapBtn);
      }
    }

    listEl.appendChild(row);
  });

  

  if (currentRow) {
    requestAnimationFrame(() => currentRow.scrollIntoView({ block: "center" }));
  }
}

// ── Position ───────────────────────────────────────────────────────────────

function position(anchor) {
  const ar  = anchor.getBoundingClientRect();
  const pr  = el.getBoundingClientRect();
  const gap = 6;
  const m   = 8;
  const vw  = window.innerWidth;
  const vh  = window.innerHeight;

  const left = Math.max(m, Math.min(ar.left, vw - pr.width - m));
  const top  = (ar.bottom + gap + pr.height <= vh - m)
    ? ar.bottom + gap
    : Math.max(m, ar.top - pr.height - gap);

  el.style.left = `${left}px`;
  el.style.top  = `${top}px`;
}

// ── Close handlers ─────────────────────────────────────────────────────────

function onKeyDown(e) {
  if (e.key === "Escape") hide();
}

function onOutsideClick(e) {
  if (el && !el.hidden && !el.contains(e.target)) hide();
}

// ── Public API ─────────────────────────────────────────────────────────────

export function show(trip, buses, currentTrips, onSelect) {
  if (!el) build();
  _onSelect = onSelect;

  renderList(trip, buses, currentTrips);

  el.style.visibility = "hidden";
  el.removeAttribute("hidden");

  const anchor = document.querySelector(".rux-trip-bar.is-active .rux-trip-bar__actions")
    || document.querySelector(".rux-trip-bar.is-active")
    || document.body;
  position(anchor);

  el.style.visibility = "";
}

export function hide() {
  if (el) el.setAttribute("hidden", "");
}

export default { show, hide };
