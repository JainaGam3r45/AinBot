const logger = require("../runtime/logger");
const { evaluateConditions } = require("./conditions");

function createRuntimeContext(base) {
    return {
        client: base.client,
        interaction: base.interaction || null,
        message: base.message || null,
        guild: base.guild || base.interaction?.guild || base.message?.guild || base.member?.guild || null,
        channel: base.channel || base.interaction?.channel || base.message?.channel || null,
        user: base.user || base.interaction?.user || base.message?.author || base.member?.user || null,
        member: base.member || base.interaction?.member || base.message?.member || null,
        role: base.role || null,
        messages: base.messages || new Map(),
        variables: base.variables || {},
        logger,
        evaluateConditions,
    };
}

module.exports = {
    createRuntimeContext,
};
