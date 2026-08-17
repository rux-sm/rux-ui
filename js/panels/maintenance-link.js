import { supabase } from "../data/supabase.js";

const button = document.getElementById("ps-maintenance-link");

async function copyText(value) {
	if (navigator.clipboard?.writeText && window.isSecureContext) {
		try {
			await navigator.clipboard.writeText(value);
			return true;
		} catch (_) {
			// Clipboard permission can be denied even in a secure context.
			// Continue to the selection-based fallback without failing open.
		}
	}
	const input = document.createElement("textarea");
	input.value = value;
	input.setAttribute("readonly", "");
	input.style.position = "fixed";
	input.style.opacity = "0";
	document.body.append(input);
	input.select();
	const copied = document.execCommand("copy");
	input.remove();
	return copied;
}

button?.addEventListener("click", async () => {
	const label = button.querySelector(".rux-button__label");
	const original = label?.textContent;
	const maintenanceWindow = window.open("", "_blank");
	button.disabled = true;
	try {
		let result = await supabase.rpc("get_maintenance_schedule_share");
		if (!result.data && !result.error) result = await supabase.rpc("create_maintenance_schedule_share");
		if (result.error || !result.data?.token) throw result.error || new Error("No maintenance token");
		const url = new URL("./maintenance.html", location.href);
		url.searchParams.set("s", result.data.token);
		if (maintenanceWindow) maintenanceWindow.location.replace(url.href);
		const copied = await copyText(url.href).catch(() => false);
		if (!maintenanceWindow) {
			window.location.assign(url.href);
			return;
		}
		if (label) label.textContent = copied ? "Opened + Copied" : "Schedule Opened";
	} catch (error) {
		console.error("Could not copy maintenance link:", error);
		maintenanceWindow?.close();
		if (label) label.textContent = "Could Not Open";
		window.alert(
			`Could not open the maintenance schedule.\n\n${error?.message || "Unknown Supabase error"}`,
		);
	} finally {
		setTimeout(() => { if (label) label.textContent = original; }, 2200);
		button.disabled = false;
	}
});
