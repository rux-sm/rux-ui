import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// Exported so pages calling the Worker's own routes (not Supabase's) build
// their URL from the same origin rather than hardcoding a second copy.
export const SUPABASE_URL = "https://white-boat-9932.rux-smercado.workers.dev";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkbm1xaGF5emhyYmx0eHp6aGp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1OTU5NzcsImV4cCI6MjA5NjE3MTk3N30.i5q2SdSZLyOVEGZFFDTtVFqIMVEDz6jLO9ejJfy8Y94";

// On a staff page (<html data-sched-auth="staff">) no data request leaves
// until a staff account has signed in: every panel that loads on its own
// waits here instead of asking the database as the public key. Sign-in
// itself and the staff check pass straight through. Public link pages carry
// no marker, so their gate starts open.
const staffPage = document.documentElement.dataset.schedAuth === "staff";
let openGate;
const dataGate = staffPage ? new Promise((resolve) => { openGate = resolve; }) : Promise.resolve();

export function openDataGate() {
	openGate?.();
}

const gatedFetch = async (input, init) => {
	const url = typeof input === "string" ? input : input?.url ?? String(input);
	if (!url.includes("/auth/v1/") && !url.includes("/rpc/my_staff_profile")) await dataGate;
	return fetch(input, init);
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
	global: { fetch: gatedFetch },
});
