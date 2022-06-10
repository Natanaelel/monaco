import * as monaco from "monaco-editor"
// import * as monaco from "monaco-editor/esm/vs/editor/editor.api"
import { loadWASM } from "onigasm" // peer dependency of "monaco-textmate"
import { Registry } from "monaco-textmate" // peer dependency
import { wireTmGrammars } from "monaco-editor-textmate"
import { runCode } from "./coderunner.js"

self.MonacoEnvironment = {
    getWorkerUrl: function (moduleId, label) {
      if (label === "typescript" || label === "javascript") return "./ts.worker.bundle.js"
      return "./editor.worker.bundle.js"
    }
}


let languages

var registeredLanguages = new Set()

async function changeLanguageTo(languageId){
    if(!registeredLanguages.has(languageId)) registerLanguage(languageId)
    monaco.editor.setModelLanguage(editor.getModel(), languageId)
}

window.changeLanguageTo = changeLanguageTo

async function registerLanguage(languageId){
    let pathToGrammarFile = getPathToGrammarFile(getScopeFromId(languageId))
    let map = new Map()
    map.set(languageId, getScopeFromId(languageId))
    
    let registry = new Registry({
        getGrammarDefinition: async (scopeName) => {
            return {
                format: "json",
                content: await (await fetch(getPathToGrammarFile(scopeName))).text()
            }
        }
    })
    await wireTmGrammars(monaco, registry, map, editor)

    await registerSnippets(languageId)
    registeredLanguages.add(languageId)
}

async function registerSnippets(languageId){
    let languages = new Set(["husk"])
    if(!languages.has(languageId)) return
    const snippets = await (await fetch("./assets/snippets/" + languageId + ".json")).json()      
    monaco.languages.registerCompletionItemProvider(languageId, {
        provideCompletionItems: () => {
            return {
                suggestions: Object.entries(snippets).flatMap(([name, {prefix, body}]) => {
                    prefix = Array.isArray(prefix) ? prefix : [prefix]
                    body = Array.isArray(body) ? body.join("\n") : body
                    return prefix.map(one_prefix => {
                        return {
                            label: one_prefix.trim(),
                            insertText: body,
                            kind: monaco.languages.CompletionItemKind.Snippet
                        }
                    })
                })
            }
        }}
    )
}

window.registerLanguage = registerLanguage
window.registeredLanguages = registeredLanguages


const getScopeFromId = id => {
    return {
        "javascript": "source.js",
        "husk": "source.husk",
        "ruby": "source.ruby",
        "python": "source.python",
    }[id] ?? "source.txt"
}

const getPathToGrammarFile = scopeName => {
    console.log(scopeName)
    const languages = {
        "source.js": "./assets/syntaxes/js.tm.json",
        "source.txt": "./assets/syntaxes/plaintext.tm.json",
        "source.husk": "./assets/syntaxes/husk.json",
        "source.ruby": "./assets/syntaxes/ruby.jsonc",
        "source.python": "./assets/syntaxes/python.json"
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
    grammars.set("typescript", "source.ts")
    grammars.set("javascript", "source.js")
    grammars.set("husk", "source.husk")
    grammars.set("ruby", "source.ruby")
    grammars.set("python", "source.py")

    // monaco"s built-in themes aren"t powereful enough to handle TM tokens
    // https://github.com/Nishkalkashyap/monaco-vscode-textmate-theme-converter#monaco-vscode-textmate-theme-converter
    
    await registerLanguages(monaco)

    await defineTheme("d", "./assets/themes/d.json"),
    await defineTheme("dp", "./assets/themes/dp.json"),
    await defineTheme("dpp", "./assets/themes/dpp.json")

    const container = document.getElementById("container")
    const editor = monaco.editor.create(container, {
        value:
`function f(x, y){
    const result = x + y + 2 * 3;
    let fun = id => id <= id
    if(result == null) return
    console.log(\`let a = \${x + y + 3 == 4 ? 5 : 6}\`)
    return result
}
f(1, 2)
`,
        language: "javascript",
        theme: "dpp",
        minimap: {
            enabled: false
        }
    })
    
    window.monaco = monaco
    window.editor = editor

    await wireTmGrammars(monaco, registry, grammars, editor)


    const action = {
        id: "runCode",
        keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
        label: "Run code",
        run: () => {
            runCodeWrapper(editor.getValue(), "", [], editor.getModel().getLanguageId()).then(console.log)
        }
    }

    editor.addAction(action)


    // enables alt + scroll to change height of editor window

    const addScrollResize = (element, settings = {}) => {
        element.addEventListener("wheel", event => {
            if(event.altKey){
                let current_height = parseInt("0" + getComputedStyle(element).height) // "0" + to prevent NaN
                let new_height = current_height + event.deltaY / 2
                if(new_height <= 10 + event.clientY - element.getBoundingClientRect().top) return // cancel if new height makes the mouse not hover element
                if(new_height < (settings?.minHeight ?? 10)) return
                element.style.height = new_height.toString() + "px"
                settings?.run?.()
                event.stopPropagation() // stop editor to scroll normally
            }
        }, true) // true to capture event at "container" element
    }
    addScrollResize(container, {
        run: () => editor.layout(),
        minHeight: 20
    })
    addScrollResize(document.querySelector("#input"),{
        minHeight: 20
    })
    addScrollResize(document.querySelector("#output"),{
        minHeight: 20
    })
    // resize default way, with mouse drag
    let observer = new ResizeObserver(() => {
        editor.layout()
    })
    observer.observe(container)


    document.getElementById("run").onclick = runCodeWrapper

    container.onkeydown = container.onkeyup = () => {
        let el = document.getElementById("codestats")
        el.innerText = editor.getValue().length
    }



    languages = await fetch("./assets/languages.json").then(x => x.json());
    
    if(document.location.hash.length > 1){
        
        let hash = document.location.hash.slice(1)
        if(languages.available.includes(hash))
            changeLanguageTo(hash)
    }

}
async function runCodeWrapper(...args){
    let el = document.getElementById("runicon")
    let i = 0
    let interval = setInterval(() => {
        i = (i + 1) % 4
        el.innerText = "◜◝◞◟"[i] // ◥◤◣◢
    }, 100)
    await runCode(...args)
    clearInterval(interval)
    el.innerText = "▶"
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


liftOff()
