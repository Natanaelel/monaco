const esbuild = require("esbuild");

esbuild.build({
    entryPoints: {
        "app": "./scripts/index.js",
        "editor.worker": "monaco-editor/esm/vs/editor/editor.worker.js",
        "ts.worker": "monaco-editor/esm/vs/language/typescript/ts.worker",
    },
    entryNames: "[name].bundle",
    bundle: true,
    outdir: "./dist",
    sourcemap: true,
    // globalName: "self",
    loader: {
        ".ttf": "file",
    },
})