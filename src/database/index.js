const { loadDatabaseConfig } = require("./config");
const { MariadbDatabaseAdapter } = require("./adapters/mariadb");
const { MemoryDatabaseAdapter } = require("./adapters/memory");
const { MongodbDatabaseAdapter } = require("./adapters/mongodb");
const { MysqlDatabaseAdapter } = require("./adapters/mysql");
const { NoneDatabaseAdapter } = require("./adapters/none");
const { PostgresqlDatabaseAdapter } = require("./adapters/postgresql");
const { SqliteDatabaseAdapter } = require("./adapters/sqlite");

const adapters = {
    mariadb: MariadbDatabaseAdapter,
    memory: MemoryDatabaseAdapter,
    mongodb: MongodbDatabaseAdapter,
    mysql: MysqlDatabaseAdapter,
    none: NoneDatabaseAdapter,
    postgresql: PostgresqlDatabaseAdapter,
    sqlite: SqliteDatabaseAdapter,
};

async function createDatabase(env = process.env, prefix = "DATABASE") {
    const config = loadDatabaseConfig(env, prefix);

    return createDatabaseFromConfig(config);
}

async function createDatabaseFromConfig(config) {
    const Adapter = adapters[config.provider];
    const database = new Adapter(config);

    await database.connect();

    return database;
}

module.exports = {
    createDatabase,
    createDatabaseFromConfig,
};
