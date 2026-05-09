const { ComponentType, Events } = require("discord.js");
const { loadYamlFiles } = require("./files");
const { createRuntimeContext } = require("./context");
const { runActions, validateActions } = require("./actions");
const { evaluateConditions, validateConditions } = require("./conditions");

const triggers = {
    buttonClick: Events.InteractionCreate,
    channelCreate: Events.ChannelCreate,
    channelDelete: Events.ChannelDelete,
    displayNameUpdate: Events.GuildMemberUpdate,
    everyDay: Events.ClientReady,
    everyHour: Events.ClientReady,
    everyMinute: Events.ClientReady,
    guildBoostAdd: Events.GuildMemberUpdate,
    guildBoostRemove: Events.GuildMemberUpdate,
    messageCreate: Events.MessageCreate,
    messageDelete: Events.MessageDelete,
    messageReactionAdd: Events.MessageReactionAdd,
    messageReactionRemove: Events.MessageReactionRemove,
    messageUpdate: Events.MessageUpdate,
    modalSubmit: Events.InteractionCreate,
    presenceUpdate: Events.PresenceUpdate,
    guildMemberAdd: Events.GuildMemberAdd,
    guildMemberRemove: Events.GuildMemberRemove,
    selectMenuSubmit: Events.InteractionCreate,
};

