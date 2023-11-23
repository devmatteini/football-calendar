const esbuild = require("esbuild")

esbuild
    .build({
        entryPoints: ["src/index.ts"],
        bundle: true,
        platform: "node",
        outfile: ".build/index.js",
        minify: true,
    })
    .catch((e) => {
        console.error("[BUILD ERROR]: ", e)
        process.exit(1)
    })
