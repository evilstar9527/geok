import { execFileSync } from "node:child_process";
import {
	copyFileSync,
	lstatSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	renameSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

// Overlay only files owned by this website; the public root also hosts legacy apps.
export function publishDirectory(source, target, backup) {
	const roots = [source, target, backup].map((path) => resolve(path));
	for (const [index, root] of roots.entries()) {
		if (
			roots.some(
				(other, i) =>
					i !== index && (other === root || other.startsWith(`${root}${sep}`)),
			)
		) {
			throw new Error("Source, target and backup must be separate directories");
		}
	}
	const changed = [];
	function visit(relative = "") {
		for (const entry of readdirSync(join(source, relative), {
			withFileTypes: true,
		})) {
			const path = join(relative, entry.name);
			const existing = lstatSync(join(target, path), { throwIfNoEntry: false });
			if (entry.isSymbolicLink() || existing?.isSymbolicLink())
				throw new Error(`Refusing symlink: ${path}`);
			if (entry.isDirectory()) {
				if (existing && !existing.isDirectory())
					throw new Error(`Not a directory: ${path}`);
				visit(path);
			} else if (entry.isFile()) {
				if (existing && !existing.isFile())
					throw new Error(`Not a regular file: ${path}`);
				if (
					!existing ||
					!readFileSync(join(source, path)).equals(
						readFileSync(join(target, path)),
					)
				) {
					changed.push({ path, existed: !!existing });
				}
			} else throw new Error(`Unsupported source entry: ${path}`);
		}
	}
	visit();
	if (!changed.length) return 0;
	// Complete the backup before replacing any live file.
	mkdirSync(backup);
	for (const { path, existed } of changed) {
		if (!existed) continue;
		mkdirSync(dirname(join(backup, path)), { recursive: true });
		copyFileSync(join(target, path), join(backup, path));
	}
	writeFileSync(
		join(backup, "release-files.json"),
		JSON.stringify(changed, null, 2),
	);
	const staging = mkdtempSync(join(target, ".geok-release-"));
	try {
		for (const { path } of changed) {
			mkdirSync(dirname(join(staging, path)), { recursive: true });
			copyFileSync(join(source, path), join(staging, path));
		}
		// Publish assets first, then HTML, with atomic replacement of each file.
		changed.sort(
			(a, b) =>
				Number(a.path.endsWith(".html")) - Number(b.path.endsWith(".html")),
		);
		for (const { path } of changed) {
			mkdirSync(dirname(join(target, path)), { recursive: true });
			renameSync(join(staging, path), join(target, path));
		}
	} finally {
		rmSync(staging, { recursive: true, force: true });
	}
	return changed.length;
}

if (
	process.argv[1] &&
	resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	const [target, backup] = process.argv.slice(2);
	if (!target || !backup)
		throw new Error(
			"Usage: publish-standalone.mjs <public-root> <new-backup-directory>",
		);
	execFileSync(
		process.execPath,
		[
			fileURLToPath(new URL("./build-embed.mjs", import.meta.url)),
			"--standalone",
		],
		{ stdio: "inherit" },
	);
	const count = publishDirectory(
		fileURLToPath(new URL("../out/", import.meta.url)),
		target,
		backup,
	);
	console.log(`Published ${count} changed website files; backup: ${backup}`);
}
