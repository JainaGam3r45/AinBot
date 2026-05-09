const logger = require("./logger");
const { loadAddons } = require("./addons/manager");

const activeReloads = new WeakMap();

async function reloadBot(client) {
    const activeReload = activeReloads.get(client);

    if (activeReload) return activeReload;

    const reload = runReload(client).finally(() => {
        activeReloads.delete(client);
    });

    activeReloads.set(client, reload);

    return reload;
}

async function runReload(client) {
    const { loadCommands } = require("./commandHandler");
    const { loadEvents } = require("./eventHandler");

    logger.info("Reloading addons, events, commands, and YAML configs.");

    client.yamlMessages = null;
    client.yamlMetas = null;

    await loadAddons(client, logger);
    await loadEvents(client);
    await loadCommands(client);

    logger.info("Bot reload completed.");
}

module.exports = {
    reloadBot,
};
