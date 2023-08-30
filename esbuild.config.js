const esbuild = require("esbuild")

esbuild
    .build({
        entryPoints: ["src/index.ts"],
        bundle: true,
        platform: "node",
        outfile: ".build/index.js",
        minify: true,
    })
    .catch(() => process.exit(1))
