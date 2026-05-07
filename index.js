require("dotenv").config({ quiet: true });
const logger = require('./Utils/logger');
const { installCrashGuard, shutdown } = require("./Utils/crashguard");
const { createDatabase } = require("./database");

const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildExpressions,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildScheduledEvents,
        GatewayIntentBits.AutoModerationConfiguration,
        GatewayIntentBits.AutoModerationExecution,
        GatewayIntentBits.GuildMessagePolls,
        GatewayIntentBits.DirectMessagePolls,
    ],
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
        parse: [ 'everyone' ]
    }
});

const { loadEvents } = require('./Utils/eventHandler');

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

        await loadEvents(client);
        await client.login(process.env.BOT_TOKEN);
        logger.info("Discord login request completed.");
    } catch (error) {
        logger.critical("Failed to start the bot", error);
        await shutdown(client, 1);
    }
}
