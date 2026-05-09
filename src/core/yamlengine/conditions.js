const { PermissionFlagsBits } = require("discord.js");
const { getMetaValue } = require("./meta");
const { resolveValue } = require("./placeholders");

const conditionIds = new Set([
    "anyOf",
    "allOf",
    "atLeastOf",
    "coinsAbove",
    "coinsBelow",
    "hasPermission",
    "hasRole",
    "hasTag",
    "inChannel",
    "isBooster",
    "isBot",
    "isUser",
    "isExpressionTrue",
    "isOnCooldown",
    "isReply",
    "matchesRegex",
    "memberCountAbove",
    "memberCountBelow",
    "metaAbove",
    "metaBelow",
    "metaEquals",
    "metaIncludes",
    "noneOf",
    "textContains",
    "textEndsWith",
    "textEquals",
    "textLengthAbove",
    "textLengthBelow",
    "textStartsWith",
]);

/**
 * Evaluates all configured conditions.
 * @param {object[]} conditions YAML condition configs.
 * @param {object} context Runtime context.
 */
async function evaluateConditions(conditions, context) {
    if (!Array.isArray(conditions) || conditions.length === 0) return true;

    for (const condition of conditions) {
        if (!await evaluateCondition(condition, context)) return false;
    }

    return true;
}

async function evaluateCondition(condition, context) {
    if (typeof condition === "string") {
        return evaluateCondition({
            id: condition,
        }, context);
    }

    let id = String(condition.id || "").trim();
    const inverseFromId = id.startsWith("!");

    if (inverseFromId) id = id.slice(1);

    const args = await resolveValue(condition.args || {}, context);
    let result;

    switch (id) {
        case "anyOf":
            result = await anyOf(args.conditions, context);
            break;
        case "allOf":
            result = await evaluateConditions(args.conditions, context);
            break;
        case "atLeastOf":
            result = await atLeastOf(args.conditions, args.amount, context);
            break;
        case "coinsAbove":
            result = Number(await getMetaValue(context, "coins")) > Number(args.amount);
            break;
        case "coinsBelow":
            result = Number(await getMetaValue(context, "coins")) < Number(args.amount);
            break;
        case "hasPermission":
            result = hasPermission(context.member, args.value);
            break;
        case "hasRole":
            result = hasRole(context.member, args.value, args.inherit);
            break;
        case "hasTag":
            result = hasTag(context.channel, args.value);
            break;
        case "inChannel":
            result = inChannel(context.channel, args.value);
            break;
        case "isBooster":
            result = Boolean(context.member?.premiumSince);
            break;
        case "isBot":
            result = Boolean(context.user?.bot);
            break;
        case "isExpressionTrue":
            result = isExpressionTrue(args.value);
            break;
        case "isOnCooldown":
            result = Number(await getMetaValue(context, cooldownKey(args.value))) > Date.now();
            break;
        case "isReply":
            result = Boolean(context.message?.reference?.messageId);
            break;
        case "isUser":
            result = list(args.value).includes(context.user?.id);
            break;
        case "matchesRegex":
            result = matchesRegex(context, args.value);
            break;
        case "memberCountAbove":
            result = Number(context.guild?.memberCount || 0) > Number(args.amount);
            break;
        case "memberCountBelow":
            result = Number(context.guild?.memberCount || 0) < Number(args.amount);
            break;
        case "metaAbove":
            result = Number(await getMetaValue(context, args.key)) > Number(args.value);
            break;
        case "metaBelow":
            result = Number(await getMetaValue(context, args.key)) < Number(args.value);
            break;
        case "metaEquals":
            result = String(await getMetaValue(context, args.key)) === String(args.value);
            break;
        case "metaIncludes":
            result = metaIncludes(await getMetaValue(context, args.key), args.value);
            break;
        case "noneOf":
            result = !await anyOf(args.conditions, context);
            break;
        case "textContains":
            result = compareText(args, (input, output) => input.includes(output));
            break;
        case "textEndsWith":
            result = compareText(args, (input, output) => input.endsWith(output));
            break;
        case "textEquals":
            result = compareText(args, (input, output) => input === output);
            break;
        case "textLengthAbove":
            result = String(args.text || "").length > Number(args.amount);
            break;
        case "textLengthBelow":
            result = String(args.text || "").length < Number(args.amount);
            break;
        case "textStartsWith":
            result = compareText(args, (input, output) => input.startsWith(output));
            break;
        default:
            throw new Error(`Unsupported condition "${id}".`);
    }

    return condition.inverse || inverseFromId ? !result : result;
}

