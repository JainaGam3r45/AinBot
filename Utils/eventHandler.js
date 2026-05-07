const { Client } = require("discord.js");
const { loadMessageTemplates } = require("./yamlengine/messages");
const { loadYamlEvents } = require("./yamlengine/events");

/**
 * Loads event files and registers their listeners on the Discord client.
 * @param {Client} client Discord client with events and eventDispatchers collections.
 */
async function loadEvents (client) {
    const { loadFiles } = require("./fileLoader");
    const logger = require("./logger");

    client.eventDispatchers ??= new Map();

    for (const dispatcher of client.eventDispatchers.values()) {
        dispatcher.target.removeListener(dispatcher.name, dispatcher.execute);
    }

    client.eventDispatchers.clear();
    await client.events.clear();

    client.yamlMessages ??= await loadMessageTemplates(logger);

    const files = await loadFiles("Events");
    const eventGroups = new Map();

    for (const file of files) {
        try {
            const loadedEvents = normalizeEvents(require(file));

            for (const event of loadedEvents) {
                const groupKey = `${event.rest ? "rest" : "client"}:${event.name}`;
                const group = eventGroups.get(groupKey) ?? {
                    name: event.name,
                    rest: Boolean(event.rest),
                    handlers: [],
                };

                group.handlers.push({
                    file,
                    once: Boolean(event.once),
                    execute: event.execute,
                    ran: false,
                });

                eventGroups.set(groupKey, group);

                logger.debug(`Loaded event ${event.name} from ${file}`);
            }
        } catch (error) {
            logger.issue(`Failed to load event from ${file}`, error);
        }
    }

    const yamlEvents = await loadYamlEvents(client, client.yamlMessages, logger);

    for (const event of yamlEvents) {
        const groupKey = `${event.rest ? "rest" : "client"}:${event.name}`;
        const group = eventGroups.get(groupKey) ?? {
            name: event.name,
            rest: Boolean(event.rest),
            handlers: [],
        };

        group.handlers.push({
            file: event.yamlName,
            once: Boolean(event.once),
            execute: event.execute,
            ran: false,
        });

        eventGroups.set(groupKey, group);
    }

    for (const group of eventGroups.values()) {
        registerEventGroup(client, group, logger);
    }

    logger.info("Events loading completed.");
}

/**
 * Registers the listener that runs every handler for one Discord event.
 * @param {Client} client Discord client receiving the listener.
 * @param {object} group Event group to register.
 * @param {object} logger Logger used for runtime failures.
 */
function registerEventGroup(client, group, logger) {
    const target = group.rest ? client.rest : client;
    const shouldRunOnce = group.handlers.every((handler) => handler.once);
    const execute = async (...args) => {
        for (const handler of group.handlers) {
            if (handler.once && handler.ran) continue;

            try {
                handler.ran = true;
                await handler.execute(...args, client);
            } catch (error) {
                logger.recovered(`Event ${group.name} failed in ${handler.file}`, error);
            }
        }
    };

    client.events.set(group.name, {
        execute,
        handlers: group.handlers,
        rest: group.rest,
    });

    client.eventDispatchers.set(`${group.rest ? "rest" : "client"}:${group.name}`, {
        target,
        name: group.name,
        execute,
    });

    if (shouldRunOnce) {
        target.once(group.name, execute);
    } else {
        target.on(group.name, execute);
    }

    logger.debug(`Registered ${group.handlers.length} handler(s) for ${group.name}.`);
}

function normalizeEvents(value) {
    return Array.isArray(value) ? value : [value];
}

module.exports = { loadEvents };
