const { requireDriver } = require("./dependencies");
const { BaseDatabaseAdapter } = require("./base");

class MongodbDatabaseAdapter extends BaseDatabaseAdapter {
    constructor(config) {
        super(config);
        this.client = null;
        this.collection = null;
    }

    async connect() {
        const { MongoClient } = requireDriver("mongodb", ["mongodb"]);

        this.client = new MongoClient(getMongoUrl(this.config), {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            ssl: this.config.ssl,
        });

        await this.client.connect();

        this.collection = this.client
            .db(this.config.name)
            .collection(this.config.mongoCollection);

        await this.collection.createIndex({
            namespace: 1,
            key: 1,
        }, {
            unique: true,
        });

        this.connected = true;
    }

    async close() {
        if (this.client) {
            await this.client.close();
            this.client = null;
            this.collection = null;
        }

        this.connected = false;
    }

    async ping() {
        await this.client.db(this.config.name).command({
            ping: 1,
        });

        return true;
    }

    async get(namespace, key) {
        const record = await this.collection.findOne({
            namespace,
            key,
        });

        return record ? record.value : null;
    }

    async set(namespace, key, value) {
        await this.collection.updateOne({
            namespace,
            key,
        }, {
            $set: {
                namespace,
                key,
                value,
                updatedAt: new Date(),
            },
        }, {
            upsert: true,
        });

        return value;
    }

    async delete(namespace, key) {
        const operation = await this.collection.deleteOne({
            namespace,
            key,
        });

        return operation.deletedCount > 0;
    }

    async list(namespace) {
        const records = await this.collection
            .find({
                namespace,
            }, {
                projection: {
                    _id: 0,
                    key: 1,
                    value: 1,
                    updatedAt: 1,
                },
            })
            .sort({
                key: 1,
            })
            .toArray();

        return records;
    }
}

function getMongoUrl(config) {
    if (config.url) return config.url;

    const auth = config.user
        ? `${encodeURIComponent(config.user)}:${encodeURIComponent(config.password || "")}@`
        : "";
    const port = config.port ? `:${config.port}` : "";

    return `mongodb://${auth}${config.host}${port}`;
}

module.exports = {
    MongodbDatabaseAdapter,
};
