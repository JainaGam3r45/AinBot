const { BaseDatabaseAdapter } = require("./base");

class NoneDatabaseAdapter extends BaseDatabaseAdapter {
    async get() {
        return null;
    }

    async set(namespace, key, value) {
        return value;
    }

    async delete() {
        return false;
    }

    async list() {
        return [];
    }
}

module.exports = {
    NoneDatabaseAdapter,
};
