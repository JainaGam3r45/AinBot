const { readdir, readFile } = require("fs/promises");
const path = require("path");
const YAML = require("yaml");

/**
 * Loads active YAML files from a project folder.
 * @param {string} dirName Folder name relative to the project root.
 * @param {object} logger Logger used for invalid files.
 */
async function loadYamlFiles(dirName, logger) {
    const directory = path.join(process.cwd(), dirName);
    const files = await findYamlFiles(directory);

    return loadYamlDocuments(files, logger);
}

async function loadModuleYamlFiles(sectionName, logger, legacyDirectories = []) {
    const configDirectory = path.join(process.cwd(), "configs");
    const sections = Array.isArray(sectionName) ? sectionName : [sectionName];
    const modules = await findConfigModules(configDirectory);
    const files = [];

    for (const moduleName of modules) {
        for (const section of sections) {
            files.push(...await findYamlFiles(path.join(configDirectory, moduleName, section)));
        }
    }

    for (const directory of legacyDirectories) {
        files.push(...await findYamlFiles(path.join(process.cwd(), directory)));
    }

    return loadYamlDocuments(files, logger);
}

async function loadYamlDocuments(files, logger) {
    const documents = [];

    for (const file of files) {
        try {
            const source = await readFile(file, "utf8");
            const value = YAML.parse(source);

            if (!isPlainObject(value)) {
                logger.issue(`YAML config ${file} must contain an object.`);
                continue;
            }

            documents.push({
                file,
                id: path.basename(file, path.extname(file)),
                value,
            });
        } catch (error) {
            logger.issue(`Failed to load YAML config from ${file}`, error);
        }
    }

    return documents;
}

async function findConfigModules(directory) {
    let entries;

    try {
        entries = await readdir(directory, {
            withFileTypes: true,
        });
    } catch (error) {
        if (error.code === "ENOENT") return [];
        throw error;
    }

    return entries
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
        .map((entry) => entry.name)
        .sort((left, right) => left.localeCompare(right));
}

/**
 * Finds active YAML files inside a directory and its subfolders.
 * @param {string} directory Directory path to scan.
 */
async function findYamlFiles(directory) {
    let entries;

    try {
        entries = await readdir(directory, {
            withFileTypes: true,
        });
    } catch (error) {
        if (error.code === "ENOENT") return [];
        throw error;
    }

    const files = await Promise.all(entries.map(async (entry) => {
        if (entry.name.startsWith("_")) return [];

        const target = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            return findYamlFiles(target);
        }

        const extension = path.extname(entry.name).toLowerCase();

        return entry.isFile() && [".yml", ".yaml"].includes(extension) ? [target] : [];
    }));

    return files.flat().sort((left, right) => left.localeCompare(right));
}

function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

module.exports = {
    loadYamlFiles,
    loadModuleYamlFiles,
};
