require("dotenv").config({ quiet: true });
const logger = require('./Utils/logger');

const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const client = new Client({
    intents: [Object.keys(GatewayIntentBits)],
    partials: [Object.keys(Partials)],
    allowedMentions: {
        parse: [ 'everyone' ]
    }
});

const { loadEvents } = require('./Utils/eventHandler');

client.events = new Collection();
client.commands = new Collection();
client.buttons = new Collection();

main();

async function main() {
    try {
        await loadEvents(client);
        await client.login(process.env.BOT_TOKEN);
        logger.info("Discord login request completed.");
    } catch (error) {
        logger.error("The bot could not start.", error);
        process.exitCode = 1;
    }
}
