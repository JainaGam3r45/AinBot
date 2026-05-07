const os = require("os");
const { getMetaValue } = require("./meta");

/**
 * Resolves placeholders and random string choices inside a config value.
 * @param {*} value Config value.
 * @param {object} context Runtime context.
 */
async function resolveValue(value, context) {
    if (typeof value === "string") return resolveString(value, context);
    if (Array.isArray(value)) {
        const resolved = [];

        for (const item of value) {
            resolved.push(await resolveValue(item, context));
        }

        return resolved;
    }
    if (value && typeof value === "object") {
        if (Array.isArray(value.random)) {
            return resolveValue(pick(value.random), context);
        }

        const resolved = {};

        for (const [key, entry] of Object.entries(value)) {
            resolved[key] = await resolveValue(entry, context);
        }

        return resolved;
    }

    return value;
}

async function resolveString(value, context) {
    const matches = [...String(value).matchAll(/%([a-zA-Z0-9_.-]+)%/g)];
    let resolved = String(value);

    for (const match of matches) {
        const replacement = await getPlaceholder(match[1], context);
        resolved = resolved.replaceAll(match[0], replacement);
    }

    return resolved;
}

async function getPlaceholder(name, context) {
    if (Object.prototype.hasOwnProperty.call(context.variables, name)) {
        return formatValue(context.variables[name]);
    }

    if (name.startsWith("meta_")) {
        const key = name.slice(5);
        const value = await getMetaValue(context, key);

        return formatValue(value);
    }

    const guild = context.guild;
    const channel = context.channel;
    const user = context.user;
    const member = context.member;
    const message = context.message;
    const client = context.client;

    const placeholders = {
        bot_id: client.user?.id,
        bot_username: client.user?.username,
        bot_mention: client.user ? `<@${client.user.id}>` : "",
        bot_avatar: client.user?.displayAvatarURL?.() || "",
        guild_id: guild?.id,
        guild_name: guild?.name,
        guild_icon: guild?.iconURL?.() || "",
        guild_members: guild?.memberCount,
        channel_id: channel?.id,
        channel_name: channel?.name,
        channel_mention: channel?.id ? `<#${channel.id}>` : "",
        channel_type: channel?.type,
        channel_topic: channel?.topic || "",
        channel_url: channel?.url || "",
        user_id: user?.id,
        user_bot: user?.bot,
        user_display_name: member?.displayName || user?.displayName || user?.username,
        user_username: user?.username,
        user_mention: user?.id ? `<@${user.id}>` : "",
        user_avatar: user?.displayAvatarURL?.() || "",
        member_display_name: member?.displayName || "",
        member_join_date: member?.joinedAt ? member.joinedAt.toISOString() : "",
        message_id: message?.id,
        message_content: message?.content || "",
        message_author_id: message?.author?.id || "",
        message_url: message?.url || "",
        date: new Date().toISOString().slice(0, 10),
        hour: new Date().getHours(),
        minute: new Date().getMinutes(),
        performance_uptime: formatDuration(process.uptime()),
        performance_total_memory: os.totalmem(),
        performance_used_memory: process.memoryUsage().rss,
        performance_free_memory: os.freemem(),
    };

    return formatValue(placeholders[name] ?? "");
}

function pick(values) {
    return values[Math.floor(Math.random() * values.length)];
}

function formatValue(value) {
    if (value === null || value === undefined) return "";
    if (Array.isArray(value)) return value.join(", ");

    return String(value);
}

function formatDuration(seconds) {
    const total = Math.floor(seconds);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);

    return `${hours}h ${minutes}m`;
}

module.exports = {
    resolveString,
    resolveValue,
};
