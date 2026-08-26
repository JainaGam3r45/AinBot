const logger = require("./core/runtime/logger");
const { loadAddons } = require("./core/addons/manager");
const { installCrashGuard, shutdown } = require("./core/runtime/crashguard");
const {
    buildGatewayIntents,
    formatDisallowedIntentsHelp,
    isDisallowedIntentsError,
    resolvePrivilegedIntents,
} = require("./core/runtime/intents");
const { createDatabase } = require("./database");

const { Client, Partials, Collection } = require("discord.js");
const client = new Client({
    intents: buildGatewayIntents(),
    partials: [
        Partials.User,
        Partials.Channel,
        Partials.GuildMember,
        Partials.Message,
        Partials.Reaction,
        Partials.GuildScheduledEvent,
        Partials.ThreadMember,
        Partials.SoundboardSound,
        Partials.Poll,
        Partials.PollAnswer,
    ],
    allowedMentions: {
        parse: ["everyone"],
    },
});

const { loadEvents } = require("./core/loaders/eventhandler");

client.events = new Collection();
client.commands = new Collection();
client.buttons = new Collection();

installCrashGuard(client);
main();

/**
 * Starts the bot and opens the Discord session.
 */
async function main() {
    try {
        client.database = await createDatabase();
        logger.info(`Database provider: ${client.database.config.provider}.`);

        await loadAddons(client, logger);
        await loadEvents(client);
        await client.login(process.env.BOT_TOKEN);
        logger.info("Discord login request completed.");
    } catch (error) {
        if (isDisallowedIntentsError(error)) {
            logger.error(formatDisallowedIntentsHelp(error, resolvePrivilegedIntents()));
            logger.critical("Failed to start the bot due to disallowed privileged intents", error);
        } else {
            logger.critical("Failed to start the bot", error);
        }

        await shutdown(client, 1);
    }
}
