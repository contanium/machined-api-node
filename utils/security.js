const supabase = require("./supabase");

async function authenticate(req, options = {}) {
    var app = await supabase.from("apps").select().eq("name", req.headers['x-app-id']).eq("api_key", req.headers['x-api-key']).limit(1);
    
    if (app.error || !app.data || app.data.length == 0){
        console.log(app);
        return undefined;
    } else{
        return { id: app.data[0].id, defaults: app.data[0].defaults };
    }   
}

module.exports = { authenticate };