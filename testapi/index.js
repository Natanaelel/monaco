const express = require("express")
const cors = require("cors")
const bodyparser = require("body-parser")

const wait = millis => new Promise((resolve, reject) => setTimeout(resolve, millis))

const app = express()
app.use(cors({origin:"*"}))

app.post("/execute", async (req, res) => {
    await wait(1000)
    res.send(JSON.stringify({
        run: {
            stdout: Math.random(),
            stderr: ""
        }
    }))
})
app.get("/", (req, res) => {
    res.send("working")
})
const PORT = 443
app.listen(PORT, () => console.log(`listening on port ${PORT}`))
