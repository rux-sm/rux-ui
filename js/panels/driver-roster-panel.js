/* ==========================================================================
   DRIVER ROSTER — panel
   --------------------------------------------------------------------------
   docs/driver-roster-plan.md, steps 4 and 5. Runs beside js/panels/driver-panel.js
   rather than replacing it; the shipped Drivers module stays working until the
   plan's step 9 cuts over.

   Two things here are deliberate departures from driver-panel.js:

   1. Cells are built with textContent, never template strings. The old module
      escaped the driver's name and interpolated everything else raw into
      innerHTML (plan S1), and its two render paths disagreed about the same
      data. Building nodes closes that by construction rather than by
      remembering to call an escape helper fifteen times.
   2. One delegated listener on <tbody>, not a click/keydown pair per row
      re-bound on every render (plan S4). Rows carry a role and an accessible
      name, which bare <tr tabindex="0"> did not.

   The editor is READ-ONLY here. Plan step 7 rebuilds it, and its first
   question is what `notes` should actually be — see plan §2.
   ========================================================================== */

(function () {
	"use strict";

	const view = document.querySelector('.rux-app-view[data-view="driver-roster"]');
	if (!view) return;

	const tbody = document.getElementById("droster-body");
	const table = document.getElementById("droster-grid");
	const searchInput = document.getElementById("droster-search");
	const scopeTrack = document.getElementById("droster-scope");
	const detail = document.getElementById("droster-detail");
	const detailTitle = document.getElementById("droster-detail-title");
	const detailBody = document.getElementById("droster-detail-body");
	const detailClose = document.getElementById("droster-detail-close");

	let db = null;
	let allDrivers = [];
	let scope = "active";
	let query = "";
	let selectedId = null;

	/* ── Formatting ──────────────────────────────────────────────────────── */

	function initials(name) {
		const parts = String(name || "").trim().split(/\s+/);
		return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
	}

	function fmtDate(iso) {
		if (!iso) return "";
		const [y, m, d] = String(iso).split("-");
		if (!y || !m || !d) return "";
		return new Date(+y, +m - 1, +d).toLocaleDateString("en-US", {
			month: "short", day: "numeric", year: "numeric",
		});
	}

	function daysUntil(iso) {
		if (!iso) return null;
		const [y, m, d] = String(iso).split("-").map(Number);
		if (!y || !m || !d) return null;
		const then = new Date(y, m - 1, d);
		const now = new Date();
		return Math.round((then - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
	}

	/* The compliance cell answers the regulatory question the roster exists to
	   answer: whose credential lapses next. It reports the NEARER of the CDL
	   and medical-card expiries, named, because "which one" changes what you do
	   about it. The old module carried both as separate columns, each off by
	   default, while Licence # — a number nobody reads at a glance — was on. */
	function compliance(d) {
		const candidates = [
			{ label: "CDL", iso: d.license_exp },
			{ label: "Medical", iso: d.med_card_expiry },
		].filter((c) => c.iso).map((c) => ({ ...c, days: daysUntil(c.iso) }))
			.filter((c) => c.days !== null);

		if (!candidates.length) return { text: "Not on file", state: "none" };

		candidates.sort((a, b) => a.days - b.days);
		const next = candidates[0];

		if (next.days < 0) {
			const n = Math.abs(next.days);
			return { text: `${next.label} expired ${n} ${n === 1 ? "day" : "days"} ago`, state: "expired" };
		}
		/* Today is expiry day, not "in 0 days" — and it is the one that matters
		   most, so it says so plainly. */
		if (next.days === 0) {
			return { text: `${next.label} expires today`, state: "expired" };
		}
		if (next.days <= 45) {
			return { text: `${next.label} in ${next.days} ${next.days === 1 ? "day" : "days"}`, state: "warn" };
		}
		return { text: `${next.label} ${fmtDate(next.iso)}`, state: "ok" };
	}

	const EMPLOYMENT_LABELS = {
		"full-time": "Full-time",
		"part-time": "Part-time",
		contract: "Contract",
		seasonal: "Seasonal",
	};

	/* ── Cell builders — nodes, never strings ────────────────────────────── */

	function el(tag, className, text) {
		const node = document.createElement(tag);
		if (className) node.className = className;
		if (text !== undefined && text !== null) node.textContent = String(text);
		return node;
	}

	function cell(col, className) {
		const td = el("td", className);
		td.dataset.col = col;
		td.setAttribute("role", "cell");
		return td;
	}

	function identityCell(d) {
		const td = cell("driver");
		const wrap = el("div", "driver-roster__identity");

		const avatar = el("div", "driver-roster__avatar");
		if (d.status !== "active") avatar.classList.add("driver-roster__avatar--inactive");
		avatar.setAttribute("aria-hidden", "true");
		const photoUrl = d.photo_path && db ? db.getDriverPhotoUrl(d.photo_path) : null;
		if (photoUrl) {
			const img = document.createElement("img");
			img.src = photoUrl;
			img.alt = "";
			avatar.appendChild(img);
		} else {
			avatar.textContent = initials(d.name);
		}

		const text = el("div", "driver-roster__id-text");
		text.appendChild(el("span", "driver-roster__name", d.name || "—"));
		/* Short name is how a driver is referred to on the radio. The old module
		   had it as an off-by-default column; here it is the identity's second
		   line, and its absence is the stub marker. */
		text.appendChild(
			d.short_name
				? el("span", "driver-roster__short", d.short_name)
				: el("span", "driver-roster__short driver-roster__empty", "No short name"),
		);

		wrap.append(avatar, text);
		td.appendChild(wrap);
		return td;
	}

	function standingCell(d) {
		const td = cell("standing");
		const wrap = el("span", "driver-roster__standing");
		wrap.appendChild(el("span", "rux-tag", EMPLOYMENT_LABELS[d.employment_type] || "—"));

		const priority = el("span", "driver-roster__priority");
		const dot = el("span", "rux-priority-dot");
		dot.dataset.priority = String(d.priority || 3);
		dot.setAttribute("aria-hidden", "true");
		priority.append(dot, el("span", null, `Priority ${d.priority || 3}`));
		wrap.appendChild(priority);

		td.appendChild(wrap);
		return td;
	}

	function complianceCell(d) {
		const c = compliance(d);
		const td = cell("compliance");
		if (c.state === "warn") td.classList.add("driver-roster__compliance--warn");
		if (c.state === "expired") td.classList.add("driver-roster__compliance--expired");
		if (c.state === "none") td.classList.add("driver-roster__empty");
		td.textContent = c.text;
		return td;
	}

	function notesCell(d) {
		const td = cell("notes");
		if (!(d.notes && d.notes.trim())) return td;
		const icon = el("span", "rux-icon driver-roster__notes-flag", "sticky_note_2");
		icon.setAttribute("role", "img");
		icon.setAttribute("aria-label", "Has notes");
		td.appendChild(icon);
		return td;
	}

	/* ── Filtering ───────────────────────────────────────────────────────── */

	function matchesScope(d) {
		if (scope === "all") return true;
		if (scope === "active") return d.status === "active";
		return d.status !== "active";
	}

	function matchesQuery(d) {
		if (!query) return true;
		const hay = [d.name, d.short_name, d.phone, d.license_number, d.driver_ref]
			.filter(Boolean).join(" ").toLowerCase();
		return hay.includes(query);
	}

	function visibleDrivers() {
		return allDrivers.filter((d) => matchesScope(d) && matchesQuery(d));
	}

	function counts() {
		return {
			active: allDrivers.filter((d) => d.status === "active").length,
			inactive: allDrivers.filter((d) => d.status !== "active").length,
			all: allDrivers.length,
		};
	}

	/* The fixed order the old module used, minus the status rung the fold made
	   redundant: employment, then priority, then name. */
	const EMPLOYMENT_ORDER = { "full-time": 0, "part-time": 1, contract: 2, seasonal: 3 };

	function sorted(list) {
		return [...list].sort(
			(a, b) =>
				(EMPLOYMENT_ORDER[a.employment_type] ?? 9) - (EMPLOYMENT_ORDER[b.employment_type] ?? 9) ||
				(a.priority || 3) - (b.priority || 3) ||
				String(a.name || "").localeCompare(String(b.name || "")),
		);
	}

	/* ── Render ──────────────────────────────────────────────────────────── */

	function renderScope() {
		const c = counts();
		scopeTrack.querySelectorAll("[data-scope]").forEach((btn) => {
			const key = btn.dataset.scope;
			btn.setAttribute("aria-pressed", String(key === scope));
			const label = btn.querySelector("[data-scope-count]");
			if (label) label.textContent = String(c[key] ?? 0);
		});
	}

	function renderRows() {
		const list = sorted(visibleDrivers());
		tbody.textContent = "";

		if (!list.length) {
			const tr = el("tr");
			tr.setAttribute("role", "row");
			const td = el("td", "driver-roster__none",
				query ? `No drivers match “${query}”.` : "No drivers in this view.");
			td.colSpan = table.querySelectorAll("thead th").length;
			td.setAttribute("role", "cell");
			tr.appendChild(td);
			tbody.appendChild(tr);
			return;
		}

		for (const d of list) {
			const tr = el("tr");
			tr.dataset.id = d.id;
			/* display: block at narrow widths drops the implicit row role
			   (composition.md §2.3.1), so it is declared rather than inherited.
			   The row is the control that opens the record, so it takes a
			   button role and a name instead of a bare tabindex. */
			tr.setAttribute("role", "row");
			tr.tabIndex = 0;
			tr.setAttribute("aria-label", `${d.name || "Driver"} — open details`);
			if (String(d.id) === String(selectedId)) tr.setAttribute("aria-current", "true");

			tr.append(
				identityCell(d),
				standingCell(d),
				(() => { const td = cell("phone", "rux-u-mono"); td.textContent = d.phone || "—"; return td; })(),
				complianceCell(d),
				notesCell(d),
			);
			tbody.appendChild(tr);
		}
	}

	function render() {
		renderScope();
		renderRows();
	}

	/* ── Read-only detail window ─────────────────────────────────────────── */

	const DETAIL_FIELDS = [
		["Reference", (d) => d.driver_ref],
		["Short name", (d) => d.short_name],
		["Status", (d) => (d.status === "active" ? "Active" : "Inactive")],
		["Employment", (d) => EMPLOYMENT_LABELS[d.employment_type]],
		["Priority", (d) => (d.priority ? `Priority ${d.priority}` : null)],
		["Phone", (d) => d.phone],
		["Email", (d) => d.email],
		["CDL class", (d) => (d.cdl_class ? `CDL-${d.cdl_class}` : null)],
		["Licence expires", (d) => fmtDate(d.license_exp)],
		["Medical expires", (d) => fmtDate(d.med_card_expiry)],
		["Hire date", (d) => fmtDate(d.hire_date)],
		["Notes", (d) => d.notes],
	];

	function openDetail(d) {
		selectedId = d.id;
		detailTitle.textContent = d.name || "Driver";
		detailBody.textContent = "";

		const dl = el("dl", "driver-roster__facts");
		for (const [label, read] of DETAIL_FIELDS) {
			const value = read(d);
			if (!value) continue;
			dl.appendChild(el("dt", null, label));
			dl.appendChild(el("dd", null, value));
		}
		detailBody.appendChild(dl);
		detail.hidden = false;
		detailClose.focus();
		render();
	}

	function closeDetail() {
		detail.hidden = true;
		const row = tbody.querySelector(`[data-id="${CSS.escape(String(selectedId))}"]`);
		selectedId = null;
		render();
		row?.focus();
	}

	/* ── Events — one delegated pair, not one per row ────────────────────── */

	tbody.addEventListener("click", (e) => {
		const tr = e.target.closest("tr[data-id]");
		if (!tr) return;
		const d = allDrivers.find((x) => String(x.id) === tr.dataset.id);
		if (d) openDetail(d);
	});

	tbody.addEventListener("keydown", (e) => {
		if (e.key !== "Enter" && e.key !== " ") return;
		const tr = e.target.closest("tr[data-id]");
		if (!tr) return;
		e.preventDefault();
		const d = allDrivers.find((x) => String(x.id) === tr.dataset.id);
		if (d) openDetail(d);
	});

	detailClose.addEventListener("click", closeDetail);

	searchInput.addEventListener("input", () => {
		query = searchInput.value.trim().toLowerCase();
		render();
	});

	scopeTrack.addEventListener("click", (e) => {
		const btn = e.target.closest("[data-scope]");
		if (!btn) return;
		scope = btn.dataset.scope;
		render();
	});

	/* ── Boot ────────────────────────────────────────────────────────────── */

	async function load() {
		try {
			allDrivers = await db.fetchDrivers();
			render();
		} catch (err) {
			console.error("driver-roster: fetchDrivers failed:", err);
			tbody.textContent = "";
			const tr = el("tr");
			tr.setAttribute("role", "row");
			const td = el("td", "driver-roster__none", `Could not load drivers: ${err?.message ?? err}`);
			td.colSpan = table.querySelectorAll("thead th").length;
			td.setAttribute("role", "cell");
			tr.appendChild(td);
			tbody.appendChild(tr);
		}
	}

	async function init() {
		if (!db) {
			try {
				db = await import("../data/driver-db.js?v=4");
			} catch (err) {
				console.warn("driver-roster: could not load driver-db:", err);
				return;
			}
		}
		await load();
	}

	window.DriverRosterPanel = { init, reload: load };

	init().catch((err) => console.error("driver-roster init failed:", err));
})();
