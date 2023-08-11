const supabase = require("./../utils/supabase");
const openai = require("./../utils/openai");

async function title(cid, app, key, metadata, options = {}) {
    console.log(`${cid} > Generating title`);

    const prompt = await openai.prompt("x-generate-title", options);
    const response = await openai.chat(cid, app, key, metadata, prompt.messages, prompt.options);

    const title = response[0].message.content.replaceAll("\"", "");

    console.log(`${cid} > Generating title - done`);

    return title;
}

async function outline(cid, app, key, metadata, options = {}) {
    console.log(`${cid} > Generating outline`);

    const prompt = await openai.prompt("x-generate-outline", options);
    const response = await openai.chat(cid, app, key, metadata, prompt.messages, prompt.options);

    const outline = response[0].message.content;

    console.log(`${cid} > Generating outline - done`);

    return outline;
}

async function section(cid, app, key, metadata, index, options = {}) {
    console.log(`${cid} > Writing section ${index}`);

    options.model = options.model == "gpt-3.5-turbo" ? "gpt-3.5-turbo-16k" : options.model;
    //options.model = options.model == "gpt-4" ? "gpt-4-0314" : options.model;

    const prompt = await openai.prompt("x-generate-section", options);
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
            
            // HACK: The below 'references' hack/variant ensures that we only ever see links in the introduction (aka first section)...
            //sections[index] = await section(cid, app, key, metadata, index, { section: s, ...options, references: index == 0 ? options.references : ''} );
            
        })
    );

    // for (const [index, s] of options.outline.split("\n\n").entries()) {
    //     sections[index] = await section(cid, app, key, metadata, index, { section: s, ...options} );
    // }

    article = sections.join("\n\n");
    article = article.replaceAll("## Introduction\n", "");

    console.log(`${cid} > Generating article content - done`);

    return article;
}

module.exports = { title, outline, section, article };