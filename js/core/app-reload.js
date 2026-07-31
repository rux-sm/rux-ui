/* ==========================================================================
   RUX UI — APP RELOAD
   --------------------------------------------------------------------------
   Lets an admin push a hard reload to every open tab (Settings → App
   Updates → Force refresh all users), for rolling out a deploy that
   shouldn't wait for people to notice on their own. Every tab joins the
   same Supabase realtime channel on load and reloads when it hears the
   broadcast — including the tab that sent it.
   ========================================================================== */

import { supabase } from "../data/supabase.js";

const CHANNEL_NAME = "app-reload-v1";

let channel = null;
let subscribed = null;

function ensureChannel() {
	if (channel) return subscribed;
	channel = supabase.channel(CHANNEL_NAME);
	channel.on("broadcast", { event: "reload" }, () => {
		window.location.reload();
	});
	subscribed = new Promise((resolve, reject) => {
		channel.subscribe((status, err) => {
			if (status === "SUBSCRIBED") resolve();
			else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") reject(err || new Error(status));
		});
	});
	return subscribed;
}

async function triggerReload() {
	await ensureChannel();
	await channel.send({ type: "broadcast", event: "reload", payload: { at: Date.now() } });
}

ensureChannel();

window.RuxAppReload = { triggerReload };
