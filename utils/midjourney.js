const { Midjourney } = require("midjourney");

async function imagine(prompt, options){
    const client = new Midjourney({
        //ServerId: options.server,
        ChannelId: options.channel,
        SalaiToken: options.token,
        Debug: false,
        Ws: true,
        //SessionId: process.env.SALAI_TOKEN || "8bb7f5b79c7a49f7d0824ab4b8773a81",
      });

      await client.init();

      try {
        const msg = await client.Imagine(prompt, (uri, progress) => { console.log("loading", uri, progress); });
        console.log({ msg });

        const upscaled = await client.Upscale({
            index: 1,
            msgId: msg.id,
            hash: msg.hash,
            flags: msg.flags,
            content: msg.content,
            loading: (uri, progress) => {
              console.log("Upscale.loading", uri, "progress", progress);
            },
        });

        client.Close();
        return upscaled;

      } catch (error) {
        client.Close();
        return null;
      }

      
}

module.exports = { imagine };