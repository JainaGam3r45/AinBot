const {
    ChannelType,
    ChatInputCommandInteraction,
    Client,
    InteractionContextType,
    PermissionFlagsBits,
    SlashCommandBuilder,
} = require("discord.js");
const { loadYamlFiles } = require("./files");
const { createRuntimeContext } = require("./context");
const { runActions, validateActions } = require("./actions");
const { evaluateConditions, validateConditions } = require("./conditions");

const optionTypes = new Set([
    "string",
    "integer",
    "number",
    "boolean",
    "user",
    "channel",
    "role",
    "mentionable",
]);

const contextTypes = {
    guild: InteractionContextType.Guild,
    botdm: InteractionContextType.BotDM,
    privatechannel: InteractionContextType.PrivateChannel,
};

/**
 * Loads YAML slash commands.
 * @param {object} client Discord client.
 * @param {Map} messages Reusable message templates.
 * @param {object} logger Logger used for invalid configs.
 */
async function loadYamlCommands(client, messages, logger) {
    const files = await loadYamlFiles("configs/commands", logger);
    const commands = [];

    for (const file of files) {
        try {
            const command = createYamlCommand(file.value, file.file, messages);

            commands.push(command);
            logger.debug(`Loaded YAML command ${command.data.name} from ${file.file}`);
        } catch (error) {
            logger.issue(`Failed to load YAML command from ${file.file}`, error);
        }
    }

    return commands;
}

function createYamlCommand(config, file, messages) {
    validateCommandConfig(config, messages);

    const builder = new SlashCommandBuilder()
        .setName(config.name)
        .setDescription(config.description);

    if (config.contexts) {
        builder.setContexts(...list(config.contexts).map(resolveContext));
    } else {
        builder.setContexts(InteractionContextType.Guild);
    }

    if (config.permissions) {
        builder.setDefaultMemberPermissions(resolvePermissions(config.permissions));
    }

    for (const option of config.options || []) {
        addOption(builder, option);
    }

    return {
        yaml: true,
        developer: Boolean(config.developer),
        data: builder,
        /**
         * Runs the YAML command action list.
         * @param {ChatInputCommandInteraction} interaction Slash command interaction.
         * @param {Client} client Discord client.
         */
        async execute(interaction, client) {
            const context = createRuntimeContext({
                client,
                interaction,
                messages,
                variables: collectOptionVariables(interaction, config.options || []),
            });

            if (!await evaluateConditions(config.conditions, context)) return;

            await runActions(config.actions, context);
        },
    };
}

function validateCommandConfig(config, messages) {
    if (!isCommandName(config.name)) throw new Error("name must be 1-32 lowercase characters, numbers, underscores, or dashes.");
    if (!isDescription(config.description)) throw new Error("description must be 1-100 characters.");
    if (!Array.isArray(config.actions) || config.actions.length === 0) throw new Error("actions must be a non-empty array.");
    const actionValidation = validateActions(config.actions, messages);
    if (!actionValidation.valid) throw new Error(actionValidation.reason);

    const conditionValidation = validateConditions(config.conditions);
    if (!conditionValidation.valid) throw new Error(conditionValidation.reason);

    if (config.options && (!Array.isArray(config.options) || config.options.length > 25)) {
        throw new Error("options must be an array with at most 25 entries.");
    }

    for (const option of config.options || []) {
        if (!isCommandName(option.name)) throw new Error(`option "${option.name}" has an invalid name.`);
        if (!isDescription(option.description)) throw new Error(`option "${option.name}" needs a 1-100 character description.`);
        if (!optionTypes.has(option.type)) throw new Error(`option "${option.name}" has unsupported type "${option.type}".`);
    }
}

