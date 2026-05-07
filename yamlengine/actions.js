const { MessageFlags } = require("discord.js");
const { buildMessagePayload, validateMessageConfig } = require("./messages");
const { validateConditions } = require("./conditions");
const { addMetaValue, deleteMetaValue, setMetaValue } = require("./meta");
const { resolveString, resolveValue } = require("./placeholders");
const { safeEditReply, safeReply } = require("../Utils/safereply");

const actionIds = new Set([
    "reply",
    "sendMessage",
    "editReply",
    "addReaction",
    "deleteMessage",
    "addRole",
    "removeRole",
    "timeout",
    "setMeta",
    "addMeta",
    "deleteMeta",
    "log",
]);

/**
 * Runs a YAML action list.
 * @param {object[]} actions YAML action configs.
 * @param {object} context Runtime context.
 */
async function runActions(actions, context) {
    for (const action of actions || []) {
        await runAction(action, context);
    }
}

async function runAction(action, context) {
    if (Array.isArray(action.actions)) {
        if (await context.evaluateConditions(action.conditions, context)) {
            await runActions(action.actions, context);
        }

        return;
    }

    if (!action.id) {
        throw new Error("Action is missing an id.");
    }

    if (!await context.evaluateConditions(action.conditions, context)) return;

    const args = await resolveValue(action.args || {}, context);

    switch (action.id) {
        case "reply":
            await reply(args, context);
            break;
        case "sendMessage":
            await sendMessage(args, context);
            break;
        case "editReply":
            await editReply(args, context);
            break;
        case "addReaction":
            await addReaction(args, context);
            break;
        case "deleteMessage":
            await deleteMessage(context);
            break;
        case "addRole":
            await updateRole(args, context, "add");
            break;
        case "removeRole":
            await updateRole(args, context, "remove");
            break;
        case "timeout":
            await timeoutMember(args, context);
            break;
        case "setMeta":
            await setMetaValue(context, args.key, args.value);
            break;
        case "addMeta":
            await addMetaValue(context, args.key, args.value);
            break;
        case "deleteMeta":
            await deleteMetaValue(context, args.key);
            break;
        case "log":
            context.logger.info(await resolveString(args.message || args.value || "", context));
            break;
        default:
            throw new Error(`Unsupported action "${action.id}".`);
    }
}

async function reply(args, context) {
    const payload = await buildMessagePayload(args, context);

    if (context.interaction) {
        await safeReply(context.interaction, payload);
        return;
    }

    if (context.message) {
        await context.message.reply(payload);
        return;
    }

    throw new Error("reply action needs an interaction or message context.");
}

async function sendMessage(args, context) {
    const channel = await resolveChannel(args.channel, context);
    const payload = await buildMessagePayload(args, context);
    payload.flags &= ~MessageFlags.Ephemeral;

    if (!channel?.send) {
        throw new Error("sendMessage action could not resolve a sendable channel.");
    }

    await channel.send(payload);
}

async function editReply(args, context) {
    if (!context.interaction) {
        throw new Error("editReply action needs an interaction context.");
    }

    const payload = await buildMessagePayload(args, context);

    await safeEditReply(context.interaction, payload);
}

async function addReaction(args, context) {
    const message = context.message || await fetchInteractionReply(context);
    const values = Array.isArray(args.value) ? args.value : [args.value];

    for (const value of values.filter(Boolean)) {
        await message.react(value);
    }
}

async function deleteMessage(context) {
    if (!context.message?.deletable) return;

    await context.message.delete();
}

async function updateRole(args, context, mode) {
    const member = await resolveMember(args.member || args.user, context);
    const roles = Array.isArray(args.value) ? args.value : [args.value];

    if (!member?.roles) {
        throw new Error(`${mode}Role action could not resolve a guild member.`);
    }

    for (const roleValue of roles.filter(Boolean)) {
        const role = resolveRole(roleValue, context);

        if (!role) {
            throw new Error(`Could not resolve role "${roleValue}".`);
        }

        if (mode === "add") await member.roles.add(role);
        else await member.roles.remove(role);
    }
}

async function timeoutMember(args, context) {
    const member = await resolveMember(args.member || args.user, context);
    const seconds = Number(args.duration || args.seconds || 60);

    if (!member?.timeout) {
        throw new Error("timeout action could not resolve a guild member.");
    }

    await member.timeout(seconds * 1000, args.reason || "YAML action timeout");
}

async function resolveChannel(value, context) {
    if (!value) return context.channel;

    const id = String(value).replace(/[<#>]/g, "");
    const cached = context.client.channels.cache.get(id)
        || context.guild?.channels.cache.find((channel) => channel.name === value);

    if (cached) return cached;

    return context.client.channels.fetch(id);
}

async function resolveMember(value, context) {
    if (!value) return context.member;

    const id = String(value).replace(/[<@!>]/g, "");

    return context.guild?.members.cache.get(id) || context.guild?.members.fetch(id);
}

function resolveRole(value, context) {
    const roleValue = String(value).replace(/[<@&>]/g, "");

    return context.guild?.roles.cache.get(roleValue)
        || context.guild?.roles.cache.find((role) => role.name.toLowerCase() === String(value).toLowerCase());
}

async function fetchInteractionReply(context) {
    if (!context.interaction) {
        throw new Error("No message is available for this action.");
    }

    return context.interaction.fetchReply();
}

module.exports = {
    runActions,
    validateActions,
};

function validateActions(actions, messages = new Map()) {
    if (!Array.isArray(actions) || actions.length === 0) {
        return {
            valid: false,
            reason: "actions must be a non-empty array",
        };
    }

    for (const action of actions) {
        const conditionValidation = validateConditions(action.conditions);

        if (!conditionValidation.valid) return conditionValidation;

        if (Array.isArray(action.actions)) {
            const validation = validateActions(action.actions, messages);

            if (!validation.valid) return validation;
            continue;
        }

        if (!actionIds.has(action.id)) {
            return {
                valid: false,
                reason: `unsupported action "${action.id}"`,
            };
        }

        const messageValidation = validateActionMessage(action, messages);

        if (!messageValidation.valid) return messageValidation;
    }

    return {
        valid: true,
    };
}

function validateActionMessage(action, messages) {
    if (!["reply", "sendMessage", "editReply"].includes(action.id)) {
        return {
            valid: true,
        };
    }

    const args = action.args || {};

    if (args.message || args["message-id"] || args.messageId) {
        const messageId = String(args.message || args["message-id"] || args.messageId);

        return {
            valid: messages.has(messageId),
            reason: `unknown message template "${messageId}"`,
        };
    }

    if (args.components || args.content) {
        return validateMessageConfig(args);
    }

    return {
        valid: false,
        reason: `${action.id} action needs message, components, or content`,
    };
}
