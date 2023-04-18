const security = require("./utils/security");
const openai = require("./utils/openai");
const express = require("express");
const axios = require("axios");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => res.type('html').send(""));
app.get("/healthz", (req, res) => res.statusCode = 200);

app.post("/api/create-article", async (req, res) => {
  try {
    const app = await security.authenticate(req);
    const topic = req.body.topic;
    var title = req.body.title;
    var model = req.body.model;
    var keyword = req.body.keyword;
    var outline = req.body.outline;
    var article = req.body.article;
    var callback = req.body.callback;

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
      const prompt = await openai.prompt("generate-title", { topic, title, outline, keyword, model });
      const response = await openai.chat(prompt.messages, prompt.options);

      title = response[0].message.content.replaceAll("\"", "");
    }

    var defer = new Promise(async (resolve, reject) => {

      if (!outline) {
        const prompt = await openai.prompt("generate-outline", { topic, title, outline, keyword, model });
        const response = await openai.chat(prompt.messages, prompt.options);

        outline = response[0].message.content;
      }

      if (!article) {
        const sections = [];

        await Promise.all(
          await outline.split("\n\n").map(async (section, index) => {
            const prompt = await openai.prompt("write-section", { topic, title, outline, section, keyword, model });
            const response = await openai.chat(prompt.messages, prompt.options);

            sections[index] = response[0].message.content;
          })
        );

        article = sections.join("\n\n").replaceAll("## Introduction\n", "");
      }

      if (callback) {
        try {
          await axios.create({headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${process.env.NICHELY_API_KEY}`
            }
          }).post(callback, { title: title, content: article });
        } catch (error) {
          console.log(error);
        }
      }
    });

    // If no callback, wait for article to be done
    if (!callback) {
      await defer;
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
