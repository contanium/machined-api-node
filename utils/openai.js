const axios = require("axios");
const crypto = require("crypto");
const supabase = require("./supabase");
const limiter = require("async-rate-limit");
const limits = {};

const openai = axios.create({
    baseURL: "https://api.openai.com/v1",
    headers: { "Content-Type": "application/json" },
});

limits["gpt-3.5-turbo-0301"] = {};
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

        // Cache
        const cache = crypto.createHash('md5').update(JSON.stringify({ metadata, options, messages })).digest('hex');
        const cached = await supabase.from("openai_cache").select('*').eq("hash", cache).limit(1);

        if (cached.data.length > 0){
          console.log("Returning cached openai request");
          return cached.data[0].response;
        }

        // Rate limit the calls to the chat endpoints
        const hash = crypto.createHash('md5').update(key).digest('hex');
        limits[model][hash] = limits[model][hash] || new limiter({ limit: 1, timespan: 1000 }); // TODO - limits based on model
        await limits[model][hash].perform(() => {});

        request = { model: model, messages, ...options };
        response = await retry(
            () => openai.post("/chat/completions", request, { headers: {"Authorization": `Bearer ${key}`}}),//.then(res => console.log(JSON.stringify({ "timestamp": Date.now(), "remote-address":"-", "method":"POST", "url":"https://api.openai.com/v1/chat/completions", "status":res.status, "content-length":"-", "referrer":"-", "user-agent":"-", "req-headers":res.request.getHeaders(), "res-headers":res.headers }))),
            (num, delay) => console.log(`${cid} > Rate limit from openai, retry number ${num} in ${delay} ms`),
            e => e?.response?.status == 429 || e?.response?.status == 502 || e?.response?.status == 503,
            5);

        await supabase.from('openai_requests').insert({ trace: cid, app: app.id, metadata: metadata, endpoint: "/chat/completions", request: request, response: response.data, metadata: metadata, success: true });
        await supabase.from('openai_cache').insert({ trace: cid, metadata: metadata, hash: cache, response: response.data.choices });

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

function retry(promise, onRetry, shouldRetry, maxRetries) {
    // Notice that we declare an inner function here
    // so we can encapsulate the retries and don't expose
    // it to the caller. This is also a recursive function
    async function retryWithBackoff(retries) {
      // Here is where the magic happens.
      // on every retry, we increase the time to wait exponentially.
      // Here is how it looks for a `maxRetries` = 4
      // (2 ** 1) * 1000 = 2000 ms
      // (2 ** 2) * 1000 = 4000 ms
      // (2 ** 3) * 1000 = 8000 ms
      const timeToWait = 2 ** retries * 1000;
      try {
        // Make sure we don't wait on the first attempt
        if (retries > 0) {
          console.log(`retry, waiting for ${timeToWait}ms...`);
          await waitFor(timeToWait);
        }
        //console.log("running work");
        return await promise();
      } catch (e) {
        // only retry if we didn't reach the limit
        // otherwise, let the caller handle the error
        if (shouldRetry(e) && retries < maxRetries) {
          onRetry(retries + 1, timeToWait);
          return retryWithBackoff(retries + 1);
        } else {
          console.warn("Max retries reached. Bubbling the error up");
          throw e;
        }
      }
    }

  return retryWithBackoff(0);
}

function waitFor(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

module.exports = { prompt, moderate, chat };