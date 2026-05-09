const { ActivityType, ChatInputCommandInteraction, Client, Events, MessageFlags, PresenceUpdateStatus } = require("discord.js");
const { loadCommands } = require("../Utils/commandHandler");
const logger = require("../Utils/logger");
const { isHandledInteractionResponseError, safeReply } = require("../Utils/safereply");

module.exports = [
    {
        name: Events.ClientReady,
        once: true,
        /**
         * Loads YAML commands and sets the bot presence when Discord is ready.
         * @param {Client} client Ready Discord client.
         */
        async execute(client) {
            await loadCommands(client);

            client.user.setPresence({
                activities: [
                    {
                        name: "Ainbot",
                        type: ActivityType.Playing,
                    },
                ],
                status: PresenceUpdateStatus.Idle,
            });

            logger.info(`${client.user.tag} (${client.user.id}) is online and ready to serve you.`);
        },
    },
    {
        name: Events.InteractionCreate,
        /**
         * Routes slash command interactions to their YAML handlers.
         * @param {ChatInputCommandInteraction} interaction Incoming interaction.
         * @param {Client} client Discord client with command collection.
         */
        async execute(interaction, client) {
            if (!interaction.isChatInputCommand()) return;

            const command = client.commands.get(interaction.commandName);
            if (!command) {
                return safeReply(interaction, {
                    content: "Command outdated or no longer available.",
                    flags: MessageFlags.Ephemeral,
                });
            }

            if (command.developer && !isDeveloper(interaction.user.id)) {
                return safeReply(interaction, {
                    content: "Oops! You discovered a developer command.",
                    flags: MessageFlags.Ephemeral,
                });
            }

            try {
                await command.execute(interaction, client);
            } catch (error) {
                if (isHandledInteractionResponseError(error)) return;

                logger.recovered(`Command ${interaction.commandName} failed`, error);

                await safeReply(interaction, {
                    content: "There was an error while running this command.",
                    flags: MessageFlags.Ephemeral,
                }, {
                    mode: "preferedit",
                });
            }
        },
    },
];

function isDeveloper(userId) {
    return String(process.env.DEVELOPERS_IDS || "")
        .split(/[,\s[\]'"]+/)
        .filter(Boolean)
        .includes(userId);
}
