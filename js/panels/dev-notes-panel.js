import {
	fetchNotes,
	addNote,
	toggleDone,
	deleteNote,
	subscribeToNotes,
} from "../data/dev-notes-db.js";

const btn = document.getElementById("dev-notes-btn");
const menu = document.getElementById("dev-notes-menu");
const badge = document.getElementById("dev-notes-badge");
const list = menu?.querySelector("[data-dev-notes-list]");
const form = menu?.querySelector("[data-dev-notes-form]");
const input = menu?.querySelector("[data-dev-notes-input]");

if (btn && menu && list && form && input) {
	let notes = [];
	const disclosure = window.RuxPopover.createDisclosure(btn, menu, {
		placement: "bottom-end",
		onOpen: refresh,
		initialFocus: () => input,
	});

	function updateBadge() {
		const openCount = notes.filter((row) => !row.done).length;
		const hasOpen = openCount > 0;
		badge.hidden = !hasOpen;
		badge.textContent = openCount > 99 ? "99+" : String(openCount);
		btn.setAttribute(
			"aria-label",
			hasOpen ? `Dev Notes, ${openCount} open` : "Dev Notes",
		);
	}

	function renderRows() {
		list.innerHTML = "";
		updateBadge();
		if (!notes.length) {
			list.innerHTML = `<li class="rux-dev-notes__empty">No notes yet</li>`;
			return;
		}
		notes.forEach((row) => {
			const li = document.createElement("li");
			li.className = `rux-dev-notes__item${row.done ? " is-done" : ""}`;
			li.innerHTML = `
				<label class="rux-dev-notes__item-main rux-checkbox">
					<input type="checkbox" data-toggle-done ${row.done ? "checked" : ""} aria-label="Mark done" />
					<span class="rux-dev-notes__item-text"></span>
				</label>
				<button type="button" class="rux-button rux-button--default rux-button--icon" data-delete aria-label="Delete note">
					<span class="rux-icon" aria-hidden="true">close</span>
				</button>
			`;
			li.querySelector(".rux-dev-notes__item-text").textContent = row.text;

			li.querySelector("[data-toggle-done]").addEventListener("change", async (event) => {
				const done = event.target.checked;
				row.done = done;
				li.classList.toggle("is-done", done);
				updateBadge();
				try {
					await toggleDone(row.id, done);
				} catch (err) {
					console.warn("Could not update dev note:", err);
					await refresh();
				}
			});

			li.querySelector("[data-delete]").addEventListener("click", async () => {
				notes = notes.filter((n) => n.id !== row.id);
				renderRows();
				try {
					await deleteNote(row.id);
				} catch (err) {
					console.warn("Could not delete dev note:", err);
					await refresh();
				}
			});

			list.appendChild(li);
		});
	}

	async function refresh() {
		try {
			notes = await fetchNotes();
		} catch (err) {
			console.warn("Could not load dev notes:", err);
			return;
		}
		renderRows();
	}

	form.addEventListener("submit", async (event) => {
		event.preventDefault();
		const text = input.value;
		if (!text.trim()) return;
		input.value = "";
		try {
			await addNote(text);
			await refresh();
		} catch (err) {
			console.warn("Could not add dev note:", err);
		}
	});

	subscribeToNotes(refresh);
	refresh();

	window.DevNotesPanel = { refresh, open: disclosure.open, close: disclosure.close };
}
