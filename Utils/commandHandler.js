const { Client } = require("discord.js");

/**
 * Loads slash command files and publishes them to Discord.
 * @param {Client} client Discord client with a commands collection.
 */
async function loadCommands(client) {
    const { loadFiles } = require("../Functions/fileLoader");
    const path = require('path');
    const logger = require("./logger");

    await client.application.commands.cache.clear();
    await client.commands.clear();

    const commands = [];

    const files = await loadFiles("Commands");

    for (const file of files) {
        try {
            const command = require(file);
            const fileName = path.basename(file);

            client.commands.set(command.data.name, command);
            commands.push(command.data.toJSON());

            logger.debug(`Loaded command ${command.data.name} from ${fileName}`);
        } catch (error) {
            logger.error(`Could not load command from ${file}.`, error);
        }
    }

    await client.application.commands.set(commands);

    logger.info("Commands loading completed.");
}

module.exports = { loadCommands };
