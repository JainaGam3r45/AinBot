require('dotenv').config();
const CustomLogger = require('./Utils/CustomLogger');
const send = new CustomLogger();

const { Client, GatewayIntentBits, Partials, Collection, Events, ActivityType, PresenceUpdateStatus } = require('discord.js');
const client = new Client({
    intents: [Object.keys(GatewayIntentBits)],
    partials: [Object.keys(Partials)],
    allowedMentions: {
        parse: [ 'everyone' ]
    }
});

const { loadEvents } = require('./Utils/eventHandler');

client.setMaxListeners(0);

client.events = new Collection();

loadEvents(client);

client.login(process.env.BOT_TOKEN).then(() => {
    send.log(`&b[INFO] &a${client.user.tag}&f (&7${client.user.id}&f) has been successfully authenticated!`)
}).catch((e) => {
    send.log("&4[ERROR] &coops! It seems that there is an error with the TOKEN of the bot.\n"+e.message);
});