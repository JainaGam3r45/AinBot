const { DatabaseDependencyError } = require("../errors");

function requireDriver(provider, packages) {
    for (const packageName of packages) {
        try {
            require.resolve(packageName);
        } catch (error) {
            if (error.code !== "MODULE_NOT_FOUND") {
                throw error;
            }

            continue;
        }

        return require(packageName);
    }

    throw new DatabaseDependencyError(provider, packages);
}

module.exports = {
    requireDriver,
};
