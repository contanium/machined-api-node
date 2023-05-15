const axios = require("axios");
const crypto = require("crypto");
const supabase = require("./supabase");
const limiter = require("async-rate-limit");
const limits = {};

const openai = axios.create({
    baseURL: "https://api.openai.com/v1",
    headers: { "Content-Type": "application/json" },
});

limits["gpt-3.5-turbo"] = {};
limits["gpt-4"] = {};

async function prompt(prompt, options = {}, version = 999) {
    var prompt = await supabase.from("openai_prompts").select('*, model (name)').eq("name", prompt).lte("version", version).order('version', { ascending: false }).limit(1);
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

async function moderate(cid, app, key, metadata, input, options = {}) {
    var request;
    var response;

    try {
        request = { input: input, ...options };
        response = await openai.post("/moderations", request, { headers: {"Authorization": `Bearer ${key}`}});

        await supabase.from("openai_requests").insert({ trace: cid, app: app.id, metadata: metadata, endpoint: "/moderations", request: request, response: response.data, success: true });

        return response.data.results[0];

    } catch (error) {
        console.error("OpenAI: Error getting moderation:", error);
        await supabase.from("openai_requests").insert({ trace: cid, app: app.id, metadata: metadata, endpoint: "/moderations", request: request, response: error, metadata: metadata, success: false });
        
        if (error.response.status == 401) throw new Error("OpenAI (moderate): Invalid API Key");
        if (error.response.status == 429) throw new Error("OpenAI (moderate): Rate limit reached");
        if (error.response.status == 500) throw new Error("OpenAI (moderate): Unexpected error");
        throw new Error("OpenAI (moderate): Unknown error");
    }
}

async function chat(cid, app, key, metadata, messages, options = {}) {
    var request;
    var response;

    try {
        const model = options.model || "gpt-3.5-turbo";

        // Rate limit the calls to the chat endpoints
        const hash = crypto.createHash('md5').update(key).digest('hex');
        limits[model][hash] = limits[model][hash] || new limiter({ limit: 1, timespan: 1000 }); // TODO - limits based on model
        await limits[model][hash].perform(() => {});

        request = { model: model, messages, ...options };
        response = await openai.post("/chat/completions", request, { headers: {"Authorization": `Bearer ${key}`}});

        await supabase.from('openai_requests').insert({ trace: cid, app: app.id, metadata: metadata, endpoint: "/chat/completions", request: request, response: response.data, metadata: metadata, success: true });

        return response.data.choices;

    } catch (error) {
        console.error("OpenAI: Error getting chat completion:", error);
        await supabase.from('openai_requests').insert({ trace: cid, app: app.id, metadata: metadata, endpoint: "/chat/completions", request: request, response: error, metadata: metadata, success: false });

        if (error.response.status == 401) throw new Error("OpenAI (chat): Invalid API Key, please provide a valid api key");
        if (error.response.status == 429) throw new Error("OpenAI (chat): Rate limit reached, please try again later");
        if (error.response.status == 500) throw new Error("OpenAI (chat): Unexpected error");
        throw new Error("OpenAI (chat): Unknown error");
    }
}

module.exports = { prompt, moderate, chat };