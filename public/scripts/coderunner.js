export function runCode(code, stdin = "", argv = [], language){
    
    const language_id_to_piston_lang = id => id
    
    let url = "https://emkc.org/api/v2/piston/execute"
    url = "http://127.0.0.1:443/execute" // testapi
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
    return fetch(url, {
        method: "POST",
        body: JSON.stringify(data)
    })  .then(res => res.json())
        .then(json => {
            document.querySelector("#output").innerText = json.run.stdout || json.run.stderr
            return json
        })
}