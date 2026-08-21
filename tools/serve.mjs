// Static file server for visual verification (CLAUDE.md § Verification).
//
// Replaces `python3 -m http.server`, which cannot start under a sandboxed
// shell: its argument parser evaluates os.getcwd() at import time, and a
// denied getcwd raises PermissionError before any flag is read. Node is
// already a hard dependency of the test suite, so this removes a Python
// requirement rather than adding a Node one.
//
//   node tools/serve.mjs [port]        (default 8642, matching the old command)

import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const port = Number(process.argv[2]) || 8642;

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

createServer(async (req, res) => {
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
}).listen(port, () => console.log(`serving ${root} on http://localhost:${port}`));
