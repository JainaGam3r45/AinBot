const warnedClients = new WeakSet();

async function getMetaValue(context, key) {
    const store = getStore(context);
    const record = await store.get(getScopedKey(context, key));

    return record === null || record === undefined ? "" : record;
}

async function setMetaValue(context, key, value) {
    const store = getStore(context);

    return store.set(getScopedKey(context, key), value);
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
    const guildId = context.guild?.id || "global";
    const userId = context.user?.id || "system";

    return `${guildId}:${userId}:${key}`;
}

module.exports = {
    addMetaValue,
    deleteMetaValue,
    getMetaValue,
    setMetaValue,
};
