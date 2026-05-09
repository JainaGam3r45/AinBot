class DatabaseConfigurationError extends Error {
    constructor(message) {
        super(message);
        this.name = "DatabaseConfigurationError";
    }
}

class DatabaseDependencyError extends Error {
    constructor(provider, packages) {
        const packageList = packages.map((name) => `"${name}"`).join(" or ");

        super(`Database provider "${provider}" requires ${packageList}. Install the driver and try again.`);
        this.name = "DatabaseDependencyError";
        this.provider = provider;
        this.packages = packages;
    }
}

module.exports = {
    DatabaseConfigurationError,
    DatabaseDependencyError,
};
