const express = require("express");

const app = express();
const port = process.env.PORT || 3000;

// Routes
const api = require("./api/generate-article");

app.use(express.json());
app.use("/api", api);
app.get("/", (req, res) => res.type('html').send(""));
app.get("/healthz", (req, res) => res.statusCode = 200);

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).send('An unhandled exception occurred on the server.')
})

app.listen(port, () => console.log(`Listening on port ${port}!`));
