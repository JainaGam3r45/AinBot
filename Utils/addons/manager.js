const { mkdir, readdir, readFile, writeFile } = require("fs/promises");
const path = require("path");

const addonsDirectory = path.join(process.cwd(), "configs", "addons");
const settingsFile = path.join(process.cwd(), "configs", "addons.json");

/**
 * Loads installed addons from configs/addons.
 * @param {object} client Discord client.
 * @param {object} logger Central logger.
 */
async function loadAddons(client, logger) {
    const settings = await loadAddonSettings(logger);
    const entries = await readAddonFolders(logger);
    const addons = new Map();

    for (const entry of entries) {
        const folder = path.join(addonsDirectory, entry.name);
        const addon = await loadAddon(folder, entry.name, client, logger, settings);

        if (addon) addons.set(addon.name, addon);
    }

    client.addons = {
        directory: addonsDirectory,
        settings,
        loaded: addons,
    };

    logger.info(`Addons loading completed. ${countEnabled(addons)} enabled, ${addons.size} installed.`);

    return client.addons;
}

async function readAddonFolders(logger) {
    try {
        const entries = await readdir(addonsDirectory, {
            withFileTypes: true,
        });

        return entries
            .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
            .sort((left, right) => left.name.localeCompare(right.name));
    } catch (error) {
        if (error.code === "ENOENT") return [];

        logger.issue("Failed to read addons directory", error);
        return [];
    }
}

async function loadAddon(folder, folderName, client, logger, settings) {
    const entryFile = path.join(folder, "index.js");

    try {
        delete require.cache[require.resolve(entryFile)];
        const exported = require(entryFile);
        const definition = typeof exported === "function" ? await exported(createAddonContext(client, logger, folderName)) : exported;
        const addon = normalizeAddon(definition, folderName);
        const disabled = settings.disabled.includes(addon.name);

        addon.folder = folder;
        addon.enabled = !disabled;
        addon.commands = disabled ? [] : normalizeList(addon.commands);
        addon.events = disabled ? [] : normalizeList(addon.events);

        if (!disabled && typeof addon.load === "function") {
            const loaded = await addon.load(createAddonContext(client, logger, addon.name));

            addon.commands.push(...normalizeList(loaded?.commands));
            addon.events.push(...normalizeList(loaded?.events));
        }

        logger.debug(`Loaded addon ${addon.name} from ${entryFile}`);

        return addon;
    } catch (error) {
        logger.issue(`Failed to load addon ${folderName}`, error);
        return null;
    }
}

function createAddonContext(client, logger, addonName) {
    return {
        client,
        logger,
        addonName,
        root: process.cwd(),
        directory: path.join(addonsDirectory, addonName),
        database: client.database?.namespace(`addons.${addonName}`),
    };
}

function normalizeAddon(definition, folderName) {
    if (!definition || typeof definition !== "object") {
        throw new Error("Addon must export an object or a factory function.");
    }

    const name = normalizeAddonName(definition.name || folderName);

    return {
        name,
        version: String(definition.version || "0.0.0"),
        description: String(definition.description || "No description provided."),
        author: definition.author ? String(definition.author) : "",
        commands: definition.commands,
        events: definition.events,
        load: definition.load,
    };
}

function normalizeAddonName(value) {
    const name = String(value || "").trim().toLowerCase();

    if (!/^[a-z0-9_]{1,32}$/.test(name)) {
        throw new Error("Addon name must use 1-32 lowercase letters, numbers, or underscores.");
    }

    return name;
}

function normalizeList(value) {
    if (!value) return [];
    return Array.isArray(value) ? value.filter(Boolean) : [value];
}

async function loadAddonSettings(logger) {
    try {
        const source = await readFile(settingsFile, "utf8");
        const settings = JSON.parse(source);

        return {
            disabled: normalizeList(settings.disabled).map(normalizeAddonName),
        };
    } catch (error) {
        if (error.code !== "ENOENT") {
            logger.issue("Failed to read addon settings, using defaults", error);
        }

        return {
            disabled: [],
        };
    }
}

async function saveAddonSettings(settings) {
    await mkdir(path.dirname(settingsFile), {
        recursive: true,
    });

    await writeFile(settingsFile, `${JSON.stringify({
        disabled: [...new Set(settings.disabled)].sort(),
    }, null, 4)}\n`, "utf8");
}

async function setAddonEnabled(client, addonName, enabled, logger) {
    const settings = client.addons?.settings || await loadAddonSettings(logger);
    const name = normalizeAddonName(addonName);
    const disabled = new Set(settings.disabled);

    if (enabled) {
        disabled.delete(name);
    } else {
        disabled.add(name);
    }

    settings.disabled = [...disabled].sort();
    await saveAddonSettings(settings);

    return settings;
}

function getEnabledAddonCommands(client) {
    return [...(client.addons?.loaded?.values() || [])]
        .filter((addon) => addon.enabled)
        .flatMap((addon) => addon.commands.map((command) => ({
            ...command,
            addon: addon.name,
        })));
}

function getEnabledAddonEvents(client) {
    return [...(client.addons?.loaded?.values() || [])]
        .filter((addon) => addon.enabled)
        .flatMap((addon) => addon.events.map((event) => ({
            ...event,
            addon: addon.name,
        })));
}

function countEnabled(addons) {
    return [...addons.values()].filter((addon) => addon.enabled).length;
}

module.exports = {
    getEnabledAddonCommands,
    getEnabledAddonEvents,
    loadAddons,
    setAddonEnabled,
};
