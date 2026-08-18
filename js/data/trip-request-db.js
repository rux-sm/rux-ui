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
   uploadRequestDocument(ref, file)
                              → customer attachment; upload + record, post-submit
   listRequestDocuments(id)   → dispatcher: attachments + short-lived signed URLs
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

/* Attachments live in their own bucket, never trip-documents: the public page
   is anonymous, and that bucket holds every trip's real paperwork. Anon holds
   INSERT here and nothing else — see supabase/trip_request_documents.sql. */
const UPLOAD_BUCKET = "trip-request-uploads";

/* Storage object keys are ASCII-safe: the customer's own file name is kept on
   the trip_request_documents row for display, while the key itself is
   sanitized so an accented or emoji-bearing name can't fail the upload. */
function storageKey(reference, fileName) {
	const safe = String(fileName ?? "")
		.normalize("NFKD")
		.replace(/[^\w.-]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(-120) || "document";
	const slot = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	return `${String(reference ?? "unfiled").trim()}/${slot}-${safe}`;
}

/* Uploads one file and records it against the request. Called only after the
   submission itself succeeded, so a storage failure costs an attachment and
   never the request — the caller reports it without discarding anything.
   `upsert` stays off so an existing object can never be replaced. */
export async function uploadRequestDocument(reference, file) {
	if (!reference || !file) return null;
	const path = storageKey(reference, file.name);

	const { error: uploadErr } = await supabase.storage
		.from(UPLOAD_BUCKET)
		.upload(path, file, { upsert: false, contentType: file.type || undefined });
	if (uploadErr) throw rpcError(uploadErr);

	const { data, error } = await supabase.rpc("attach_trip_request_document", {
		p_reference: String(reference).trim(),
		p_file_path: path,
		p_file_name: String(file.name ?? "document"),
		p_file_size: Number(file.size) || null,
		p_content_type: file.type || null,
	});
	if (error) throw rpcError(error);
	return { id: data ?? null, path, name: file.name };
}

/* Dispatch-side: the files attached to one request, plus a short-lived signed
   URL each. The bucket is private, so there is no public URL to hand out. */
export async function listRequestDocuments(requestId) {
	if (!requestId) return [];
	const { data, error } = await supabase.rpc("list_trip_request_documents", {
		p_request_id: requestId,
	});
	if (error) throw rpcError(error);
	const rows = Array.isArray(data) ? data : [];

	return Promise.all(
		rows.map(async (row) => {
			const { data: signed } = await supabase.storage
				.from(UPLOAD_BUCKET)
				.createSignedUrl(row.file_path, 300);
			return { ...row, url: signed?.signedUrl ?? "" };
		}),
	);
}

/* One request in full, payload included — what list_trip_requests() flattens
   away. Backs the detail window; see supabase/trip_request_detail.sql. */
export async function getRequest(id) {
	if (!id) return null;
	const { data, error } = await supabase.rpc("get_trip_request", { p_id: id });
	if (error) throw rpcError(error);
	return Array.isArray(data) ? (data[0] ?? null) : (data ?? null);
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