function addOption(builder, option) {
    const apply = (slashOption) => {
        slashOption
            .setName(option.name)
            .setDescription(option.description)
            .setRequired(Boolean(option.required));

        if (option.choices) {
            slashOption.addChoices(...option.choices.map((choice) => ({
                name: String(choice.name),
                value: choice.value,
            })));
        }

        if (option["min-length"] !== undefined && slashOption.setMinLength) slashOption.setMinLength(Number(option["min-length"]));
        if (option["max-length"] !== undefined && slashOption.setMaxLength) slashOption.setMaxLength(Number(option["max-length"]));
        if (option["min-value"] !== undefined && slashOption.setMinValue) slashOption.setMinValue(Number(option["min-value"]));
        if (option["max-value"] !== undefined && slashOption.setMaxValue) slashOption.setMaxValue(Number(option["max-value"]));
        if (option["channel-type"] && slashOption.addChannelTypes) slashOption.addChannelTypes(resolveChannelType(option["channel-type"]));

        return slashOption;
    };

    switch (option.type) {
        case "string":
            builder.addStringOption(apply);
            break;
        case "integer":
            builder.addIntegerOption(apply);
            break;
        case "number":
            builder.addNumberOption(apply);
            break;
        case "boolean":
            builder.addBooleanOption(apply);
            break;
        case "user":
            builder.addUserOption(apply);
            break;
        case "channel":
            builder.addChannelOption(apply);
            break;
        case "role":
            builder.addRoleOption(apply);
            break;
        case "mentionable":
            builder.addMentionableOption(apply);
            break;
    }
}

function collectOptionVariables(interaction, options) {
    const variables = {};

    for (const option of options) {
        const value = getOptionValue(interaction, option);

        variables[`option_${option.name}_is_provided`] = value !== null && value !== undefined;
        variables[`option_${option.name}`] = formatOptionValue(value);

        if (value && typeof value === "object") {
            variables[`option_${option.name}_id`] = value.id || "";
            variables[`option_${option.name}_mention`] = getMention(value);
            variables[`option_${option.name}_name`] = value.name || value.username || value.displayName || "";
            variables[`option_${option.name}_username`] = value.username || "";
            variables[`option_${option.name}_display_name`] = value.displayName || value.globalName || value.username || value.name || "";
        }
    }

    return variables;
}

function getOptionValue(interaction, option) {
    switch (option.type) {
        case "string":
            return interaction.options.getString(option.name);
        case "integer":
            return interaction.options.getInteger(option.name);
        case "number":
            return interaction.options.getNumber(option.name);
        case "boolean":
            return interaction.options.getBoolean(option.name);
        case "user":
            return interaction.options.getUser(option.name);
        case "channel":
            return interaction.options.getChannel(option.name);
        case "role":
            return interaction.options.getRole(option.name);
        case "mentionable":
            return interaction.options.getMentionable(option.name);
        default:
            return null;
    }
}

function formatOptionValue(value) {
    if (value === null || value === undefined) return "";
    if (typeof value === "object") return value.id || value.name || value.username || "";

    return value;
}

function getMention(value) {
    if (!value?.id) return "";
    if (value.type !== undefined && value.name) return `<#${value.id}>`;
    if (value.hexColor !== undefined) return `<@&${value.id}>`;

    return `<@${value.id}>`;
}

function resolveContext(value) {
    const key = String(value).replaceAll("_", "").replaceAll("-", "").toLowerCase();

    if (!Object.prototype.hasOwnProperty.call(contextTypes, key)) {
        throw new Error(`Unsupported command context "${value}".`);
    }

    return contextTypes[key];
}

function resolvePermissions(values) {
    return list(values).reduce((bits, value) => {
        const flag = normalizePermission(value);

        if (!flag) throw new Error(`Unsupported permission "${value}".`);

        return bits | flag;
    }, 0n);
}

function resolveChannelType(value) {
    const normalized = String(value).replaceAll("_", "").replaceAll("-", "").toLowerCase();
    const key = Object.keys(ChannelType).find((type) => type.toLowerCase() === normalized);

    if (!key) throw new Error(`Unsupported channel type "${value}".`);

    return ChannelType[key];
}

function normalizePermission(value) {
    const normalized = String(value).replaceAll("_", "").toLowerCase();
    const key = Object.keys(PermissionFlagsBits).find((permission) => permission.toLowerCase() === normalized);

    return key ? PermissionFlagsBits[key] : null;
}

function isCommandName(value) {
    return /^[a-z0-9_-]{1,32}$/.test(String(value || ""));
}

function isDescription(value) {
    const description = String(value || "");

    return description.length >= 1 && description.length <= 100;
}

function list(value) {
    return Array.isArray(value) ? value : [value];
}

module.exports = {
    loadYamlCommands,
};
