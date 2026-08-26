const { GatewayIntentBits, IntentsBitField } = require("discord.js");

const PORTAL_BOT_URL = "https://discord.com/developers/applications";

const STANDARD_INTENTS = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildExpressions,
    GatewayIntentBits.GuildIntegrations,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions,
    GatewayIntentBits.DirectMessageTyping,
    GatewayIntentBits.GuildScheduledEvents,
    GatewayIntentBits.AutoModerationConfiguration,
    GatewayIntentBits.AutoModerationExecution,
    GatewayIntentBits.GuildMessagePolls,
    GatewayIntentBits.DirectMessagePolls,
];

/**
 * Privileged intents AinBot can request: Portal label, Discord bit,
 * YAML triggers, and the features that go quiet without each one.
 */
const PRIVILEGED_INTENTS = {
    GuildMembers: {
        bit: GatewayIntentBits.GuildMembers,
        portalName: "Server Members Intent",
        systems: [
            "EventLogs welcome and leave",
            "YAML guildMemberAdd / guildMemberRemove",
            "YAML displayNameUpdate / guildBoostAdd / guildBoostRemove",
            "members.fetch in YAML actions",
        ],
        yamlTriggers: [
            "guildMemberAdd",
            "guildMemberRemove",
            "displayNameUpdate",
            "guildBoostAdd",
            "guildBoostRemove",
        ],
    },
    GuildPresences: {
        bit: GatewayIntentBits.GuildPresences,
        portalName: "Presence Intent",
        systems: [
            "YAML presenceUpdate (old_status / new_status)",
        ],
        yamlTriggers: [
            "presenceUpdate",
        ],
    },
    MessageContent: {
        bit: GatewayIntentBits.MessageContent,
        portalName: "Message Content Intent",
        systems: [
            "EventLogs message delete and edit (content fields)",
            "YAML matchesRegex and other text conditions",
            "message_content placeholder",
            "messageCreate scripts that read message text",
        ],
        yamlTriggers: [
            "messageCreate",
            "messageDelete",
            "messageUpdate",
        ],
    },
};

const PRIVILEGED_KEYS = Object.keys(PRIVILEGED_INTENTS);
const DEFAULT_PRIVILEGED = [...PRIVILEGED_KEYS];
const TRIGGER_TO_PRIVILEGED = buildTriggerMap();

/**
 * Builds the full Gateway intents list for the Discord client.
 * @param {NodeJS.ProcessEnv} [env=process.env] Environment to read from.
 * @returns {number[]} Intent bits for Client options.
 */
function buildGatewayIntents(env = process.env) {
    const privileged = resolvePrivilegedIntents(env);

    return [
        ...STANDARD_INTENTS,
        ...privileged.map((key) => PRIVILEGED_INTENTS[key].bit),
    ];
}

/**
 * Parses AINBOT_PRIVILEGED_INTENTS. Unset means all three. `none` or empty means none.
 * @param {NodeJS.ProcessEnv} [env=process.env] Environment to read from.
 * @returns {string[]} Privileged intent keys to request.
 */
function resolvePrivilegedIntents(env = process.env) {
    if (!Object.prototype.hasOwnProperty.call(env, "AINBOT_PRIVILEGED_INTENTS")) {
        return [...DEFAULT_PRIVILEGED];
    }

    const raw = String(env.AINBOT_PRIVILEGED_INTENTS ?? "").trim();

    if (!raw || /^none$/i.test(raw)) {
        return [];
    }

    const selected = [];

    for (const part of raw.split(/[,;\s]+/)) {
        const key = normalizePrivilegedKey(part);

        if (!key) continue;

        if (!PRIVILEGED_INTENTS[key]) {
            throw new Error(
                `Unknown privileged intent "${part}". Use GuildMembers, GuildPresences, MessageContent, or none.`,
            );
        }

        if (!selected.includes(key)) {
            selected.push(key);
        }
    }

    return selected;
}

/**
 * Returns privileged intents missing from a bitfield.
 * @param {IntentsBitField|number|number[]} intents Client intents.
 * @returns {string[]} Missing privileged keys.
 */
function listMissingPrivilegedIntents(intents) {
    const bits = IntentsBitField.resolve(intents);

    return PRIVILEGED_KEYS.filter((key) => (bits & PRIVILEGED_INTENTS[key].bit) === 0);
}

/**
 * True when the error looks like Discord close code 4014 (disallowed intents).
 * @param {unknown} error Login or gateway error.
 * @returns {boolean}
 */
function isDisallowedIntentsError(error) {
    if (!error || typeof error !== "object") {
        return /4014|disallowed intents?/i.test(String(error));
    }

    const code = error.code ?? error.closeCode ?? error.errno;
    if (code === 4014 || code === "4014") return true;

    return /4014|disallowed intents?/i.test(String(error.message || error));
}

