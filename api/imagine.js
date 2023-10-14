const midjourney = require("./../utils/midjourney");
const express = require("express");

const router = express.Router();


router.post("/imagine", async (req, res) => {

    try {

        console.log(`${req._cid} > Imagining '${req.path}`);

        const image = await midjourney.imagine(req.body.prompt, { server: "1123916349295575122", channel: "1085895504673644554", token: "" });

        res.statusCode = 200;
        res.json(image);

        console.log(`${req._cid} > Imagining '${req.path} - done`);

    } catch (error) {
        console.log(`${req._cid} > Unhandled error`);
        console.log(`${req._cid} > ${error}`);

        res.statusCode = 500;
        res.json({ error: error.message });
    }

});

module.exports = router;
