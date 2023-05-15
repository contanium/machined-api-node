const articles = require("./../workflows/articles");
const security = require("./../utils/security");
const express = require("express");
const crypto = require("crypto");
const axios = require("axios");

const router = express.Router();

router.post("/generate-topic-report", async (req, res) => {
    try {
        var cid = crypto.randomBytes(8).toString("hex");
        console.log(`${cid} > ${req.ip} : '/generate-topic-report'`);

        const app = await security.authenticate(req);
        var topic = req.body.topic;
        var model = req.body.model;
        var callback = req.body.callback;
        var metadata = req.body.metadata;
        var output;

        if (!app) {
            console.log(`${cid} > Error: Unauthorized`);

            res.statusCode = 401;
            res.json({ error: "Unauthenticated" });
            return;
        }

        if (!topic) {
            console.log(`${cid} > Error: The parameter 'topic' is required`);

            res.statusCode = 400;
            res.json({ error: "The parameter 'topic' is required." });
            return;
        }

        var defer = new Promise(async (resolve, reject) => {

            try {
                console.log(`${cid} > Generating article...`);

                overview = await topics.title(cid, app, metadata, { model, topic, title, keyword, title, outline });

                title = title || await articles.title(cid, app, metadata, { model, topic, title, keyword, title, outline });
                outline = outline || await articles.outline(cid, app, metadata, { model, topic, title, keyword, title, outline });
                article = article || await articles.article(cid, app, metadata, { model, topic, title, keyword, title, outline });

                if (callback) {
                    console.log(`${cid} > Executing callback to '${callback}'`);

                    try {
                        await axios.create({
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${process.env.NICHELY_API_KEY}`
                            }
                        }).post(callback, { title: title, content: article });
                    } catch (error) {
                        console.log(`${cid} > Error calling callback`);
                        console.log(`${cid} > ${error}`);
                    }
                }

                resolve();

            } catch (error) {
                console.log(`${cid} > Error generating article`);
                console.log(`${cid} > ${error}`);
            }
        });

        // If no callback, wait for article to be done
        if (!callback) {
            console.log(`${cid} > No callback so waiting...`);

            await defer;

            output = { cid, topic, title, outline, article };
        }
        else {
            console.log(`${cid} > There is a callback so running in background...`);

            output = { cid };
        }

        res.statusCode = 200;
        res.json(output);

        console.log(`${cid} > Returned`);

    } catch (error) {
        console.log(`${cid} > Unhandled error`);
        console.log(`${cid} > ${error}`);

        res.statusCode = 500;
        res.json({ error: "An unhandled exception occurred on the server." });
    }
});

module.exports = router;