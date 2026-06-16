/* ==========================================================================
   RUX UI — REQUIREMENTS DB
   --------------------------------------------------------------------------
   Loads and saves the configurable list of trip requirements.
   Stored in the settings table as JSON (key "requirements-v1").

   API
   ---
   loadRequirements()        → Promise<Requirement[]>
   saveRequirements(reqs)    → Promise<void>  (also updates window.appRequirements)

   Requirement shape:
     { id, label, icon, type: "vehicle"|"driver", active, sortOrder }
   ========================================================================== */

import { getSetting, setSetting } from "./settings-db.js";

const KEY = "requirements-v1";

export const DEFAULT_REQUIREMENTS = [
  { id: "sleeper",  label: "Sleeper",   icon: "bed",           type: "vehicle", active: true, sortOrder: 0 },
  { id: "pax56",    label: "56 pax",    icon: "users",         type: "vehicle", active: true, sortOrder: 1 },
  { id: "adaLift",  label: "ADA lift",  icon: "accessibility", type: "vehicle", active: true, sortOrder: 2 },
  { id: "hotel",    label: "Hotel",     icon: "building",      type: "driver",  active: true, sortOrder: 0 },
  { id: "fuelCard", label: "Fuel card", icon: "credit-card",   type: "driver",  active: true, sortOrder: 1 },
];

export async function loadRequirements() {
  try {
    const data = await getSetting(KEY);
    return Array.isArray(data) ? data : [...DEFAULT_REQUIREMENTS];
  } catch {
    return [...DEFAULT_REQUIREMENTS];
  }
}

export async function saveRequirements(reqs) {
  await setSetting(KEY, reqs);
  window.appRequirements = reqs;
}
