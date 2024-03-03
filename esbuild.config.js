const esbuild = require("esbuild")
const fs = require("fs/promises")

esbuild
    .build({
        entryPoints: ["src/bin/cli.ts"],
        bundle: true,
        platform: "node",
        outfile: ".build/cli.js",
        minify: true,
    })
    .then(() => fs.chmod(".build/cli.js", 0o755))
    .catch((e) => {
        console.error("[BUILD ERROR]: ", e)
        process.exit(1)
    })
