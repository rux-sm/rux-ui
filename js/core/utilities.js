/* ==========================================================================
   RUX UI — UTILITIES
   --------------------------------------------------------------------------
   Shared app utilities: toasts, modals, clipboard, and accent theming.
   No framework, no build step. Exposes window.Rux.

   API
   ---
   Rux.toast(message, opts)       → show a toast notification (top-right)
   Rux.openModal(el)              → open a modal, trap focus, close on Escape
   Rux.closeModal(el)             → close a modal
   Rux.copy(text)                 → copy text to clipboard, fires a toast
   Rux.setAccent(name)            → swap accent theme (blue/violet/green/amber)
   Rux.getAccent()                → get current accent name
   data-rux-set-accent="violet"   → click sets accent
   data-rux-dismiss               → click closes nearest modal
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

  /* ── Clipboard ─────────────────────────────────────────────────────────── */

  Rux.copy = async function (text) {
    try {
      await navigator.clipboard.writeText(text);
      Rux.toast("Copied", { duration: 1400 });
      return true;
    } catch (_) {
      return false;
    }
  };

  /* ── Accent ────────────────────────────────────────────────────────────── */

  Rux.ACCENTS = ["blue", "violet", "green", "amber"];

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

  /* ── Wiring ─────────────────────────────────────────────────────────────── */

  document.addEventListener("click", function (e) {
    // [data-rux-set-accent="violet"] — set accent on click
    const accentEl = e.target.closest("[data-rux-set-accent]");
    if (accentEl) {
      Rux.setAccent(accentEl.getAttribute("data-rux-set-accent"));
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

  window.Rux = Rux;
})();
