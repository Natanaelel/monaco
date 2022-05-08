import * as monaco from "monaco-editor"
// import * as monaco from "monaco-editor/esm/vs/editor/editor.api"
import { loadWASM } from "onigasm" // peer dependency of "monaco-textmate"
import { Registry } from "monaco-textmate" // peer dependency
import { wireTmGrammars } from "monaco-editor-textmate"


self.MonacoEnvironment = {
    getWorkerUrl: function (moduleId, label) {
      if (label === "typescript" || label === "javascript") return "./ts.worker.bundle.js"
      return "./editor.worker.bundle.js"
    }
}

// a = 0
// a = b => 0
// a == 0
// a === 0
// a + 0
// a / 0
// a ** 0
// a , 0
// function a(x, y){
//     const result = x + y + 2 * 3;
//     if(result == null) return
//     return result
// }

const getPathToGrammarFile = scopeName => {
    console.log(scopeName)
    const languages = {
        "source.js": "./assets/syntaxes/js.tm.json",
        "source.txt": "./assets/syntaxes/plaintext.tm.json",
        "source.husk": "./assets/syntaxes/husk.json",
        "source.ruby": "./assets/syntaxes/ruby.jsonc",
    }
    const result = languages[scopeName]
    if(result) return result
    console.warn(`no grammar defined for <${scopeName}>`)
    return "./assets/syntaxes/plaintext.tm.json"
}


const defineTheme = async (name, path) => {
    let theme = await (await fetch(path)).json()
    monaco.editor.defineTheme(name, theme)
}

async function liftOff() {
    await loadWASM(`./assets/onigasm.wasm`) // See https://www.npmjs.com/package/onigasm#light-it-up

    const registry = new Registry({
        getGrammarDefinition: async (scopeName) => {
            return {
                format: "json",
                content: await (await fetch(getPathToGrammarFile(scopeName))).text()
            }
        }
    })

    // map of monaco "language id"s" to TextMate scopeNames
    const grammars = new Map()
    grammars.set("css", "source.css")
    grammars.set("html", "text.html.basic")
    grammars.set("typescript", "source.ts")
    grammars.set("javascript", "source.js")
    grammars.set("husk", "source.husk")
    grammars.set("ruby", "source.ruby")

    // monaco"s built-in themes aren"t powereful enough to handle TM tokens
    // https://github.com/Nishkalkashyap/monaco-vscode-textmate-theme-converter#monaco-vscode-textmate-theme-converter
    
    await registerLanguages(monaco)

    await defineTheme("d", "./assets/themes/d.json"),
    await defineTheme("dp", "./assets/themes/dp.json"),
    await defineTheme("dpp", "./assets/themes/dpp.json")

    const editor = monaco.editor.create(document.getElementById("container"), {
        value:
`function a(x, y){
    const result = x + y + 2 * 3;
    if(result == null) return
    return result
}
`,
        language: "javascript",
        theme: "dpp"
    })
    
    window.monaco = monaco
    window.editor = editor

    await wireTmGrammars(monaco, registry, grammars, editor)


    const action = {
        id: "runCode",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
        label: "Run code",
        run: runCode
    }

    editor.addAction(action)
}


async function registerLanguages(monaco, editor){
    monaco.languages.register({
        id: "husk",
        extensions: [".husk"]
    })

    monaco.languages.register({
        id: "javascript",
        extensions: [".js"]
    })

    monaco.languages.register({
        id: "ruby",
        extensions: [".ruby"]
    })

    monaco.languages.register({
        id: "typescript",
        extensions: [".ts"]
    })

    monaco.languages.register({
        id: "css",
        extensions: [".css"]
    })
    monaco.languages.register({
        id: "html",
        extensions: [".html"]
    })
    
}

function runCode(editor){
    let code = editor.getModel().getLinesContent().join("\n")
    let language = editor.getModel().getLanguageId()

    let stdin = "", argv = []

    const language_id_to_piston_lang = id => id
    
    let url = "https://emkc.org/api/v2/piston/execute"
    let data = {
        "language": language_id_to_piston_lang(language),
        "version": "*",
        "files": [
            {
                "name": "code",
                "content": code
            }
        ],
        "stdin": stdin,
        "args": argv,
        "compile_timeout": 10000,
        "run_timeout": 5000,
        "compile_memory_limit": -1,
        "run_memory_limit": -1
    }
    fetch(url, {
        method: "POST",
        body: JSON.stringify(data)
    }).then(res => res.json()).then(console.log)
}





liftOff()