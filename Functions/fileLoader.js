const { readdir } = require("fs/promises");
const path = require("path");

/**
 * Loads JavaScript files from a project folder and refreshes their require cache.
 * @param {string} dirName Folder name relative to the project root.
 */
async function loadFiles(dirName) {
    const directory = path.join(process.cwd(), dirName);
    const files = await findJavaScriptFiles(directory);

    for (const file of files) {
        delete require.cache[require.resolve(file)];
    }

    return files;
}

async function findJavaScriptFiles(directory) {
    const entries = await readdir(directory, {
        withFileTypes: true,
    });

    const files = await Promise.all(entries.map(async (entry) => {
        const target = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            return findJavaScriptFiles(target);
        }

        return entry.isFile() && entry.name.endsWith(".js") ? [target] : [];
    }));

    return files.flat().sort((left, right) => left.localeCompare(right));
}

module.exports = {
    loadFiles
};
