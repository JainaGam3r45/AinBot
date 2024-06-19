require('dotenv').config();
const CustomLogger = require('./Utils/CustomLogger');
const send = new CustomLogger();

const { Client, GatewayIntentBits, Partials, Events, ActivityType, PresenceUpdateStatus } = require('discord.js');
const client = new Client({
    intents: [Object.keys(GatewayIntentBits)],
    partials: [Object.keys(Partials)],
    allowedMentions: {
        parse: [ 'everyone' ]
    }
});

client.setMaxListeners(0);

client.on(Events.ClientReady, async (client) => {
    send.log(`&a[Event] &eClientReady response: &7${client.user.tag} is ready!`);

    client.user.setPresence({ activities: [{ name: 'Ainbot', type: ActivityType.Playing }], status: PresenceUpdateStatus.Idle });
});

client.login(process.env.BOT_TOKEN).then(() => {
    send.log(`&b[INFO] &a${client.user.tag}&f (&7${client.user.id}&f) has been successfully authenticated!`)
}).catch((e) => {
    send.log("&4[ERROR] &coops! It seems that there is an error with the TOKEN of the bot.\n"+e.message);
});