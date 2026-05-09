const expiredInteractionCodes = new Set([
    10015,
    10062,
    50027,
]);

const handledInteractionCodes = new Set([
    ...expiredInteractionCodes,
    10008,
    40060,
]);

/**
 * Replies to an interaction without throwing for expired or already acknowledged interactions.
 * @param {object} interaction Discord interaction.
 * @param {object} payload Reply payload.
 * @param {object} options Reply behavior.
 * @param {"auto"|"reply"|"edit"|"followup"|"preferedit"} options.mode Reply mode.
 */
async function safeReply(interaction, payload, options = {}) {
    const mode = options.mode || "auto";
    const method = getReplyMethod(interaction, mode);

    if (!method) return false;

    return runInteractionMethod(interaction, method, payload);
}

/**
 * Defers an interaction reply without throwing for expired or already acknowledged interactions.
 * @param {object} interaction Discord interaction.
 * @param {object} payload Defer payload.
 */
async function safeDeferReply(interaction, payload = {}) {
    if (interaction.deferred || interaction.replied) return false;

    return runInteractionMethod(interaction, "deferReply", payload);
}

/**
 * Edits the original interaction reply when one exists.
 * @param {object} interaction Discord interaction.
 * @param {object} payload Reply payload.
 */
async function safeEditReply(interaction, payload) {
    if (!interaction.deferred && !interaction.replied) return false;

    return runInteractionMethod(interaction, "editReply", payload);
}

/**
 * Sends a follow-up interaction response when the interaction has already been acknowledged.
 * @param {object} interaction Discord interaction.
 * @param {object} payload Reply payload.
 */
async function safeFollowUp(interaction, payload) {
    if (!interaction.deferred && !interaction.replied) return false;

    return runInteractionMethod(interaction, "followUp", payload);
}

/**
 * Detects interaction response errors that should not flood logs.
 * @param {unknown} error Thrown Discord API error.
 */
function isHandledInteractionResponseError(error) {
    return handledInteractionCodes.has(getDiscordErrorCode(error));
}

/**
 * Detects expired interaction errors.
 * @param {unknown} error Thrown Discord API error.
 */
function isExpiredInteractionError(error) {
    return expiredInteractionCodes.has(getDiscordErrorCode(error));
}

function getReplyMethod(interaction, mode) {
    if (mode === "reply") {
        return interaction.deferred || interaction.replied ? null : "reply";
    }

    if (mode === "edit") {
        return interaction.deferred || interaction.replied ? "editReply" : null;
    }

    if (mode === "followup") {
        return interaction.deferred || interaction.replied ? "followUp" : null;
    }

    if (mode === "preferedit") {
        if (interaction.deferred && !interaction.replied) return "editReply";
        if (interaction.replied) return "followUp";

        return "reply";
    }

    if (interaction.deferred || interaction.replied) return "followUp";

    return "reply";
}

async function runInteractionMethod(interaction, method, payload) {
    try {
        await interaction[method](payload);
        return true;
    } catch (error) {
        if (isHandledInteractionResponseError(error)) return false;

        throw error;
    }
}

function getDiscordErrorCode(error) {
    return error?.code || error?.rawError?.code;
}

module.exports = {
    isExpiredInteractionError,
    isHandledInteractionResponseError,
    safeDeferReply,
    safeEditReply,
    safeFollowUp,
    safeReply,
};
