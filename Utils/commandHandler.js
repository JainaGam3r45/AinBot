const { Client } = require("discord.js");
const { loadYamlCommands } = require("../yamlengine/commands");
const { loadMessageTemplates } = require("../yamlengine/messages");

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
    client.yamlMessages = await loadMessageTemplates(logger);

    for (const file of files) {
        try {
            const command = require(file);
            const fileName = path.basename(file);

            client.commands.set(command.data.name, command);
            commands.push(command.data.toJSON());

            logger.debug(`Loaded command ${command.data.name} from ${fileName}`);
        } catch (error) {
            logger.issue(`Failed to load command from ${file}`, error);
        }
    }

    const yamlCommands = await loadYamlCommands(client, client.yamlMessages, logger);

    for (const command of yamlCommands) {
        if (client.commands.has(command.data.name)) {
            logger.issue(`Skipped YAML command ${command.data.name} because another command already uses that name.`);
            continue;
        }

        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());

        logger.debug(`Registered YAML command ${command.data.name}`);
    }

    await client.application.commands.set(commands);

    logger.info("Commands loading completed.");
}

module.exports = { loadCommands };
