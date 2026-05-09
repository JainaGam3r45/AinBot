const { MessageFlags, SlashCommandBuilder } = require("discord.js");
const logger = require("../runtime/logger");
const { safeReply } = require("../runtime/safereply");
const { setAddonEnabled } = require("./manager");
const { reloadBot } = require("../runtime/reloader");

const data = new SlashCommandBuilder()
    .setName("addons")
    .setDescription("Manage installed bot addons.")
    .addSubcommand((subcommand) => subcommand
        .setName("list")
        .setDescription("List installed addons."))
    .addSubcommand((subcommand) => subcommand
        .setName("enable")
        .setDescription("Enable an installed addon.")
        .addStringOption((option) => option
            .setName("name")
            .setDescription("Addon name.")
            .setRequired(true)))
    .addSubcommand((subcommand) => subcommand
        .setName("disable")
        .setDescription("Disable an installed addon.")
        .addStringOption((option) => option
            .setName("name")
            .setDescription("Addon name.")
            .setRequired(true)));

module.exports = {
    data,
    developer: true,
    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === "list") {
            return safeReply(interaction, {
                content: formatAddonList(client),
                flags: MessageFlags.Ephemeral,
            });
        }

        const name = interaction.options.getString("name", true);
        const installed = client.addons?.loaded?.has(name);

        if (!installed) {
            return safeReply(interaction, {
                content: `Addon "${name}" is not installed.`,
                flags: MessageFlags.Ephemeral,
            });
        }

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral,
        });

        await setAddonEnabled(client, name, subcommand === "enable", logger);
        await reloadBot(client);

        return interaction.editReply(`Addon "${name}" ${subcommand === "enable" ? "enabled" : "disabled"}.`);
    },
};

function formatAddonList(client) {
    const addons = [...(client.addons?.loaded?.values() || [])];

    if (!addons.length) {
        return `No addons installed. Put addon folders in \`${client.addons?.directory || "configs"}\`.`;
    }

    return addons
        .map((addon) => {
            const state = addon.enabled ? "enabled" : "disabled";
            const version = addon.version ? `v${addon.version}` : "unknown version";

            return `- ${addon.name} (${version}) - ${state} - ${addon.description}`;
        })
        .join("\n");
}
