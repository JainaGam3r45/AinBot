const { MessageFlags, SlashCommandBuilder } = require("discord.js");
const { reloadBot } = require("./reloader");
const { safeReply } = require("./safereply");

const data = new SlashCommandBuilder()
    .setName("reload")
    .setDescription("Reload bot addons, commands, events, and YAML configs.");

module.exports = {
    data,
    developer: true,
    async execute(interaction, client) {
        await interaction.deferReply({
            flags: MessageFlags.Ephemeral,
        });

        await reloadBot(client);

        return safeReply(interaction, {
            content: "Reload completed. Addons, commands, events, and configs are up to date.",
            flags: MessageFlags.Ephemeral,
        }, {
            mode: "preferedit",
        });
    },
};
