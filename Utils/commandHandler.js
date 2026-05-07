const { Client } = require("discord.js");
const { loadYamlCommands } = require("./yamlengine/commands");
const { loadMessageTemplates } = require("./yamlengine/messages");

/**
 * Loads slash command files and publishes them to Discord.
 * @param {Client} client Discord client with a commands collection.
 */
async function loadCommands(client) {
    const logger = require("./logger");

    await client.application.commands.cache.clear();
    await client.commands.clear();

    const commands = [];

    client.yamlMessages = await loadMessageTemplates(logger);

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
