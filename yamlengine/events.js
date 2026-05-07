const { Events } = require("discord.js");
const { loadYamlFiles } = require("./files");
const { createRuntimeContext } = require("./context");
const { runActions, validateActions } = require("./actions");
const { evaluateConditions, validateConditions } = require("./conditions");

const triggers = {
    messageCreate: Events.MessageCreate,
    guildMemberAdd: Events.GuildMemberAdd,
    guildMemberRemove: Events.GuildMemberRemove,
    buttonClick: Events.InteractionCreate,
    selectMenuSubmit: Events.InteractionCreate,
};

/**
 * Loads YAML event handlers.
 * @param {object} client Discord client.
 * @param {Map} messages Reusable message templates.
 * @param {object} logger Logger used for invalid configs.
 */
async function loadYamlEvents(client, messages, logger) {
    const files = await loadYamlFiles("configs/events", logger);
    const events = [];

    for (const file of files) {
        try {
            const event = createYamlEvent(file.value, file.file, messages);

            events.push(event);
            logger.debug(`Loaded YAML event ${event.yamlName} from ${file.file}`);
        } catch (error) {
            logger.issue(`Failed to load YAML event from ${file.file}`, error);
        }
    }

    return events;
}

function createYamlEvent(config, file, messages) {
    validateEventConfig(config, messages);

    return {
        yaml: true,
        yamlName: config.name,
        name: triggers[config.trigger],
        once: Boolean(config.once),
        /**
         * Runs the YAML event action list.
         */
        async execute(...args) {
            const client = args.at(-1);
            const context = createEventContext(config.trigger, args.slice(0, -1), client, messages);

            if (!context) return;
            if (!await evaluateConditions(config.conditions, context)) return;

            await runActions(config.actions, context);
        },
    };
}

function validateEventConfig(config, messages) {
    if (!config.name || typeof config.name !== "string") throw new Error("name must be a non-empty string.");
    if (!triggers[config.trigger]) throw new Error(`Unsupported trigger "${config.trigger}".`);
    if (!Array.isArray(config.actions) || config.actions.length === 0) throw new Error("actions must be a non-empty array.");

    const actionValidation = validateActions(config.actions, messages);
    if (!actionValidation.valid) throw new Error(actionValidation.reason);

    const conditionValidation = validateConditions(config.conditions);
    if (!conditionValidation.valid) throw new Error(conditionValidation.reason);
}

function createEventContext(trigger, args, client, messages) {
    switch (trigger) {
        case "messageCreate":
            return createRuntimeContext({
                client,
                message: args[0],
                messages,
            });
        case "guildMemberAdd":
        case "guildMemberRemove":
            return createRuntimeContext({
                client,
                member: args[0],
                user: args[0].user,
                messages,
            });
        case "buttonClick":
            return createInteractionContext(args[0], client, messages, "button");
        case "selectMenuSubmit":
            return createInteractionContext(args[0], client, messages, "select");
        default:
            return null;
    }
}

function createInteractionContext(interaction, client, messages, type) {
    if (type === "button" && !interaction.isButton()) return null;
    if (type === "select" && !interaction.isStringSelectMenu()) return null;

    const parts = interaction.customId.split("_");
    const variables = type === "button"
        ? getCustomIdVariables("button", interaction.customId, parts)
        : {
            ...getCustomIdVariables("select", interaction.customId, parts),
            select_values_count: interaction.values.length,
            select_values: interaction.values.join(", "),
            ...Object.fromEntries(interaction.values.map((value, index) => [`select_value_${index}`, value])),
        };

    return createRuntimeContext({
        client,
        interaction,
        messages,
        variables,
    });
}

function getCustomIdVariables(prefix, customId, parts) {
    const args = parts.slice(1);

    return {
        [`${prefix}_custom_id`]: customId,
        [`${prefix}_args_count`]: args.length,
        [`${prefix}_args`]: args.join(", "),
        ...Object.fromEntries(args.map((value, index) => [`${prefix}_arg_${index}`, value])),
    };
}

module.exports = {
    loadYamlEvents,
};
