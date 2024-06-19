const { loadCommands } = require("../../Utils/commandHandler");
const { Client, ActivityType, PresenceUpdateStatus } = require('discord.js');

const CustomLogger = require('../../Utils/CustomLogger');
const send = new CustomLogger();

module.exports = {
    name: 'ready',
    once: true,
    /**
     * 
     * @param {Client} client 
     */
    async execute(client) {

        send.log(`&b[INFO] &a${client.user.tag} &f(&7${client.user.id}&f) is online and ready to serve you.`);

        client.user.setPresence({ activities: [{ name: 'Ainbot', type: ActivityType.Playing }], status: PresenceUpdateStatus.Idle });

    },
};