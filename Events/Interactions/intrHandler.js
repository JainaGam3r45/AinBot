const { ChatInputCommandInteraction } = require("discord.js");

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

            command.execute(interaction, client);
        } else if (interaction.isButton()) {
            const buttonId = interaction.customId.split("_");
            const button = client.buttons.get(buttonId[0]);
            if (!button) return;
            button.execute(interaction, client, buttonId.slice(1));
        } else {
            return;
        }
    },
};