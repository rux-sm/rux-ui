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
    // Geometry and stacking live in .rux-toast-host (rux-ui/css/base/feedback.css)
    // so the toast layer is tokenized like every other surface.
    toastHost.className = "rux-toast-host";
    document.body.appendChild(toastHost);
    return toastHost;
  }

  // The Web Animations API takes numbers and strings, not custom properties,
  // so read the motion tokens off the element the animation belongs to.
  function token(el, name, fallback) {
    const value = getComputedStyle(el).getPropertyValue(name).trim();
    return value || fallback;
  }
  const ms = (value) => (value.endsWith("ms") ? parseFloat(value) : parseFloat(value) * 1000);

  Rux.toast = function (message, opts) {
    opts = opts || {};
    const host = ensureToastHost();
    const el = document.createElement("div");
    el.className = "rux-toast" + (opts.variant ? " rux-toast--" + opts.variant : "");
    el.textContent = message;
    host.appendChild(el);

    const duration = ms(token(el, "--rux-duration-base", "220ms"));
    const offset = token(el, "--rux-toast-enter-y", "8px");
    const frames = [
      { opacity: 0, transform: `translateY(-${offset})` },
      { opacity: 1, transform: "translateY(0)" },
    ];

    requestAnimationFrame(() => {
      el.style.opacity = "0";
      el.style.transform = `translateY(-${offset})`;
      el.animate(frames, {
        duration,
        easing: token(el, "--rux-ease-out", "cubic-bezier(0.22, 1, 0.36, 1)"),
        fill: "forwards",
      });
    });

    const ttl = opts.duration || 3200;
    setTimeout(() => {
      el.animate([...frames].reverse(), {
        duration,
        easing: token(el, "--rux-ease-in-out", "cubic-bezier(0.4, 0, 0.2, 1)"),
        fill: "forwards",
      }).onfinish = () => el.remove();
    }, ttl);
  };

  /* ── Modal ─────────────────────────────────────────────────────────────── */

  Rux.openModal = function (el) {
    if (typeof el === "string") el = document.querySelector(el);
    // Re-opening an already-open modal is a content update, not a new dialog:
    // registering twice would stack it on itself and re-arm the focus trap.
    if (!el || el.__ruxOverlay) return;
    // A modal scrim is a dialog to assistive technology even though it is a
    // plain <div>; without these the trap below has nothing to announce.
    if (!el.hasAttribute("role")) el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.hidden = false;
    // The kernel owns Escape and the focus trap/restore; the scrim opts
    // out of outside-press dismissal because it covers the whole viewport —
    // its own click handler below distinguishes scrim from surface.
    el.__ruxOverlay = window.RuxOverlay.register({
      element: el,
      close: () => Rux.closeModal(el),
      dismissOn: { outside: false },
    });
    el.__ruxReleaseFocus = window.RuxOverlay.trapFocus(el);
  };

  Rux.closeModal = function (el) {
    if (typeof el === "string") el = document.querySelector(el);
    if (!el) return;
    el.hidden = true;
    el.removeAttribute("aria-modal");
    el.__ruxOverlay?.release();
    delete el.__ruxOverlay;
    el.__ruxReleaseFocus?.();
    delete el.__ruxReleaseFocus;
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
    // A real click lands on an Element; an event dispatched at document
    // makes the target `document`, which has no .closest. rux-ui/js/controls.js
    // carries the same guard on its own document handlers.
    if (!(e.target instanceof Element)) return;
    // [data-rux-set-accent="violet"] — set accent on click
    const accentEl = e.target.closest("[data-rux-set-accent]");
    if (accentEl) {
      Rux.setAccent(accentEl.getAttribute("data-rux-set-accent"));
    }

    // [data-rux-dismiss] — close nearest modal
    const dismiss = e.target.closest("[data-rux-dismiss]");
    if (dismiss) {
      const modal = dismiss.closest(".rux-modal-scrim") || dismiss.closest("[data-rux-modal]");
      if (modal) Rux.closeModal(modal);
    }

    // Click on the scrim (but not the modal itself) closes the modal
    if (
      e.target.classList &&
      e.target.classList.contains("rux-modal-scrim") &&
      !e.target.hidden
    ) {
      Rux.closeModal(e.target);
    }
  });

  /* Suppress the browser's own autofill on fields that do not opt in. This
     used to run once, as a bare side effect at load, which reached only the
     markup that happened to be parsed by then; it is an explicit init(root)
     so a panel rendered later can ask for the same treatment. */
  function init(root) {
    (root || document).querySelectorAll("input, select, textarea").forEach((el) => {
      if (!el.hasAttribute("autocomplete")) el.setAttribute("autocomplete", "nope");
    });
  }

  // Namespaced entry is canonical; the flat Rux.toast/openModal/copy/setAccent
  // methods stay as the published surface consumers already call.
  Rux.utilities = { init };

  // controls.js publishes onto window.Rux too. Merge rather than assign, so
  // whichever of the two loads second does not wipe the other's methods.
  window.Rux = Object.assign(window.Rux || {}, Rux);

  init(document);
  document.addEventListener("DOMContentLoaded", () => init(document));
})();
