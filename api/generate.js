const security = require("./../utils/security");
const openai = require("./../utils/openai");
const express = require("express");

const router = express.Router();

router.get("/verify/:key", async (req, res) => {
    console.log(`${req._cid} > Verifying openai api key`);

    try {
        const template = await openai.prompt("hello-world", {}, 1);
        const response = await openai.chat(req._cid, req._app, req.params.key, {}, template.messages, template.options);

        if (response[0].message.content) res.statusCode = 200; else res.statusCode = 400;
    } catch (error) {
        console.log(`${req._cid} > Provided openai api key invalid`);
        res.statusCode = 400;
    }

    res.json({});

    console.log(`${req._cid} > Verifying openai api key - done`);
});

router.post("/generate/:prompt", async (req, res) => {

    try {

        console.log(`${req._cid} > Running '${req.path}`);

        const key = await security.openai_key(req);

        const prompt = req.params.prompt;
        const version = req.query.version;
        const options = req.body;
        const metadata = req.body.metadata;

        // avoid cache
        metadata.version = req._cid;

        const template = await openai.prompt(prompt, options, version);
        const response = await openai.chat(req._cid, req._app, key, metadata, template.messages, template.options);

        res.statusCode = 200;
        res.json(response[0].message.content);

        console.log(`${req._cid} > Running '${req.path} - done`);

    } catch (error) {
        console.log(`${req._cid} > Unhandled error`);
        console.log(`${req._cid} > ${error}`);

        res.statusCode = 500;
        res.json({ error: error.message });
    }

});

module.exports = router;