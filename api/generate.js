const security = require("./../utils/security");
const openai = require("./../utils/openai");
const express = require("express");
const axios = require("axios");
const api = axios.create({
    baseURL: "https://api.openai.com/v1",
    headers: { "Content-Type": "application/json" },
});

const router = express.Router();

router.get("/verify/:key", async (req, res) => {
    console.log(`${req._cid} > Verifying openai account`);

    var headers = { "Authorization": `Bearer ${req.params.key}` };
    var models = ["gpt-3.5-turbo", "gpt-3.5-turbo-16k", "gpt-4"];
    var result = [];

    try {
        var m = await api.get("/models", { headers });

        for (let i = 0; i < models.length; i++) {
            try {
                var response = await api.post("/chat/completions", { model: models[i], messages: [ { role: "user", content: "Hi" } ] }, { headers });
        
                result.push({ model: models[i], available: response.status == 200, tpm: parseInt(response.headers["x-ratelimit-limit-tokens"]), rpm: parseInt(response.headers["x-ratelimit-limit-requests"]) });
        
            } catch (error) {
                result.push({ model: models[i], available: false, tpm: 0, rpm: 0 });
            } 
        }

        // HACK: To figure out account status, we look at the limits (https://platform.openai.com/docs/guides/rate-limits/what-are-the-rate-limits-for-our-api)
        if (result.find(e => e.model == "gpt-3.5-turbo").tpm < 50000){
            res.statusCode = 402;
            res.statusMessage = "Specified openai account is on the free tier";
            res.json({});
        }
        else {
            res.statusCode = 200;
            res.json(result);
        }

    } catch (error) {
        res.statusCode = 401;
        res.statusMessage = "Provided openai api key invalid";
        res.json({});
    }

    console.log(`${req._cid} > Verifying openai account - done`);
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