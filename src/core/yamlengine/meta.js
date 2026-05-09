const warnedClients = new WeakSet();
const path = require("path");
const { loadModuleYamlFiles } = require("./files");

async function loadMetaDefinitions(logger) {
    const definitions = new Map();
    const files = await loadModuleYamlFiles([path.join("metas"), path.join("resources", "metas")], logger, ["configs/metas"]);

    for (const file of files) {
        try {
            const metas = Array.isArray(file.value?.metas) ? file.value.metas : [file.value];

            for (const meta of metas) {
                const definition = normalizeMetaDefinition(meta);

                definitions.set(definition.key, definition);
                logger.debug(`Loaded YAML meta ${definition.key} from ${file.file}`);
            }
        } catch (error) {
            logger.issue(`Failed to load YAML meta from ${file.file}`, error);
        }
    }

    return definitions;
}

async function getMetaValue(context, key) {
    const store = getStore(context);
    const record = await store.get(getScopedKey(context, key));

    if (record === null || record === undefined) {
        return getDefaultMetaValue(context, key);
    }

    return coerceMetaValue(record, getMetaDefinition(context, key));
}

async function setMetaValue(context, key, value) {
    const store = getStore(context);

    return store.set(getScopedKey(context, key), coerceMetaValue(value, getMetaDefinition(context, key)));
}

async function addMetaValue(context, key, amount) {
    const current = Number(await getMetaValue(context, key)) || 0;
    const next = current + Number(amount || 0);

    await setMetaValue(context, key, next);

    return next;
}

async function deleteMetaValue(context, key) {
    const store = getStore(context);

    return store.delete(getScopedKey(context, key));
}

function getStore(context) {
    const database = context.client.database;

    if (database?.config?.provider && database.config.provider !== "none") {
        if (database.config.provider === "memory") warnMemoryStore(context);

        return database.namespace("yaml-meta");
    }

    if (!context.client.yamlMemoryMeta) {
        context.client.yamlMemoryMeta = new Map();
    }

    warnMemoryStore(context);

    return {
        async get(key) {
            return context.client.yamlMemoryMeta.get(key) ?? null;
        },
        async set(key, value) {
            context.client.yamlMemoryMeta.set(key, value);

            return value;
        },
        async delete(key) {
            return context.client.yamlMemoryMeta.delete(key);
        },
    };
}

function warnMemoryStore(context) {
    if (warnedClients.has(context.client)) return;

    context.logger.warn("YAML meta is being stored in memory because no persistent database is configured. Restarting the bot will lose this data.");
    warnedClients.add(context.client);
}

function getScopedKey(context, key) {
    const definition = getMetaDefinition(context, key);
    const guildId = context.guild?.id || "global";

    if (!definition) {
        const userId = context.user?.id || "system";

        return `${guildId}:${userId}:${key}`;
    }

    switch (definition.mode) {
        case "global":
            return `global:${key}`;
        case "guild":
            return `${guildId}:guild:${key}`;
        case "channel":
            return `${guildId}:channel:${context.channel?.id || "system"}:${key}`;
        case "message":
            return `${guildId}:message:${context.message?.id || "system"}:${key}`;
        case "user":
        default:
            return `${guildId}:user:${context.user?.id || "system"}:${key}`;
    }
}

function normalizeMetaDefinition(meta) {
    if (!meta?.key || typeof meta.key !== "string") throw new Error("meta key must be a non-empty string.");

    const definition = {
        key: meta.key,
        type: normalizeMetaType(meta.type),
        mode: normalizeMetaMode(meta.mode),
        default: meta.default,
        leaderboard: meta.leaderboard || null,
    };

    if (definition.leaderboard?.enabled && (definition.type !== "number" || definition.mode !== "user")) {
        throw new Error(`leaderboard meta "${definition.key}" must be type number and mode user.`);
    }

    return definition;
}

function normalizeMetaType(value = "string") {
    const type = String(value).toLowerCase();

    if (!["number", "string", "boolean", "list"].includes(type)) {
        throw new Error(`Unsupported meta type "${value}".`);
    }

    return type;
}

function normalizeMetaMode(value = "user") {
    const mode = String(value).toLowerCase();

    if (!["global", "guild", "user", "channel", "message"].includes(mode)) {
        throw new Error(`Unsupported meta mode "${value}".`);
    }

    return mode;
}

function getMetaDefinition(context, key) {
    return context.client.yamlMetas?.get(String(key)) || null;
}

function getDefaultMetaValue(context, key) {
    const definition = getMetaDefinition(context, key);

    if (!definition) return "";

    return coerceMetaValue(definition.default, definition);
}

function coerceMetaValue(value, definition) {
    if (!definition) return value;

    switch (definition.type) {
        case "number":
            return Number(value || 0);
        case "boolean":
            return value === true || String(value).toLowerCase() === "true";
        case "list":
            if (Array.isArray(value)) return value.map(String);
            if (value === undefined || value === null || value === "") return [];

            return String(value).split(",").map((entry) => entry.trim()).filter(Boolean);
        case "string":
        default:
            return value === undefined || value === null ? "" : String(value);
    }
}

module.exports = {
    addMetaValue,
    deleteMetaValue,
    getMetaValue,
    loadMetaDefinitions,
    setMetaValue,
};
