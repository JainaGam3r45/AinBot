const { ChatInputCommandInteraction } = require("discord.js");
const logger = require("../../Utils/logger");

module.exports = {
    name: "interactionCreate",
    /**
     *
     * @param {ChatInputCommandInteraction} interaction
     */
    async execute(interaction, client) {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command)
                return interaction.reply({
                    content: `Comando desactualizado o ya no está disponible.`,
                    ephemeral: true,
                });

            if (command.developer && !process.env.DEVELOPERS_IDS.includes(interaction.user.id))
                return interaction.reply({
                    content: `¡Ups! Has descubierto un comando de desarrollador.`,
                    ephemeral: true,
                });

            try {
                await command.execute(interaction, client);
            } catch (error) {
                logger.error(`Command ${interaction.commandName} failed.`, error);

                const message = {
                    content: "There was an error while running this command.",
                    ephemeral: true,
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
                logger.error(`Button ${buttonId[0]} failed.`, error);
            }
        } else {
            return;
        }
    },
};
