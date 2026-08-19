import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// The application is one large inline script that gets edited by string
// surgery. A bad splice is invisible to every other test in this suite —
// they read the file as text — and surfaces only as the app failing to boot
// (no profiles, no trips). This compiles each inline script so a splice that
// breaks *syntax* fails here instead of in the browser.
//
// Each script is checked as the kind the browser would treat it as: a
// type="module" tag compiles as ESM (static `import` is legal there), a bare
// tag as a classic script. vm.Script cannot do this split — it only compiles
// classic scripts — so this shells out to `node --check` with the matching
// file extension instead.
//
// Known limit: a splice that deletes a still-referenced function is
// syntactically valid and passes this test; that failure mode took out
// trackOrder/computeBusLabel/generateTripId once and was only caught at
// runtime. The definitions test below pins those three by name.

const page = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const scripts = [...page.matchAll(/<script((?![^>]*\bsrc=)[^>]*)>([\s\S]*?)<\/script>/g)]
	.map((m, i) => ({ index: i, module: /type="module"/.test(m[1]), code: m[2] }))
	.filter(({ code }) => code.trim());

test("every inline script parses as the kind the browser treats it as", () => {
	assert.ok(scripts.length >= 1, "expected inline scripts in index.html");
	const dir = mkdtempSync(join(tmpdir(), "rux-inline-"));
	try {
		for (const { index, module, code } of scripts) {
			const file = join(dir, `script-${index}.${module ? "mjs" : "cjs"}`);
			writeFileSync(file, code);
			assert.doesNotThrow(
				() => execFileSync(process.execPath, ["--check", file], { stdio: "pipe" }),
				`inline script #${index} (${module ? "module" : "classic"}) does not parse`,
			);
		}
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test("scheduler helpers referenced by the render path stay defined", () => {
	// These sat between two blocks that were being removed and were swept away
	// with them. Each is called elsewhere in the script, so its absence is a
	// boot-time ReferenceError, not a test failure.
	for (const name of ["computeBusLabel", "generateTripId"]) {
		assert.match(page, new RegExp(`function ${name}\\(`), `${name} lost`);
	}
	assert.match(page, /let trackOrder = \[\]/, "trackOrder lost");
});
