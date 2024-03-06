const esbuild = require("esbuild")
const fs = require("fs/promises")

const executable = ".build/football-calendar"

esbuild
    .build({
        entryPoints: ["src/bin/cli.ts"],
        bundle: true,
        platform: "node",
        outfile: executable,
        minify: true,
    })
    .then(() => fs.chmod(executable, 0o755))
    .catch((e) => {
        console.error("[BUILD ERROR]: ", e)
        process.exit(1)
    })