function hasPermission(member, permissions) {
    if (!member?.permissions) return false;

    return list(permissions).every((permission) => {
        const flag = normalizePermission(permission);

        return flag ? member.permissions.has(flag) : false;
    });
}

function hasRole(member, roles, inherit = false) {
    if (!member?.roles?.cache) return false;

    return list(roles).every((role) => {
        const cachedRole = resolveRole(member, role);

        if (!cachedRole) return false;
        if (member.roles.cache.has(cachedRole.id)) return true;

        return inherit && member.roles.highest.comparePositionTo(cachedRole) > 0;
    });
}

function hasTag(channel, values) {
    const tags = channel?.appliedTags || [];

    return list(values).every((value) => tags.includes(value));
}

function inChannel(channel, values) {
    if (!channel) return false;

    return list(values).some((value) => {
        const normalized = String(value).toLowerCase();

        return channel.id === value
            || channel.name?.toLowerCase() === normalized
            || channel.parentId === value
            || channel.parent?.name?.toLowerCase() === normalized;
    });
}

function matchesRegex(context, pattern) {
    const content = context.message?.content || context.variables.button_custom_id || context.variables.select_custom_id || "";

    return new RegExp(String(pattern)).test(content);
}

async function anyOf(conditions, context) {
    for (const condition of conditions || []) {
        if (await evaluateCondition(condition, context)) return true;
    }

    return false;
}

async function atLeastOf(conditions, amount, context) {
    let met = 0;

    for (const condition of conditions || []) {
        if (await evaluateCondition(condition, context)) met += 1;
    }

    return met >= Number(amount || 1);
}

function metaIncludes(value, expected) {
    if (Array.isArray(value)) return value.map(String).includes(String(expected));

    return String(value).split(",").map((entry) => entry.trim()).includes(String(expected));
}

function compareText(args, predicate) {
    const ignoreCase = Boolean(args.ignoreCase ?? args["ignore-case"]);
    const input = normalizeText(args.input ?? args.text ?? "", ignoreCase);

    return list(args.output ?? args.value).some((value) => {
        return predicate(input, normalizeText(value, ignoreCase));
    });
}

function normalizeText(value, ignoreCase) {
    const text = String(value);

    return ignoreCase ? text.toLowerCase() : text;
}

function isExpressionTrue(value) {
    const expression = String(value || "").trim();

    if (!/^[\d\s().+\-*/%<>=!&|'"truefalsenull]+$/i.test(expression)) return false;

    try {
        return Boolean(Function(`"use strict"; return (${expression});`)());
    } catch {
        return false;
    }
}

function cooldownKey(value) {
    return `cooldown:${value || "default"}`;
}

function normalizePermission(value) {
    const normalized = String(value).replaceAll("_", "").toLowerCase();
    const key = Object.keys(PermissionFlagsBits).find((permission) => {
        return permission.toLowerCase() === normalized;
    });

    return key ? PermissionFlagsBits[key] : null;
}

function resolveRole(member, value) {
    const roleValue = String(value).replace(/[<@&>]/g, "");

    return member.roles.cache.get(roleValue)
        || member.guild.roles.cache.get(roleValue)
        || member.guild.roles.cache.find((role) => role.name.toLowerCase() === String(value).toLowerCase());
}

function validateConditions(conditions) {
    if (!conditions) {
        return {
            valid: true,
        };
    }

    if (!Array.isArray(conditions)) {
        return {
            valid: false,
            reason: "conditions must be an array",
        };
    }

    for (const condition of conditions) {
        const id = String(typeof condition === "string" ? condition : condition.id || "").replace(/^!/, "");

        if (!conditionIds.has(id)) {
            return {
                valid: false,
                reason: `unsupported condition "${id}"`,
            };
        }

        if (["anyOf", "allOf", "atLeastOf", "noneOf"].includes(id) && condition.args?.conditions) {
            const validation = validateConditions(condition.args.conditions);

            if (!validation.valid) return validation;
        }
    }

    return {
        valid: true,
    };
}

function list(value) {
    if (Array.isArray(value)) return value.map(String);
    if (value === undefined || value === null) return [];

    return [String(value)];
}

module.exports = {
    evaluateConditions,
    validateConditions,
};
