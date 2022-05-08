const express = require("express")
const cors = require("cors")

const app = express()

app.use(cors({origin: true, credentials: true}))
app.use(express.static("../public/dist"))

const PORT = 80

app.listen(PORT, () => console.log(`listening on port ${PORT}`))