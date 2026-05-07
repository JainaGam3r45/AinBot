async function loadEvents (client) {
    const { loadFiles } = require('../Functions/fileLoader');
    const logger = require("./logger");

    await client.events.clear();

    const files = await loadFiles("Events");

    for (const file of files) {
        try {
            const event = require(file);

            const execute = async (...args) => {
                try {
                    await event.execute(...args, client);
                } catch (error) {
                    logger.error(`Event ${event.name} failed.`, error);
                }
            };

            client.events.set(event.name, execute);

            if (event.rest) {
                if (event.once) client.rest.once(event.name, execute);
                else client.rest.on(event.name, execute);
            } else {
                if (event.once) client.once(event.name, execute);
                else client.on(event.name, execute);
            }

            logger.debug(`Loaded event ${event.name} from ${file}`);
        } catch (error) {
            logger.error(`Could not load event from ${file}.`, error);
        }
    }

    logger.info("Events loading completed.");
}

module.exports = { loadEvents };
