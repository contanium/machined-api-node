const axios = require("axios");
const supabase = require("./supabase");
const limiter = require("async-rate-limit");

const openai = axios.create({
    baseURL: "https://api.openai.com/v1",
    headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
    },
});

const limits = {};

// TODO: Configure rate limits from database configuration
limits["gpt-3.5-turbo"] = new limiter({ limit: 30, timespan: 1000 });
limits["gpt-4"] = new limiter({ limit: 3, timespan: 1000 });


async function prompt(prompt, options = {}) {
    var prompt = await supabase.from("openai_prompts").select('*, model (name)').eq("name", prompt).order('version', { ascending: false }).limit(1);
    var messages = [];

    for (const message of prompt.data[0].messages){
        var content = message.content;

        for (const [key, value] of Object.entries(options)) {
            content = content.replaceAll(`{{${key}}}`, value);
        }

        messages.push({ role: message.role, content: content });
    }

    return { messages: messages, options: { model: options.model || prompt.data[0].model.name, temperature: prompt.data[0].temperature, top_p: prompt.data[0].top_p } };
}

async function moderate(cid, app, metadata, input, options = {}) {
    var request;
    var response;

    try {
        request = { input: input, ...options };
        response = await openai.post("/moderations", request);

        await supabase.from("openai_requests").insert({ trace: cid, app: app.id, metadata: metadata, endpoint: "/moderations", request: request, response: response.data, success: true });

        return response.data.results[0];

    } catch (error) {
        console.error("OpenAI: Error getting moderation:", error);
        await supabase.from("openai_requests").insert({ trace: cid, app: app.id, metadata: metadata, endpoint: "/moderations", request: request, response: error, metadata: metadata, success: false });
        throw error;
    }
}

async function chat(cid, app, metadata, messages, options = {}) {
    var request;
    var response;

    try {
        // Rate limit the calls to the chat endpoints
        await limits[options.model || "gpt-3.5-turbo"].perform(() => {});

        request = { model: options.model || "gpt-3.5-turbo", messages, ...options };
        response = await openai.post("/chat/completions", request);

        await supabase.from('openai_requests').insert({ trace: cid, app: app.id, metadata: metadata, endpoint: "/chat/completions", request: request, response: response.data, metadata: metadata, success: true });

        return response.data.choices;

    } catch (error) {
        console.error("OpenAI: Error getting chat completion:", error);
        await supabase.from('openai_requests').insert({ trace: cid, app: app.id, metadata: metadata, endpoint: "/chat/completions", request: request, response: error, metadata: metadata, success: false });
        throw error;
    }
}

module.exports = { prompt, moderate, chat };