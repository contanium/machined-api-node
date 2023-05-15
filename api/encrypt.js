const security = require("./../utils/security");
const express = require("express");

const router = express.Router();


router.post("/encrypt", async (req, res) => {
    try {

        console.log(`${req._cid} > Encrypting user api key`);

        const data = req.body.api_key;
        const key = req._app.encryption_key;

        const encrypted = await security.encrypt(data, key);

        res.statusCode = 200;
        res.json({ data: encrypted.data, secret: encrypted.secret });

        console.log(`${req._cid} > Encrypting user api key - done`);

    } catch (error) {
        res.statusCode = 500;
        res.json("Unexpected error");
    }
});

module.exports = router;