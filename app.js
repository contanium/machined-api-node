const security = require("./utils/security");
const openai = require("./utils/openai");
const express = require("express");
const crypto = require("crypto");


const app = express();
const port = process.env.PORT || 3000;

// Routes
const api_crypto = require("./api/encrypt");
const api_generate = require("./api/generate");
const api_articles = require("./api/generate-article");
const api_articles_m = require("./api/generate-article-m");


app.use(express.json());

app.use((req, res, next) => {
  req._cid = crypto.randomUUID();
  res.set('x-correlation-id', req._cid);
  next();
});

app.use(async (req, res, next) => {
  try {
    req._app = await security.authenticate(req);
  } catch (error) {
    res.statusCode = 401;
    res.json({ error: error.message });
    return;
  }

  next()
});

// Add Basic APIs
app.get("/", (req, res) => res.type('html').send(""));
app.get("/healthz", (req, res) => res.statusCode = 200);

// Add Application APIs
app.use("/api", api_crypto);
app.use("/api", api_generate);
app.use("/api", api_articles);
app.use("/api", api_articles_m);

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).send('An unhandled exception occurred on the server.')
})

app.listen(port, () => console.log(`Listening on port ${port}!`));
