const supabase = require("./../utils/supabase");
const openai = require("./../utils/openai");

async function title(cid, app, metadata, options = {}) {
    console.log(`${cid} > Generating title`);

    const prompt = await openai.prompt("generate-title", options);
    const response = await openai.chat(cid, app, metadata, prompt.messages, prompt.options);

    const title = response[0].message.content.replaceAll("\"", "");

    console.log(`${cid} > Generating title - done`);

    return title;
}

async function outline(cid, app, metadata, options = {}) {
    console.log(`${cid} > Generating outline`);

    const prompt = await openai.prompt("generate-outline", options);
    const response = await openai.chat(cid, app, metadata, prompt.messages, prompt.options);

    const outline = response[0].message.content;

    console.log(`${cid} > Generating outline - done`);

    return outline;
}

async function section(cid, app, metadata, index, options = {}) {
    console.log(`${cid} > Writing section ${index}`);

    const prompt = await openai.prompt("write-section", options);
    const response = await openai.chat(cid, app, metadata, prompt.messages, prompt.options);

    var section = response[0].message.content;

    console.log(`${cid} > Writing section ${index} - done`);

    return section;
}

async function article(cid, app, metadata, options = {}) {
    console.log(`${cid} > Generating article content`);

    var article;
    const sections = [];

    await Promise.all(
        await options.outline.split("\n\n").map(async (s, index) => {
            sections[index] = await section(cid, app, metadata, index, { section: s, ...options} );
        })
    );

    article = sections.join("\n\n");
    article = article.replaceAll("## Introduction\n", "");

    console.log(`${cid} > Generating article content - done`);

    return article;
}

module.exports = { title, outline, section, article };