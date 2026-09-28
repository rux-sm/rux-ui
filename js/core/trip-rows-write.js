/* Writes a trip's list rows -- payments, ticket options -- by id, as the
   scheduler writes them: a row the form still holds is updated when a column
   changed, a new one inserted, and a row the form loaded and no longer holds
   deleted. A row the other app added after this form loaded is not in
   `before`, so it is never deleted here.

   `before` is the rows as the form loaded them, each with its `id`; `after`
   is the form's rows in order, each with its `id` or none for a new one.
   Each inserted row of `after` gets `savedId`, so the caller can hand the id
   back to its form row and the next save updates it instead of adding it
   again. Returns the rows as saved, each with its id, for the next save's
   `before`. */

const blank = (v) => v === undefined || v === null || v === "";

function sameCell(a, b) {
	if (blank(a) && blank(b)) return true;
	if (blank(a) || blank(b)) return false;
	const x = Number(a);
	const y = Number(b);
	if (Number.isFinite(x) && Number.isFinite(y) && typeof a !== "boolean" && typeof b !== "boolean") return x === y;
	return String(a) === String(b);
}

export function planRows(before = [], after = [], fields = []) {
	const columns = ["position", ...fields];
	const loaded = new Map(before.filter((row) => row?.id).map((row) => [String(row.id), row]));
	const valuesOf = (row) => Object.fromEntries(columns.map((c) => [c, blank(row[c]) ? null : row[c]]));
	const inserts = [];
	const updates = [];
	const kept = new Set();
	after.forEach((row, index) => {
		const previous = row.id ? loaded.get(String(row.id)) : null;
		if (!previous) { inserts.push({ index, values: valuesOf(row) }); return; }
		kept.add(String(row.id));
		if (columns.some((c) => !sameCell(previous[c], row[c]))) updates.push({ id: String(row.id), values: valuesOf(row) });
	});
	const deletes = [...loaded.keys()].filter((id) => !kept.has(id));
	return { inserts, updates, deletes };
}

export async function writeRows(client, table, tripId, before, after, fields) {
	const { inserts, updates, deletes } = planRows(before, after, fields);
	if (deletes.length) {
		const { error } = await client.from(table).delete().eq("trip_id", tripId).in("id", deletes);
		if (error) throw error;
	}
	for (const { id, values } of updates) {
		const { error } = await client.from(table).update(values).eq("trip_id", tripId).eq("id", id);
		if (error) throw error;
	}
	for (const { index, values } of inserts) {
		const { data, error } = await client.from(table).insert({ trip_id: tripId, ...values }).select("id").single();
		if (error) throw error;
		after[index].savedId = data.id;
	}
	const columns = ["position", ...fields];
	return after.map((row) => ({
		id: row.savedId ?? row.id,
		...Object.fromEntries(columns.map((c) => [c, blank(row[c]) ? null : row[c]])),
	}));
}
