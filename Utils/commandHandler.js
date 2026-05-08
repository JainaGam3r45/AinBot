const { Client } = require("discord.js");
const addonCommand = require("./addons/command");
const { getEnabledAddonCommands } = require("./addons/manager");
const { loadYamlCommands } = require("./yamlengine/commands");
const { loadMessageTemplates } = require("./yamlengine/messages");
const { loadMetaDefinitions } = require("./yamlengine/meta");

/**
 * Loads slash command files and publishes them to Discord.
 * @param {Client} client Discord client with a commands collection.
 */
async function loadCommands(client) {
    const logger = require("./logger");

    await client.application.commands.cache.clear();
    await client.commands.clear();

    const commands = [];
    const runtimeCommands = [
        addonCommand,
        ...getEnabledAddonCommands(client),
    ];

    client.yamlMessages = await loadMessageTemplates(logger);
    client.yamlMetas = await loadMetaDefinitions(logger);

    const yamlCommands = await loadYamlCommands(client, client.yamlMessages, logger);

    for (const command of [...runtimeCommands, ...yamlCommands]) {
        if (client.commands.has(command.data.name)) {
            logger.issue(`Skipped command ${command.data.name} because another command already uses that name.`);
            continue;
        }

        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());

        logger.debug(`Registered command ${command.data.name}`);
    }

    await client.application.commands.set(commands);

    logger.info("Commands loading completed.");
}

module.exports = { loadCommands };
