const express = require("express");

const router = express.Router();

router.post("/streamer", async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'chunked');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    res.write("data: - Start streaming...\n\n");

    for (var i = 0; i < 10; i++) {

        res.write(`data: - iteration ${i}\n`);
        await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    res.write("data: - End streaming...\n");

    res.end();
});

module.exports = router;