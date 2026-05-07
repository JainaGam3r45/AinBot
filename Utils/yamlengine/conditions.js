const { PermissionFlagsBits } = require("discord.js");
const { resolveValue } = require("./placeholders");

const conditionIds = new Set([
    "isBot",
    "isUser",
    "hasPermission",
    "hasRole",
    "inChannel",
    "matchesRegex",
    "anyOf",
    "allOf",
    "noneOf",
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
        case "isBot":
            result = Boolean(context.user?.bot);
            break;
        case "isUser":
            result = list(args.value).includes(context.user?.id);
            break;
        case "hasPermission":
            result = hasPermission(context.member, args.value);
            break;
        case "hasRole":
            result = hasRole(context.member, args.value);
            break;
        case "inChannel":
            result = inChannel(context.channel, args.value);
            break;
        case "matchesRegex":
            result = matchesRegex(context, args.value);
            break;
        case "anyOf":
            result = await anyOf(args.conditions, context);
            break;
        case "allOf":
            result = await evaluateConditions(args.conditions, context);
            break;
        case "noneOf":
            result = !await anyOf(args.conditions, context);
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

function hasRole(member, roles) {
    if (!member?.roles?.cache) return false;

    return list(roles).every((role) => member.roles.cache.some((cachedRole) => {
        return cachedRole.id === role || cachedRole.name.toLowerCase() === String(role).toLowerCase();
    }));
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

function normalizePermission(value) {
    const normalized = String(value).replaceAll("_", "").toLowerCase();
    const key = Object.keys(PermissionFlagsBits).find((permission) => {
        return permission.toLowerCase() === normalized;
    });

    return key ? PermissionFlagsBits[key] : null;
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

        if (["anyOf", "allOf", "noneOf"].includes(id) && condition.args?.conditions) {
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
