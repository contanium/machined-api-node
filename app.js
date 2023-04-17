const security = require("./utils/security");
const openai = require("./utils/openai");
const express = require("express");

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => res.type('html').send(""));

app.post("/api/create-article", async (req, res) => {
  try {
    const app = await security.authenticate(req);
    const topic = req.body.topic;
    var title = req.body.title;
    var keyword = req.body.keyword;
    var outline = req.body.outline;
    var article = req.body.article;

    if (!app) {
      res.statusCode = 401;
      res.json({ error: "Unauthenticated." });
      return;
    }

    if (!topic) {
      res.statusCode = 400;
      res.json({ error: "The parameter 'topic' is required." });
      return;
    }

    if (!title) {
      const prompt = await openai.prompt("generate-title", { topic, title, outline, keyword });
      const response = await openai.chat(prompt.messages, prompt.options);

      title = response[0].message.content.replaceAll("\"", "");
    }

    if (!outline) {
      const prompt = await openai.prompt("generate-outline", { topic, title, outline, keyword });
      const response = await openai.chat(prompt.messages, prompt.options);

      outline = response[0].message.content;
    }

    if (!article) {
      const sections = [];

      await Promise.all(
        await outline.split("\n\n").map(async (section, index) => {
          const prompt = await openai.prompt("write-section", { topic, title, outline, section, keyword });
          const response = await openai.chat(prompt.messages, prompt.options);

          sections[index] = response[0].message.content;
        })
      );

      article = sections.join("\n\n").replaceAll("## Introduction\n", "");
    }

    const output = { topic, title, outline, article };

    console.log(output);

    res.statusCode = 200;
    res.json(output);

  } catch (error) {
    res.statusCode = 500;
    res.json({ error: "An unhandled exception occurred on the server." });
  }
});

app.listen(port, () => console.log(`Listening on port ${port}!`));
