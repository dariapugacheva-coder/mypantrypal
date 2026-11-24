// Builds the whole app into ONE self-contained HTML file (hash routing, no server, no API keys).
// AI, OCR and store integrations show their manual fallbacks in this build.
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const out = join(root, "demo-dist");
mkdirSync(out, { recursive: true });

const swap = {
  name: "swap-modules",
  setup(b) {
    b.onResolve({ filter: /^@\/lib\/nav$/ }, () => ({ path: join(root, "demo/nav.tsx") }));
    b.onResolve({ filter: /^@\/lib\/supabase\/client$/ }, () => ({ path: join(root, "demo/supabase-stub.ts") }));
    b.onResolve({ filter: /^\.\/client$/ }, (a) => (a.importer.includes(join("lib", "supabase")) ? { path: join(root, "demo/supabase-stub.ts") } : undefined));
  }
};

const js = await build({
  entryPoints: [join(root, "demo/main.tsx")], bundle: true, minify: true, write: false, format: "iife", target: "es2020", jsx: "automatic",
  alias: { "@": root }, plugins: [swap], legalComments: "none",
  define: { "process.env.NODE_ENV": '"production"', "process.env.NEXT_PUBLIC_STATIC_DEMO": '"1"', "process.env.NEXT_PUBLIC_SUPABASE_URL": '""', "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": '""', "process.env.NEXT_PUBLIC_SUPABASE_BUCKET": '"uploads"' }
});

const cssOut = join(out, "app.css");
execFileSync(join(root, "node_modules/.bin/tailwindcss"), ["-c", join(root, "tailwind.config.ts"), "-i", join(root, "app/globals.css"), "-o", cssOut, "--minify"], { stdio: "inherit", cwd: root });
const css = readFileSync(cssOut, "utf8");
const code = js.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");

const html = `<title>MyPantryPal</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="MyPantryPal, a smart kitchen assistant. Created by Daria Pugacheva.">
<meta name="author" content="Daria Pugacheva">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
<style>${css}
html,body,#root{min-height:100%}</style>
<div id="root"></div>
<script>${code}</script>
`;
writeFileSync(join(out, "index.html"), html);
console.log(`demo-dist/index.html: ${(html.length / 1024).toFixed(0)} KB`);
