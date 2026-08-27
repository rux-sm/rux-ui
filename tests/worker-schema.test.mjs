/* The Worker sends the published Trip Draft v2 schema to the Anthropic
   structured-outputs API, which accepts only a subset of JSON Schema. The
   SDKs strip the rest client-side; the Worker speaks raw HTTP and has to do
   it itself, so this checks the real schema survives the trip. */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { forStructuredOutput } from "../worker/index.js";

const schema = JSON.parse(readFileSync(new URL("../docs/trip-import-schema-v2.json", import.meta.url)));
const converted = forStructuredOutput(schema);

const REJECTED = [
	"minimum",
	"maximum",
	"exclusiveMinimum",
	"exclusiveMaximum",
	"multipleOf",
	"minLength",
	"maxLength",
	"minItems",
	"maxItems",
	"uniqueItems",
	"pattern",
	"oneOf",
	"$schema",
	"$id",
];

function walk(node, path, visit) {
	if (Array.isArray(node)) {
		node.forEach((item, i) => walk(item, `${path}[${i}]`, visit));
		return;
	}
	if (!node || typeof node !== "object") return;
	visit(node, path);
	for (const [key, value] of Object.entries(node)) {
		// Names under these are author-chosen, not keywords.
		if (key === "properties" || key === "$defs") {
			for (const [name, sub] of Object.entries(value)) walk(sub, `${path}.${key}.${name}`, visit);
		} else {
			walk(value, `${path}.${key}`, visit);
		}
	}
}

test("no keyword the structured-outputs API rejects survives", () => {
	walk(converted, "$", (node, path) => {
		for (const keyword of REJECTED) {
			assert.ok(
				!Object.hasOwn(node, keyword),
				`${path} still carries "${keyword}", which the API rejects`,
			);
		}
	});
});

test("every object with properties forbids additional ones", () => {
	walk(converted, "$", (node, path) => {
		if (Object.hasOwn(node, "properties")) {
			assert.equal(
				node.additionalProperties,
				false,
				`${path} has properties but does not set additionalProperties: false`,
			);
		}
	});
});

test("author-chosen property names that collide with keywords survive", () => {
	// A stop's own "type" field is a value, not a schema keyword. It lives on the
	// branches of the union, which allOf flattening has merged into one object.
	const branches = converted.$defs?.stop?.anyOf ?? findStopBranches(converted);
	assert.ok(branches?.length, "the stop union should survive");
	for (const branch of branches) {
		assert.ok(
			branch.properties && Object.hasOwn(branch.properties, "type"),
			'a stop branch lost its own "type" field',
		);
	}
});

test("the mixin was merged in rather than left as a separate allOf branch", () => {
	// locationFields has no additionalProperties of its own by design. Left as a
	// sibling allOf branch with one forced onto it, it would reject every field
	// the other branch declares and nothing could validate.
	walk(converted, "$", (node, path) => {
		assert.ok(!Object.hasOwn(node, "allOf"), `${path} still carries an allOf`);
		assert.ok(!Object.hasOwn(node, "$ref"), `${path} still carries an unresolved $ref`);
	});
	assert.ok(!converted.$defs, "definitions should be inlined and dropped");

	const pickup = findStopBranches(converted).find(
		(b) => b.properties?.type?.const === "pickup",
	);
	assert.ok(pickup, "the pickup branch should survive");
	// name and address come from the mixin; spot_time from the strict branch.
	for (const f of ["type", "name", "address", "spot_time", "departure_time"]) {
		assert.ok(Object.hasOwn(pickup.properties, f), `pickup lost "${f}" in the merge`);
	}
});

function findStopBranches(root) {
	let found = null;
	walk(root, "$", (node) => {
		if (found) return;
		if (
			Array.isArray(node.anyOf) &&
			node.anyOf.some((b) => b?.properties?.type?.const === "pickup")
		) {
			found = node.anyOf;
		}
	});
	return found ?? [];
}

test("the shape the app depends on is intact", () => {
	assert.equal(converted.type, "object");
	assert.equal(converted.additionalProperties, false);
	assert.deepEqual(converted.required, ["schema_version", "trip"]);
	assert.ok(converted.properties.trip, "the trip branch should survive");
});
