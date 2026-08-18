(function () {
	"use strict";

	let modal = null;
	let callbacks = {};

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
			<section class="rux-modal sched-contact-info-modal" role="dialog" aria-modal="true" aria-labelledby="contact-info-modal-title">
				<header class="rux-card__header">
					<h2 class="rux-card__title" id="contact-info-modal-title">Contact Info</h2>
					<button type="button" class="rux-button rux-button--default rux-button--icon rux-button--header" data-rux-dismiss aria-label="Close">
						<span class="rux-icon" aria-hidden="true">close</span>
					</button>
				</header>
				<div class="rux-modal__body">
					<textarea class="rux-textarea sched-contact-info-modal__preview" readonly data-contact-info-preview aria-label="Contact info message preview"></textarea>
				</div>
				<footer class="rux-modal__footer">
					<button type="button" class="rux-button rux-button--default" data-contact-info-save hidden>
						<span class="rux-icon" aria-hidden="true">save</span>
						<span data-contact-info-save-label>Save message</span>
					</button>
					<button type="button" class="rux-button rux-button--default" data-contact-info-template hidden>
						<span class="rux-icon" aria-hidden="true">edit_note</span>
						<span data-contact-info-template-label>Update template</span>
					</button>
					<a class="rux-button rux-button--default" data-contact-info-external target="_blank" rel="noopener noreferrer" hidden>
						<span class="rux-icon" aria-hidden="true">sms</span>
						<span data-contact-info-external-label>Copy &amp; open Messages</span>
					</a>
					<button type="button" class="rux-button rux-button--accent" data-contact-info-copy>
						<span class="rux-icon" aria-hidden="true">content_copy</span>
						<span>Copy message</span>
					</button>
				</footer>
			</section>`;
		document.body.appendChild(modal);

		modal.addEventListener("click", async (event) => {
			const saveBtn = event.target.closest("[data-contact-info-save]");
			const templateBtn = event.target.closest("[data-contact-info-template]");
			if (saveBtn || templateBtn) {
				const callback = saveBtn ? callbacks.onSave : callbacks.onSaveTemplate;
				if (!callback) return;
				const button = saveBtn || templateBtn;
				button.disabled = true;
				try {
					await callback(modal.querySelector("[data-contact-info-preview]").value);
				} catch (err) {
					console.warn("Could not save contact message:", err);
					window.Rux?.toast?.("Could not save — try again", { variant: "danger" });
				} finally {
					button.disabled = false;
				}
				return;
			}
			const external = event.target.closest("[data-contact-info-external]");
			if (external && external.href) {
				void copyText(modal.querySelector("[data-contact-info-preview]").value);
				return;
			}
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

	// Allowlist, not a free-form link — this URL can come from saved trip/
	// driver fields, so it's validated the same way regardless of caller.
	// Google Messages is a driver's own texting link (see driver-reminder in
	// tasks-panel.js); Missive is a trip's saved customer email thread (see
	// openTripContactInfo in trip-db.js).
	const EXTERNAL_HOSTS = new Set(["messages.google.com", "mail.missiveapp.com"]);

	function open(message, {
		title = "Contact Info",
		previewLabel = "Contact info message preview",
		editable = false,
		externalUrl = "",
		externalLabel = "Copy & open Messages",
		externalIcon = "sms",
		onSave = null,
		onSaveTemplate = null,
		saveLabel = "Save message",
		templateLabel = "Update template",
	} = {}) {
		ensureModal();
		callbacks = { onSave, onSaveTemplate };
		const titleEl = modal.querySelector("#contact-info-modal-title");
		const preview = modal.querySelector("[data-contact-info-preview]");
		titleEl.textContent = title;
		preview.setAttribute("aria-label", previewLabel);
		preview.readOnly = !editable;
		preview.value = message;
		const save = modal.querySelector("[data-contact-info-save]");
		const template = modal.querySelector("[data-contact-info-template]");
		save.hidden = typeof onSave !== "function";
		template.hidden = typeof onSaveTemplate !== "function";
		modal.querySelector("[data-contact-info-save-label]").textContent = saveLabel;
		modal.querySelector("[data-contact-info-template-label]").textContent = templateLabel;
		const external = modal.querySelector("[data-contact-info-external]");
		let safeExternalUrl = "";
		try {
			const parsed = new URL(externalUrl);
			if (parsed.protocol === "https:" && EXTERNAL_HOSTS.has(parsed.hostname)) {
				safeExternalUrl = parsed.href;
			}
		} catch (_) {
			safeExternalUrl = "";
		}
		external.hidden = !safeExternalUrl;
		external.removeAttribute("href");
		if (safeExternalUrl) external.href = safeExternalUrl;
		modal.querySelector("[data-contact-info-external-label]").textContent = externalLabel;
		external.querySelector(".rux-icon").textContent = externalIcon;
		window.Rux?.openModal?.(modal);
	}

	window.ContactInfoModal = { open };
})();