const timerDurations = {
    everyMinute: 60 * 1000,
    everyHour: 60 * 60 * 1000,
    everyDay: 24 * 60 * 60 * 1000,
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
        once: Boolean(config.once) || Boolean(timerDurations[config.trigger]),
        reloadReady: Boolean(timerDurations[config.trigger]),
        /**
         * Runs the YAML event action list.
         */
        async execute(...args) {
            const client = args.at(-1);

            if (timerDurations[config.trigger]) {
                registerTimerEvent(config, client, messages);
                return;
            }

            const context = await createEventContext(config.trigger, args.slice(0, -1), client, messages);

            await runEventActions(config, context);
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

async function createEventContext(trigger, args, client, messages) {
    switch (trigger) {
        case "channelCreate":
        case "channelDelete":
            return createRuntimeContext({
                client,
                channel: args[0],
                guild: args[0]?.guild,
                messages,
            });
        case "displayNameUpdate":
            return createDisplayNameUpdateContext(args[0], args[1], client, messages);
        case "guildMemberAdd":
        case "guildMemberRemove":
            return createRuntimeContext({
                client,
                member: args[0],
                user: args[0].user,
                messages,
            });
        case "guildBoostAdd":
            return createBoostContext(args[0], args[1], client, messages, "add");
        case "guildBoostRemove":
            return createBoostContext(args[0], args[1], client, messages, "remove");
        case "messageCreate":
        case "messageDelete":
            return createRuntimeContext({
                client,
                message: await fetchPartial(args[0]),
                messages,
            });
        case "messageReactionAdd":
        case "messageReactionRemove":
            return createReactionContext(args[0], args[1], client, messages);
        case "messageUpdate":
            return createMessageUpdateContext(args[0], args[1], client, messages);
        case "modalSubmit":
            return createInteractionContext(args[0], client, messages, "modal");
        case "presenceUpdate":
            return createPresenceUpdateContext(args[0], args[1], client, messages);
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
    if (type === "select" && !isSelectMenu(interaction)) return null;
    if (type === "modal" && !interaction.isModalSubmit()) return null;
    if (!interaction.customId?.startsWith("script_")) return null;

    const variables = getInteractionVariables(interaction, type);

    return createRuntimeContext({
        client,
        interaction,
        messages,
        variables,
    });
}

function getInteractionVariables(interaction, type) {
    if (type === "button") return getCustomIdVariables("button", interaction.customId);
    if (type === "modal") return getModalVariables(interaction);

    const values = interaction.values || [];

    return {
        ...getCustomIdVariables("select_menu", interaction.customId),
        ...getCustomIdVariables("select", interaction.customId),
        select_menu_values_count: values.length,
        select_menu_values: values.join(", "),
        select_values_count: values.length,
        select_values: values.join(", "),
        ...Object.fromEntries(values.flatMap((value, index) => [
            [`select_menu_value_${index}`, value],
            [`select_value_${index}`, value],
        ])),
    };
}

function getModalVariables(interaction) {
    const fields = interaction.fields?.fields;
    const values = {};

    if (fields) {
        for (const field of fields.values()) {
            Object.assign(values, getModalFieldVariables(field));
        }
    }

    return {
        ...getCustomIdVariables("modal", interaction.customId),
        ...values,
    };
}

function getModalFieldVariables(field) {
    switch (field.type) {
        case ComponentType.TextInput:
            return getModalTextInputVariables(field);
        case ComponentType.StringSelect:
            return getModalSelectVariables(field.customId, field.values || []);
        case ComponentType.FileUpload:
            return getModalFileVariables(field.customId, field.attachments);
        default:
            return getModalFallbackVariables(field);
    }
}

function getModalTextInputVariables(field) {
    const key = `modal_${field.customId}`;
    const value = field.value || "";

    return {
        [key]: value,
        [`${key}_length`]: value.length,
    };
}

function getModalSelectVariables(customId, values) {
    const key = `modal_${customId}`;
    const selectedValues = [...values].map(String);

    return {
        [key]: selectedValues.join(", "),
        [`${key}_count`]: selectedValues.length,
        ...Object.fromEntries(selectedValues.map((value, index) => [`${key}_value_${index}`, value])),
    };
}

function getModalFileVariables(customId, attachments) {
    const key = `modal_${customId}`;
    const files = attachments?.values ? [...attachments.values()] : [];
    const urls = files.map((file) => file.url || "");
    const variables = {
        [key]: urls.join(", "),
        [`${key}_count`]: files.length,
    };

    for (const [index, file] of files.entries()) {
        variables[`${key}_id_${index}`] = file.id || "";
        variables[`${key}_url_${index}`] = file.url || "";
        variables[`${key}_proxy_url_${index}`] = file.proxyURL || "";
        variables[`${key}_name_${index}`] = file.name || "";
        variables[`${key}_size_${index}`] = file.size || "";
        variables[`${key}_content_type_${index}`] = file.contentType || "";
    }

    return variables;
}

function getModalFallbackVariables(field) {
    if (Array.isArray(field.values)) {
        return getModalSelectVariables(field.customId, field.values);
    }

    if (field.attachments) {
        return getModalFileVariables(field.customId, field.attachments);
    }

    if (field.value !== undefined) {
        return getModalTextInputVariables(field);
    }

    return {};
}

function getCustomIdVariables(prefix, customId) {
    const parsed = parseCustomId(customId);

    return {
        [`${prefix}_custom_id`]: parsed.id,
        [`${prefix}_args_count`]: parsed.args.length,
        [`${prefix}_args`]: parsed.args.join(", "),
        ...Object.fromEntries(parsed.args.map((value, index) => [`${prefix}_arg_${index}`, value])),
    };
}

function parseCustomId(customId) {
    const parts = splitArguments(customId);

    return {
        id: parts[0],
        args: parts.slice(1),
    };
}

function splitArguments(value) {
    const parts = [];
    let current = "";
    let quote = null;

    for (const character of String(value)) {
        if ((character === "'" || character === "\"") && !quote) {
            quote = character;
            continue;
        }

        if (character === quote) {
            quote = null;
            continue;
        }

        if (character === ":" && !quote) {
            parts.push(current);
            current = "";
            continue;
        }

        current += character;
    }

    parts.push(current);

    return parts;
}

function createDisplayNameUpdateContext(oldMember, newMember, client, messages) {
    if (oldMember.displayName === newMember.displayName) return null;

    return createRuntimeContext({
        client,
        member: newMember,
        user: newMember.user,
        messages,
        variables: {
            old_display_name: oldMember.displayName,
            new_display_name: newMember.displayName,
        },
    });
}

function createBoostContext(oldMember, newMember, client, messages, mode) {
    const hadBoost = Boolean(oldMember.premiumSince);
    const hasBoost = Boolean(newMember.premiumSince);

    if (mode === "add" && (hadBoost || !hasBoost)) return null;
    if (mode === "remove" && (!hadBoost || hasBoost)) return null;

    return createRuntimeContext({
        client,
        member: newMember,
        user: newMember.user,
        messages,
    });
}

async function createReactionContext(reaction, user, client, messages) {
    const resolvedReaction = await fetchPartial(reaction);
    const message = await fetchPartial(resolvedReaction.message);
    const member = message.guild && !user.bot
        ? await message.guild.members.fetch(user.id).catch(() => null)
        : null;

    return createRuntimeContext({
        client,
        message,
        user,
        member,
        messages,
        variables: {
            reaction_emoji: resolvedReaction.emoji?.toString?.() || resolvedReaction.emoji?.name || "",
        },
    });
}

async function createMessageUpdateContext(oldMessage, newMessage, client, messages) {
    const resolvedOldMessage = await fetchPartial(oldMessage);
    const resolvedNewMessage = await fetchPartial(newMessage);

    return createRuntimeContext({
        client,
        message: resolvedNewMessage,
        messages,
        variables: {
            message_old_content: resolvedOldMessage.content || "",
        },
    });
}

function createPresenceUpdateContext(oldPresence, newPresence, client, messages) {
    return createRuntimeContext({
        client,
        guild: newPresence.guild,
        member: newPresence.member,
        user: newPresence.user,
        messages,
        variables: {
            old_status: oldPresence?.status || "offline",
            new_status: newPresence.status || "offline",
        },
    });
}

function isSelectMenu(interaction) {
    if (typeof interaction.isAnySelectMenu === "function") return interaction.isAnySelectMenu();

    return interaction.isStringSelectMenu();
}

async function fetchPartial(value) {
    if (value?.partial && value.fetch) return value.fetch();

    return value;
}

function registerTimerEvent(config, client, messages) {
    client.yamlEventTimers ??= new Set();

    const interval = setInterval(() => {
        runTimerEvent(config, client, messages).catch((error) => {
            client.emit("error", error);
        });
    }, timerDurations[config.trigger]);

    client.yamlEventTimers.add(interval);
}

async function runTimerEvent(config, client, messages) {
    for (const guild of client.guilds.cache.values()) {
        await runEventActions(config, createRuntimeContext({
            client,
            guild,
            messages,
        }));
    }
}

async function runEventActions(config, context) {
    if (!context) return;
    if (!await evaluateConditions(config.conditions, context)) return;

    await runActions(config.actions, context);
}

module.exports = {
    loadYamlEvents,
};
