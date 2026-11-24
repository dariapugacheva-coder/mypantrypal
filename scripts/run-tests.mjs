// Bundles tests/*.test.ts (resolving the "@/..." alias) and runs them with node:test.
import { build } from "esbuild";
import { readdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const files = readdirSync(join(root, "tests")).filter((f) => f.endsWith(".test.ts"));
const outdir = mkdtempSync(join(tmpdir(), "mpp-tests-"));
await build({ entryPoints: files.map((f) => join(root, "tests", f)), bundle: true, format: "esm", platform: "node", outdir, outExtension: { ".js": ".mjs" }, alias: { "@": root }, logLevel: "error" });
const r = spawnSync(process.execPath, ["--test", ...files.map((f) => join(outdir, f.replace(/\.ts$/, ".mjs")))], { stdio: "inherit" });
process.exit(r.status ?? 1);
