/* ==========================================================================
   RUX UI — TRIP REQUEST DB
   --------------------------------------------------------------------------
   Supabase persistence for the customer request inbox. Every access goes
   through a security definer function so the public form can insert
   submissions without ever reading other customers' rows.

   API
   ---
   requestUrl(reference)      → public form URL, ?r= set when given
   createInvite(fields)       → dispatcher invite; returns { id, reference, url }
   submitRequest(fields)      → public submission; attaches to invite when ref matches
   listRequests()             → inbox rows for the Requests window
   setStatus(id, status)      → dispatcher triage transition
   linkTrip(id, tripId)       → "apply to existing trip"
   removeRequest(id)          → delete an inbox row
   ========================================================================== */

import { supabase } from "./supabase.js";

const REQUEST_PAGE_URL = new URL("../../request.html", import.meta.url).href;

function rpcError(error) {
	const err = new Error(error?.message || "The request could not be sent.");
	err.code = error?.code ?? null;
	return err;
}

function toNullableNumber(value) {
	if (value === "" || value === null || value === undefined) return null;
	const n = Number(value);
	return Number.isFinite(n) && n >= 1 ? n : null;
}

export function requestUrl(reference) {
	const url = new URL(REQUEST_PAGE_URL);
	if (reference) url.searchParams.set("r", reference);
	return url.href;
}

export async function createInvite({
	client = "",
	contact = {},
	tripId = null,
	passengerCount = null,
	note = "",
} = {}) {
	const { data, error } = await supabase.rpc("create_trip_request", {
		p_client: String(client ?? ""),
		p_contact: contact && typeof contact === "object" ? contact : {},
		p_trip_id: tripId || null,
		p_passenger_count: toNullableNumber(passengerCount),
		p_note: String(note ?? ""),
	});
	if (error) throw rpcError(error);
	return {
		id: data?.id ?? null,
		reference: data?.reference ?? "",
		status: data?.status ?? "invited",
		url: requestUrl(data?.reference),
	};
}

export async function submitRequest({
	reference = "",
	client = "",
	contact = {},
	passengerCount = null,
	payload = null,
	note = "",
} = {}) {
	const { data, error } = await supabase.rpc("submit_trip_request", {
		p_reference: String(reference ?? "").trim(),
		p_client: String(client ?? ""),
		p_contact: contact && typeof contact === "object" ? contact : {},
		p_payload: payload,
		p_passenger_count: toNullableNumber(passengerCount),
		p_note: String(note ?? ""),
	});
	if (error) throw rpcError(error);
	return {
		id: data?.id ?? null,
		reference: data?.reference ?? "",
		status: data?.status ?? "new",
	};
}

export async function listRequests() {
	const { data, error } = await supabase.rpc("list_trip_requests");
	if (error) throw rpcError(error);
	return Array.isArray(data) ? data : [];
}

export async function setStatus(id, status) {
	if (!id) return false;
	const { data, error } = await supabase.rpc("update_trip_request_status", {
		p_id: id,
		p_status: status,
	});
	if (error) throw rpcError(error);
	return data === true;
}

export async function linkTrip(id, tripId) {
	if (!id || !tripId) return false;
	const { data, error } = await supabase.rpc("link_trip_request", {
		p_id: id,
		p_trip_id: tripId,
	});
	if (error) throw rpcError(error);
	return data === true;
}

export async function removeRequest(id) {
	if (!id) return false;
	const { data, error } = await supabase.rpc("delete_trip_request", { p_id: id });
	if (error) throw rpcError(error);
	return data === true;
}