/* ==========================================================================
   RUX UI — VIEW ROUTER
   --------------------------------------------------------------------------
   Show-one-view-at-a-time routing for a single-page application shell: the
   generic half of what every multi-view app writes by hand — toggling
   `hidden` across sibling view containers, marking the matching navigation
   control, and keeping the location hash in step.

   It owns no domain knowledge. The set of valid view names, any legacy
   aliases, and whatever should happen when a view opens are all supplied by
   the caller, so a view that needs to lazily boot a panel does that in
   onChange rather than here.

   API
   ---
   RuxViewRouter.create(options) → { show, current, destroy }

     views        selector or NodeList of view containers   (default "[data-view]")
     controls     selector or NodeList of nav controls      (default "button[data-view]")
     attribute    dataset key naming the view               (default "view")
     allow        array of valid names; others fall back    (default: names found in the DOM)
     aliases      { legacyName: canonicalName }             (default {})
     fallback     name used when the hash is absent/unknown (default: first allowed)
     hash         keep location.hash in step                (default true)
     stateKey     document.body dataset key to mirror into  (default null)
     onChange     (name) => void, called after each switch  (default null)

   The returned show(name) is idempotent and safe to call with an unknown
   name — it resolves through aliases and the allowlist first.

   Markup contract
   ---------------
   Containers and controls carry the same dataset key:

     <section data-view="reports">…</section>
     <button  data-view="reports">Reports</button>

   The active control gets .is-active and aria-current="page"; inactive
   controls get neither. Inactive containers get the `hidden` attribute.
   ========================================================================== */

(() => {
	"use strict";

	const toArray = (value, root) =>
		typeof value === "string" ? [...root.querySelectorAll(value)] : [...(value ?? [])];

	function create(options = {}) {
		const {
			root = document,
			views = "[data-view]",
			controls = "button[data-view]",
			attribute = "view",
			aliases = {},
			hash = true,
			stateKey = null,
			onChange = null,
		} = options;

		const sections = toArray(views, root);
		const buttons = toArray(controls, root);
		if (!sections.length) return null;

		const named = (el) => el.dataset[attribute];
		const allow = options.allow ?? sections.map(named).filter(Boolean);
		const fallback = options.fallback ?? allow[0];

		// Aliases resolve first so a retired name still lands somewhere real.
		function resolve(name) {
			const canonical = aliases[name] ?? name;
			return allow.includes(canonical) ? canonical : fallback;
		}

		let active = null;

		function show(name) {
			const next = resolve(name);
			active = next;

			for (const section of sections) section.hidden = named(section) !== next;
			for (const button of buttons) {
				const on = named(button) === next;
				button.classList.toggle("is-active", on);
				if (on) button.setAttribute("aria-current", "page");
				else button.removeAttribute("aria-current");
			}

			if (stateKey) document.body.dataset[stateKey] = next;
			if (hash) history.replaceState(null, "", "#" + next);

			onChange?.(next);
			return next;
		}

		const onClick = (event) => show(event.currentTarget.dataset[attribute]);
		for (const button of buttons) button.addEventListener("click", onClick);

		function destroy() {
			for (const button of buttons) button.removeEventListener("click", onClick);
		}

		/* The name in the hash may carry a sub-path (#trip/42) — only the first
		   segment selects a view. */
		function fromHash() {
			return location.hash.slice(1).split("/")[0];
		}

		return { show, current: () => active, destroy, fromHash };
	}

	window.RuxViewRouter = { create };
})();
