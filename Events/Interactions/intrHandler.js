const { ChatInputCommandInteraction, Client, Events, MessageFlags } = require("discord.js");
const logger = require("../../Utils/logger");

module.exports = {
    name: Events.InteractionCreate,
    /**
     * Routes command and button interactions to their handlers.
     * @param {ChatInputCommandInteraction} interaction Incoming interaction.
     * @param {Client} client Discord client with command and button collections.
     */
    async execute(interaction, client) {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command)
                return interaction.reply({
                    content: `Command outdated or no longer available.`,
                    flags: MessageFlags.Ephemeral,
                });

            if (command.developer && !process.env.DEVELOPERS_IDS.includes(interaction.user.id))
                return interaction.reply({
                    content: `Oops! You discovered a developer command.`,
                    flags: MessageFlags.Ephemeral,
                });

            try {
                await command.execute(interaction, client);
            } catch (error) {
                logger.recovered(`Command ${interaction.commandName} failed`, error);

                const message = {
                    content: "There was an error while running this command.",
                    flags: MessageFlags.Ephemeral,
                };

                if (interaction.deferred || interaction.replied) {
                    await interaction.followUp(message);
                } else {
                    await interaction.reply(message);
                }
            }
        } else if (interaction.isButton()) {
            const buttonId = interaction.customId.split("_");
            const button = client.buttons.get(buttonId[0]);
            if (!button) return;

            try {
                await button.execute(interaction, client, buttonId.slice(1));
            } catch (error) {
                logger.recovered(`Button ${buttonId[0]} failed`, error);
            }
        } else {
            return;
        }
    },
};
