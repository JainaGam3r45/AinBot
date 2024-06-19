async function loadEvents (client) {
    const { loadFiles } = require('../Functions/fileLoader');
    const CustomLogger = require('../Utils/CustomLogger');
    const send = new CustomLogger();

    await client.events.clear();

    const Files = await loadFiles("Events");

    for (const file of Files) {
        try {
            const event = require(file);

            const execute = (...args) => event.execute(...args, client);
            client.events.set(event.name, execute);

            if (event.rest) {
                if (event.once) client.rest.once(event.name, execute);
                else client.rest.on(event.name, execute);
            } else {
                if (event.once) client.once(event.name, execute);
                else client.on(event.name, execute);
            }

            send.log(`&b[${event.name}] &a${file} ✅`);
        } catch (error) {
            send.error(`&c[Error] &7${file}: &4${error.message} ❌`);
        }
    }

    return send.log(`&2[✅] Events loading completed.`);
}

module.exports = { loadEvents };