/**
 * Plain-language help for a 4014 / missing privileged intent failure.
 * @param {unknown} [error] Optional original error.
 * @param {string[]} [requestedKeys] Privileged keys requested at login.
 * @returns {string}
 */
function formatDisallowedIntentsHelp(error, requestedKeys = DEFAULT_PRIVILEGED) {
    const keys = requestedKeys.length > 0 ? requestedKeys : DEFAULT_PRIVILEGED;
    const lines = [
        "Discord rejected the Gateway Identify (close code 4014: Disallowed Intents).",
        "A privileged intent is enabled in code but not toggled on in the Developer Portal.",
        "",
        "Open your app -> Bot -> Privileged Gateway Intents:",
        PORTAL_BOT_URL,
        "",
        "Requested privileged intents and what they power:",
    ];

    for (const key of keys) {
        const entry = PRIVILEGED_INTENTS[key];
        if (!entry) continue;

        lines.push(`- ${key} (Portal: ${entry.portalName})`);
        for (const system of entry.systems) {
            lines.push(`  · ${system}`);
        }
    }

    lines.push(
        "",
        "To start without some of them, set AINBOT_PRIVILEGED_INTENTS in .env",
        "(example: GuildMembers,MessageContent or none).",
        "Those systems will stay quiet until you turn the intent back on.",
    );

    if (error) {
        lines.push("", `Original error: ${String(error.message || error)}`);
    }

    return lines.join("\n");
}

/**
 * Logs which privileged intents are active and which systems are degraded.
 * @param {object} logger Project logger.
 * @param {IntentsBitField|number|number[]} intents Client intents.
 */
function logPrivilegedIntentStatus(logger, intents) {
    const bits = IntentsBitField.resolve(intents);
    const enabled = [];
    const missing = [];

    for (const key of PRIVILEGED_KEYS) {
        if ((bits & PRIVILEGED_INTENTS[key].bit) !== 0) {
            enabled.push(key);
        } else {
            missing.push(key);
        }
    }

    if (enabled.length > 0) {
        logger.info(`Privileged intents active: ${enabled.join(", ")}`);
    } else {
        logger.warn("No privileged intents requested. Member, presence, and message-content features are offline.");
    }

    for (const key of missing) {
        const entry = PRIVILEGED_INTENTS[key];
        logger.warn(`Privileged intent ${key} is off. Affected: ${entry.systems.join("; ")}`);
    }
}

/**
 * Warns when a YAML trigger needs a privileged intent the client did not request.
 * @param {string} trigger YAML trigger name.
 * @param {IntentsBitField|number|number[]} intents Client intents.
 * @param {object} logger Project logger.
 * @param {string} [source] File path for context.
 * @returns {boolean} True when the trigger is fully covered.
 */
function assertYamlTriggerIntent(trigger, intents, logger, source = "YAML event") {
    const key = TRIGGER_TO_PRIVILEGED[trigger];
    if (!key) return true;

    const bits = IntentsBitField.resolve(intents);
    const entry = PRIVILEGED_INTENTS[key];

    if ((bits & entry.bit) !== 0) return true;

    logger.warn(
        `${source}: trigger "${trigger}" needs ${key} (${entry.portalName}), which is not in the client intents. That event will not work as expected.`,
    );

    return false;
}

function normalizePrivilegedKey(value) {
    const trimmed = String(value || "").trim();
    if (!trimmed) return "";

    const compact = trimmed.replace(/[_\s-]+/g, "").toLowerCase();

    for (const key of PRIVILEGED_KEYS) {
        if (key.toLowerCase() === compact) return key;
        if (key.replace(/_/g, "").toLowerCase() === compact) return key;
    }

    const aliases = {
        guildmembers: "GuildMembers",
        members: "GuildMembers",
        servermembers: "GuildMembers",
        guildpresences: "GuildPresences",
        presences: "GuildPresences",
        presence: "GuildPresences",
        messagecontent: "MessageContent",
        messages: "MessageContent",
        content: "MessageContent",
    };

    return aliases[compact] || "";
}

function buildTriggerMap() {
    const map = Object.create(null);

    for (const [key, entry] of Object.entries(PRIVILEGED_INTENTS)) {
        for (const trigger of entry.yamlTriggers) {
            map[trigger] = key;
        }
    }

    return map;
}

module.exports = {
    PORTAL_BOT_URL,
    PRIVILEGED_INTENTS,
    STANDARD_INTENTS,
    assertYamlTriggerIntent,
    buildGatewayIntents,
    formatDisallowedIntentsHelp,
    isDisallowedIntentsError,
    listMissingPrivilegedIntents,
    logPrivilegedIntentStatus,
    resolvePrivilegedIntents,
};
