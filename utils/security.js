const supabase = require("./supabase");
const crypto = require("crypto");

async function authenticate(req, options = {}) {
    var app_id = req.headers["x-app-id"];
    var api_key = req.headers["x-api-key"];

    if (!app_id) throw new Error("The header 'x-app-id' is required");
    if (!api_key) throw new Error("The header 'x-api-key' is required");

    var app = await supabase.from("apps").select().eq("name", app_id).eq("api_key", api_key).limit(1);

    if (app.error || !app.data || app.data.length == 0) {
        console.log(app);
        throw new Error("Failed to authenticate calling app");
    } else {
        return { id: app.data[0].id, defaults: app.data[0].defaults, encryption_key: app.data[0].encryption_key, callback_key: app.data[0].callback_key };
    }
}

async function openai_key(req, options = {}) {
    const openai_api_key = req.headers["x-openai-api-key"];
    const openai_api_secret = req.headers["x-openai-api-secret"];

    if (!openai_api_key) throw new Error("The header 'x-openai-api-key' is required");
    if (!openai_api_secret) throw new Error("The header 'x-openai-api-secret' is required");

    try {
        return await decrypt(openai_api_key, req._app.encryption_key, openai_api_secret);
    } catch (error) {
        console.log(req._app);
        throw new Error("Failed to validate OpenAI API Key");
    }
}

async function encrypt(data, secret) {
    const algorithm = "aes-256-cbc";
    const secret_key = secret;
    const encryption_key = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, secret_key, encryption_key);

    var encrypted = cipher.update(data, "utf-8", "hex");
    encrypted += cipher.final("hex");

    return { data: encrypted, secret: encryption_key.toString('base64') };
}

async function decrypt(data, secret, salt) {

    const algorithm = "aes-256-cbc";
    const secret_key = secret;
    const encryption_key = Buffer.from(salt, 'base64');
    const decipher = crypto.createDecipheriv(algorithm, secret_key, encryption_key);

    var decrypted = decipher.update(data, "hex", "utf-8");
    decrypted += decipher.final("utf8");

    return decrypted;
}

module.exports = { authenticate, openai_key, encrypt, decrypt };