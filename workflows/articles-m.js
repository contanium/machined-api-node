const supabase = require("./../utils/supabase");
const openai = require("./../utils/openai");

async function title(cid, app, key, metadata, options = {}) {
    console.log(`${cid} > Generating title`);

    const prompt = await openai.prompt("m-generate-title", options);
    const response = await openai.chat(cid, app, key, metadata, prompt.messages, prompt.options);

    const title = response[0].message.content.replaceAll("\"", "");

    console.log(`${cid} > Generating title - done`);

    return title;
}

async function outline(cid, app, key, metadata, options = {}) {
    console.log(`${cid} > Generating outline`);

    const prompt = await openai.prompt("m-generate-outline", options);
    const response = await openai.chat(cid, app, key, metadata, prompt.messages, prompt.options);

    const outline = response[0].message.content;

    console.log(`${cid} > Generating outline - done`);

    return outline;
}

async function section(cid, app, key, metadata, index, options = {}) {
    console.log(`${cid} > Writing section ${index}`);

    const prompt = await openai.prompt("m-generate-section", options);
    const response = await openai.chat(cid, app, key, metadata, prompt.messages, prompt.options);

    var section = response[0].message.content;

    console.log(`${cid} > Writing section ${index} - done`);

    return section;
}

async function article(cid, app, key, metadata, options = {}) {
    console.log(`${cid} > Generating article content`);

    var article;
    const sections = [];

    await Promise.all(
        await options.outline.split("\n\n").map(async (s, index) => {
            sections[index] = await section(cid, app, key, metadata, index, { section: s, ...options} );
        })
    );

    article = sections.join("\n\n");
    article = article.replaceAll("## Introduction\n", "");

    console.log(`${cid} > Generating article content - done`);

    return article;
}

module.exports = { title, outline, section, article };