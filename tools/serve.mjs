// Static file server for visual verification (CLAUDE.md § Verification).
//
// Replaces `python3 -m http.server`, which cannot start under a sandboxed
// shell: its argument parser evaluates os.getcwd() at import time, and a
// denied getcwd raises PermissionError before any flag is read. Node is
// already a hard dependency of the test suite, so this removes a Python
// requirement rather than adding a Node one.
//
//   node tools/serve.mjs [port]        (argv, then $PORT, then 8642 — the old command's port)
//                                     port 0 asks the OS for any free one

import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
// Explicit argv wins, then $PORT (which is how a harness assigns one when 8642 is
// already taken), then the documented default. Spelled out rather than chained
// with `||` so that 0 survives: 0 is the conventional "assign me any free port",
// which is the case $PORT exists to serve, and `||` would read it as unset and
// hand back the 8642 that was already taken.
const asPort = (value) => {
	const n = Number(value);
	return value !== undefined && value !== "" && Number.isInteger(n) && n >= 0 && n <= 65535
		? n
		: null;
};
const port = asPort(process.argv[2]) ?? asPort(process.env.PORT) ?? 8642;

const TYPES = {
	".html": "text/html; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".mjs": "text/javascript; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".svg": "image/svg+xml",
	".png": "image/png",
	".jpg": "image/jpeg",
	".webp": "image/webp",
	".ico": "image/x-icon",
	".woff2": "font/woff2",
};

const server = createServer(async (req, res) => {
	const url = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
	// normalize() collapses ../ before the prefix check, so a traversal
	// attempt resolves inside root or fails the guard rather than escaping.
	let path = join(root, normalize(url));
	if (!path.startsWith(root)) {
		res.writeHead(403).end("Forbidden");
		return;
	}
	try {
		let info = await stat(path);
		if (info.isDirectory()) {
			path = join(path, "index.html");
			info = await stat(path);
		}
		res.writeHead(200, {
			"Content-Type": TYPES[extname(path)] ?? "application/octet-stream",
			"Content-Length": info.size,
			"Cache-Control": "no-store",
		});
		createReadStream(path).pipe(res);
	} catch {
		res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
	}
});

// address().port, not `port`: with 0 the OS chooses, and the assigned number is
// the one a caller needs printed.
server.listen(port, () =>
	console.log(`serving ${root} on http://localhost:${server.address().port}`),
);
