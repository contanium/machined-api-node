const security = require("./../utils/security");
const openai = require("./../utils/openai");
const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const axios = require("axios");

router.post("/create-article", async (req, res) => {
    try {
        var cid = crypto.randomBytes(8).toString("hex");
        console.log(`${cid}> ${req.ip} : '/create-article'`);

        const app = await security.authenticate(req);
        var topic = req.body.topic;
        var title = req.body.title;
        var model = req.body.model;
        var keyword = req.body.keyword;
        var outline = req.body.outline;
        var article = req.body.article;
        var callback = req.body.callback;

        if (!app) {
            console.log(`${cid}> Error: Unauthorized`);

            res.statusCode = 401;
            res.json({ error: "Unauthenticated" });
            return;
        }

        if (!topic) {
            console.log(`${cid}> Error: The parameter 'topic' is required`);

            res.statusCode = 400;
            res.json({ error: "The parameter 'topic' is required." });
            return;
        }

        if (!title) {
            console.log(`${cid}> Generating title`);

            const prompt = await openai.prompt("generate-title", { topic, title, outline, keyword, model });
            const response = await openai.chat(prompt.messages, prompt.options);

            title = response[0].message.content.replaceAll("\"", "");

            console.log(`${cid}> Generating title - done`);
        }

        var defer = new Promise(async (resolve, reject) => {

            if (!outline) {
                console.log(`${cid}> Generating outline`);

                const prompt = await openai.prompt("generate-outline", { topic, title, outline, keyword, model });
                const response = await openai.chat(prompt.messages, prompt.options);

                outline = response[0].message.content;

                console.log(`${cid}> Generating outline - done`);
            }

            if (!article) {
                console.log(`${cid}> Generating article content`);

                const sections = [];

                await Promise.all(
                    await outline.split("\n\n").map(async (section, index) => {
                        console.log(`${cid}> Generating section ${index}`);

                        const prompt = await openai.prompt("write-section", { topic, title, outline, section, keyword, model });
                        const response = await openai.chat(prompt.messages, prompt.options);

                        sections[index] = response[0].message.content;

                        console.log(`${cid}> Generating section ${index} - done`);
                    })
                );

                article = sections.join("\n\n").replaceAll("## Introduction\n", "");

                console.log(`${cid}> Generating article content - done`);
            }

            if (callback) {
                console.log(`${cid}> Executing callback to '${callback}'`);

                try {
                    await axios.create({
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${process.env.NICHELY_API_KEY}`
                        }
                    }).post(callback, { title: title, content: article });
                } catch (error) {
                    console.log(error);
                }
            }

            resolve();
        });

        // If no callback, wait for article to be done
        if (!callback) {
            console.log(`${cid}> No callback so waiting...`);

            await defer;
        }

        const output = { topic, title, outline, article };

        console.log(output);

        res.statusCode = 200;
        res.json(output);

        console.log(`${cid}> Finished`);

    } catch (error) {
        console.log(`${cid}> Unhandled error`);
        console.log(`${cid}> ${error}`);

        res.statusCode = 500;
        res.json({ error: "An unhandled exception occurred on the server." });
    }
});

module.exports = router;