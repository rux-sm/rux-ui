/* ==========================================================================
   RUX DESIGN SYSTEM — JS HELPERS
   --------------------------------------------------------------------------
   Tiny vanilla helpers for interactive components. No framework, no build
   step. Drop a <script src="rux.js"></script> tag at the end of <body>.

   API
   ---
   Rux.toast(message, opts)            → show a toast (top-right)
   Rux.openModal(el)  / Rux.closeModal(el)
   Rux.copy(text)                      → copy text to clipboard
   data-rux-toggle="menu" #target      → wire click → toggle .is-open on target
   data-rux-toggle-button              → toggle .is-active / aria-pressed
   data-rux-toggle-group               → single-select toggle button group
   data-rux-tabs                       → single-select tabs
   data-rux-dismiss="modal"            → click closes nearest .rux-modal-backdrop
   ========================================================================== */

(function () {
  "use strict";

  const Rux = {};

  /* ── Toast ─────────────────────────────────────────────────────────────── */

  let toastHost = null;
  function ensureToastHost() {
    if (toastHost) return toastHost;
    toastHost = document.createElement("div");
    toastHost.style.cssText = [
      "position:fixed",
      "top:16px",
      "right:16px",
      "z-index:500",
      "display:flex",
      "flex-direction:column",
      "gap:8px",
      "pointer-events:none",
    ].join(";");
    document.body.appendChild(toastHost);
    return toastHost;
  }

  Rux.toast = function (message, opts) {
    opts = opts || {};
    const host = ensureToastHost();
    const el = document.createElement("div");
    el.className = "rux-toast" + (opts.variant ? " rux-toast--" + opts.variant : "");
    el.style.pointerEvents = "auto";
    el.textContent = message;
    host.appendChild(el);

    requestAnimationFrame(() => {
      el.style.opacity = "0";
      el.style.transform = "translateY(-8px)";
      el.animate(
        [
          { opacity: 0, transform: "translateY(-8px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: 220, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" }
      );
    });

    const ttl = opts.duration || 3200;
    setTimeout(() => {
      el.animate(
        [
          { opacity: 1, transform: "translateY(0)" },
          { opacity: 0, transform: "translateY(-8px)" },
        ],
        { duration: 220, easing: "cubic-bezier(0.4, 0, 0.2, 1)", fill: "forwards" }
      ).onfinish = () => el.remove();
    }, ttl);
  };

  /* ── Modal ─────────────────────────────────────────────────────────────── */

  Rux.openModal = function (el) {
    if (typeof el === "string") el = document.querySelector(el);
    if (!el) return;
    el.hidden = false;
    el.dataset.ruxOpen = "1";
    // Trap initial focus
    const focusable = el.querySelector("[autofocus], button, [href], input, select, textarea");
    if (focusable) focusable.focus();
    document.addEventListener("keydown", onEscape);
    el.__ruxOnEscape = onEscape;
    function onEscape(e) {
      if (e.key === "Escape") Rux.closeModal(el);
    }
  };

  Rux.closeModal = function (el) {
    if (typeof el === "string") el = document.querySelector(el);
    if (!el) return;
    el.hidden = true;
    delete el.dataset.ruxOpen;
    if (el.__ruxOnEscape) {
      document.removeEventListener("keydown", el.__ruxOnEscape);
      delete el.__ruxOnEscape;
    }
  };

  /* ── Copy to clipboard ─────────────────────────────────────────────────── */

  Rux.copy = async function (text) {
    try {
      await navigator.clipboard.writeText(text);
      Rux.toast("Copied", { duration: 1400 });
      return true;
    } catch (_) {
      return false;
    }
  };

  /* ── Accent theme ──────────────────────────────────────────────────────── */
  /* Set / get the page accent. Persists in localStorage as "rux:accent".
     Themes: "blue" (default), "violet", "cyan", "green", "amber", "red".   */

  Rux.ACCENTS = ["blue", "violet", "cyan", "green", "amber", "red"];

  Rux.setAccent = function (name) {
    if (!name || !Rux.ACCENTS.includes(name)) name = "blue";
    document.documentElement.dataset.ruxAccent = name;
    try { localStorage.setItem("rux:accent", name); } catch (_) {}
    document.documentElement.dispatchEvent(
      new CustomEvent("rux:accent-changed", { detail: { accent: name } })
    );
  };

  Rux.getAccent = function () {
    return document.documentElement.dataset.ruxAccent || "blue";
  };

  // Restore saved accent before paint
  (function () {
    let saved = null;
    try { saved = localStorage.getItem("rux:accent"); } catch (_) {}
    if (saved && Rux.ACCENTS.includes(saved)) {
      document.documentElement.dataset.ruxAccent = saved;
    }
  })();

  /* ── Selection groups ─────────────────────────────────────────────────── */

  function setActiveItem(group, active, selector, attr) {
    group.querySelectorAll(selector).forEach((item) => {
      const isActive = item === active;
      item.classList.toggle("is-active", isActive);
      item.setAttribute(attr, isActive ? "true" : "false");
      if (attr === "aria-selected") item.tabIndex = isActive ? 0 : -1;
    });
  }

  function moveActiveItem(group, selector, attr, dir) {
    const items = Array.from(group.querySelectorAll(selector)).filter((item) => !item.disabled);
    if (!items.length) return;

    const current = group.querySelector(selector + ".is-active") || items[0];
    const currentIndex = items.indexOf(current);
    const nextIndex = (currentIndex + dir + items.length) % items.length;
    const next = items[nextIndex];

    setActiveItem(group, next, selector, attr);
    next.focus();
  }

  /* ── Declarative wiring ────────────────────────────────────────────────── */

  document.addEventListener("click", function (e) {
    // [data-rux-toggle="#target"] — toggle .is-open on a target
    const toggle = e.target.closest("[data-rux-toggle]");
    if (toggle) {
      const sel = toggle.getAttribute("data-rux-toggle");
      const tgt = document.querySelector(sel);
      if (tgt) tgt.classList.toggle("is-open");
    }

    // [data-rux-accent="violet"] — set accent on click
    const accentEl = e.target.closest("[data-rux-set-accent]");
    if (accentEl) {
      Rux.setAccent(accentEl.getAttribute("data-rux-set-accent"));
    }

    // [data-rux-toggle-button] — standalone pressed toggle button
    const pressedToggle = e.target.closest("[data-rux-toggle-button]");
    if (pressedToggle && !pressedToggle.disabled) {
      const isActive = pressedToggle.getAttribute("aria-pressed") === "true";
      pressedToggle.classList.toggle("is-active", !isActive);
      pressedToggle.setAttribute("aria-pressed", isActive ? "false" : "true");
    }

    // [data-rux-toggle-group] — single-select pressed button group
    const toggleButton = e.target.closest("[data-rux-toggle-group] .rux-button");
    if (toggleButton && !toggleButton.disabled) {
      const group = toggleButton.closest("[data-rux-toggle-group]");
      setActiveItem(group, toggleButton, ".rux-button", "aria-pressed");
    }

    // [data-rux-tabs] — single-select tabs
    const tab = e.target.closest("[data-rux-tabs] .rux-button");
    if (tab && !tab.disabled) {
      const group = tab.closest("[data-rux-tabs]");
      setActiveItem(group, tab, ".rux-button", "aria-selected");
    }

    // [data-rux-dismiss] — close nearest modal
    const dismiss = e.target.closest("[data-rux-dismiss]");
    if (dismiss) {
      const modal = dismiss.closest(".rux-modal-backdrop") || dismiss.closest("[data-rux-modal]");
      if (modal) Rux.closeModal(modal);
    }

    // Click on the backdrop (but not the modal itself) closes the modal
    if (
      e.target.classList &&
      e.target.classList.contains("rux-modal-backdrop") &&
      e.target.dataset.ruxOpen
    ) {
      Rux.closeModal(e.target);
    }
  });

  document.addEventListener("keydown", function (e) {
    const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 :
                e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!dir) return;

    const toggleGroup = e.target.closest("[data-rux-toggle-group]");
    if (toggleGroup && e.target.closest(".rux-button")) {
      e.preventDefault();
      moveActiveItem(toggleGroup, ".rux-button", "aria-pressed", dir);
      return;
    }

    const tabGroup = e.target.closest("[data-rux-tabs]");
    if (tabGroup && e.target.closest(".rux-button")) {
      e.preventDefault();
      moveActiveItem(tabGroup, ".rux-button", "aria-selected", dir);
    }
  });

  window.Rux = Rux;
})();
