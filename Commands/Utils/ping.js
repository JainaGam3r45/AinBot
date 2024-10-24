const { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('¡Obtener el ping actual del bot!')
    .setDMPermission(false),
    /**
     *
     * @param {ChatInputCommandInteraction} interaction
     */
    async execute(interaction) {

        await interaction.channel.sendTyping();

        const botPing = Date.now() - interaction.createdTimestamp; // Response Time
        const apiPing = Math.round(interaction.client.ws.ping); // API

        const pingEmbed = new EmbedBuilder()
        .setColor('Random')
        .setTitle("🏓 Pong!")
        .addFields(
            { name: "Ping del Bot", value: `${botPing}ms`, inline: true },
            { name: "Ping de la API", value: `${apiPing}ms`, inline: true }
        )
        .setFooter({ 
            text: `Solicitado por ${interaction.user.username}`, 
            iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
        });

        await interaction.editReply({ embeds: [pingEmbed] });

    },
};