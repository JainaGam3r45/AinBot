const { loadCommands } = require("../../Utils/commandHandler");
const { Client, ActivityType, Events, PresenceUpdateStatus } = require('discord.js');
const logger = require("../../Utils/logger");

module.exports = {
    name: Events.ClientReady,
    once: true,
    /**
     * 
     * @param {Client} client 
     */
    async execute(client) {

        await loadCommands(client);

        client.user.setPresence({ activities: [{ name: 'Ainbot', type: ActivityType.Playing }], status: PresenceUpdateStatus.Idle });

        logger.info(`${client.user.tag} (${client.user.id}) is online and ready to serve you.`);

    },
};
