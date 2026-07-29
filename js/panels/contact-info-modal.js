(function () {
	"use strict";

	let modal = null;

	function ensureModal() {
		if (modal) return modal;
		modal = document.createElement("div");
		modal.className = "rux-modal-backdrop";
		modal.hidden = true;
		// Opts out of trip-bar.js's outside-pointerdown dismissal — this modal
		// only opens from the currently selected bar's data, so interacting
		// with it (e.g. Copy message) shouldn't deselect that bar.
		modal.dataset.ruxKeepTripSelection = "";
		modal.innerHTML = `
			<section class="rux-modal rux-contact-info-modal" role="dialog" aria-modal="true" aria-labelledby="contact-info-modal-title">
				<header class="rux-modal__header">
					<h2 class="rux-modal__title" id="contact-info-modal-title">Contact Info</h2>
					<button type="button" class="rux-button rux-button--default rux-button--icon" data-rux-dismiss aria-label="Close">
						<span class="rux-icon" aria-hidden="true">close</span>
					</button>
				</header>
				<div class="rux-modal__body">
					<textarea class="rux-textarea rux-contact-info-modal__preview" readonly data-contact-info-preview aria-label="Contact info message preview"></textarea>
				</div>
				<footer class="rux-modal__footer">
					<button type="button" class="rux-button rux-button--default" data-rux-dismiss>Close</button>
					<button type="button" class="rux-button rux-button--accent" data-contact-info-copy>
						<span class="rux-icon" aria-hidden="true">content_copy</span>
						<span>Copy message</span>
					</button>
				</footer>
			</section>`;
		document.body.appendChild(modal);

		modal.addEventListener("click", async (event) => {
			const copyBtn = event.target.closest("[data-contact-info-copy]");
			if (!copyBtn) return;
			await copyText(modal.querySelector("[data-contact-info-preview]").value);
		});

		return modal;
	}

	// navigator.clipboard.writeText alone can silently fail (insecure context,
	// denied permission, embedded/iframed preview, etc.) — a hidden textarea +
	// execCommand("copy") works in far more of those cases, and since the
	// message is already visible in the modal, the failure toast tells the
	// user exactly where to select-and-copy manually as a last resort.
	async function copyText(text) {
		if (await window.Rux?.copy?.(text)) return true;
		const fallback = document.createElement("textarea");
		fallback.value = text;
		fallback.setAttribute("readonly", "");
		fallback.style.cssText = "position:fixed;inset:auto auto 0 -9999px";
		document.body.appendChild(fallback);
		fallback.select();
		let copied = false;
		try {
			copied = document.execCommand("copy");
		} catch (_) {
			copied = false;
		}
		fallback.remove();
		window.Rux?.toast?.(
			copied ? "Copied" : "Copy was blocked — select the preview and copy manually",
			{ duration: copied ? 1400 : 3200 },
		);
		return copied;
	}

	function open(message) {
		ensureModal();
		modal.querySelector("[data-contact-info-preview]").value = message;
		window.Rux?.openModal?.(modal);
	}

	window.ContactInfoModal = { open };
})();
