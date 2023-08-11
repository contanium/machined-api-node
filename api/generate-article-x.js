const articles = require("./../workflows/articles-x");
const security = require("./../utils/security");
const express = require("express");
const crypto = require("crypto");
const axios = require("axios");

const limiter = require("async-rate-limit");
const limits = { "gpt-3.5-turbo": {}, "gpt-4": {} }
const rpm = { "gpt-3.5-turbo": 10, "gpt-4": 1 }

const router = express.Router();

router.post("/generate/x/article", async (req, res) => {
    try {
        console.log(`${req._cid} > ${req.ip} : '/generate/x/article'`);

        const key = await security.openai_key(req);

        var model = req.body.model;
        var callback = req.body.callback;
        var metadata = req.body.metadata;

        var title = req.body.title;
        var outline = req.body.outline;
        var article = req.body.article;

        var topic = req.body.topic;
        var keyword = req.body.keyword;
        var audience = req.body.audience || "Everybody";
        var language = req.body.language || "English (US)";
        var perspective = req.body.perspective || "Third Person (he, she, it, they)";
        var tone_of_voice = req.body.tone_of_voice || "Neutral (clear, knowledgeable and confident)";
        var references = req.body.references;

        var output;

        if (!topic) {
            console.log(`${req._cid} > Error: The parameter 'topic' is required`);

            res.statusCode = 400;
            res.json({ error: "The parameter 'topic' is required." });
            return;
        }

        if (!keyword) {
            console.log(`${req._cid} > Error: The parameter 'keyword' is required`);

            res.statusCode = 400;
            res.json({ error: "The parameter 'keyword' is required." });
            return;
        }

        const hash = crypto.createHash('md5').update(key).digest('hex');
        limits[model][hash] = limits[model][hash] || new limiter({ limit: rpm[model], timespan: 60000 });

        var defer = limits[model][hash].perform(async () => {

            try {
                console.log(`${req._cid} > Generating article...`);

                title = title || await articles.title(req._cid, req._app, key, metadata, { model, topic, title, keyword, outline, audience, language, perspective, tone_of_voice, references });
                outline = outline || await articles.outline(req._cid, req._app, key, metadata, { model, topic, title, keyword, outline, audience, language, perspective, tone_of_voice, references });
                article = article || await articles.article(req._cid, req._app, key, metadata, { model, topic, title, keyword, outline, audience, language, perspective, tone_of_voice, references });

                console.log(`${req._cid} > Article generated`);

                run_callback(req, callback, title, article);
                //resolve();

            } catch (error) {
                console.log(`${req._cid} > Error generating article`);
                console.log(`${req._cid} > ${error}`);

                run_callback(req, callback, title, article, "Error creating article...");
                //resolve();
            }
        });

        // If no callback, wait for article to be done
        if (!callback) {
            console.log(`${req._cid} > No callback so waiting...`);

            await defer;

            output = { cid: req._cid, topic, title, outline, article };
        }
        else {
            console.log(`${req._cid} > There is a callback so running in background...`);

            output = { cid: req._cid };
        }

        res.statusCode = 200;
        res.json(output);

        console.log(`${req._cid} > Returned`);

    } catch (error) {
        console.log(`${req._cid} > Unhandled error`);
        console.log(`${req._cid} > ${error}`);

        res.statusCode = 500;
        res.json({ error: error.message });
    }
});

async function run_callback(req, callback, title, content, error){
    if (callback) {
        console.log(`${req._cid} > Executing callback to '${callback}'`);

        try {
            await axios.create({
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${req._app.callback_key}`
                }
            }).post(callback, { title: title, content, error });
        } catch (error) {
            console.log(`${req._cid} > Error calling callback`);
            console.log(`${req._cid} > ${error}`);
        }
    }
}

module.exports = router;