const {
    ActionRowBuilder,
    ChannelType,
    FileUploadBuilder,
    LabelBuilder,
    MessageFlags,
    ModalBuilder,
    PermissionFlagsBits,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    TextDisplayBuilder,
    TextInputBuilder,
    TextInputStyle,
    ThreadAutoArchiveDuration,
} = require("discord.js");
const { inspect } = require("util");
const { buildMessagePayload, validateMessageConfig } = require("./messages");
const { validateConditions } = require("./conditions");
const { addMetaValue, deleteMetaValue, getMetaValue, setMetaValue } = require("./meta");
const { resolveString, resolveValue } = require("./placeholders");
const { safeDeferReply, safeEditReply, safeReply } = require("../runtime/safereply");

const actionIds = new Set([
    "addCoins",
    "addReaction",
    "addRole",
    "addTag",
    "closeThread",
    "createChannel",
    "createThread",
    "crosspostMessage",
    "deleteChannel",
    "deleteMessage",
    "deleteThread",
    "editChannel",
    "editMessage",
    "editReply",
    "editThread",
    "evalJavaScript",
    "lockThread",
    "addMeta",
    "metaAdd",
    "metaListAdd",
    "metaListRemove",
    "metaRemove",
    "metaSet",
    "metaSubtract",
    "metaToggle",
    "openThread",
    "pinMessage",
    "randomAction",
    "removeCoins",
    "removeReaction",
    "removeRole",
    "removeTag",
    "reply",
    "resetCooldown",
    "sendMessage",
    "sendPrivateMessage",
    "sendRequest",
    "sendTyping",
    "setCoins",
    "setCooldown",
    "setMeta",
    "setTag",
    "showModal",
    "startThread",
    "timeout",
    "timeoutMember",
    "unlockThread",
    "unpinMessage",
    "deleteMeta",
    "log",
]);

/**
 * Runs a YAML action list.
 * @param {object[]} actions YAML action configs.
 * @param {object} context Runtime context.
 */
async function runActions(actions, context) {
    for (const action of actions || []) {
        await runAction(action, context);
    }
}

async function runAction(action, context) {
    if (Array.isArray(action.actions)) {
        const targetContext = await resolveTargetContext(action.target, context);

        if (await targetContext.evaluateConditions(action.conditions, targetContext)) {
            await runActions(action.actions, targetContext);
        }

        return;
    }

    if (!action.id) {
        throw new Error("Action is missing an id.");
    }

    const targetContext = await resolveTargetContext(action.target, context);

    if (!await targetContext.evaluateConditions(action.conditions, targetContext)) {
        await runNotMetActions(action.conditions, targetContext);
        return;
    }

    const args = action.id === "evalJavaScript"
        ? action.args || {}
        : await resolveValue(action.args || {}, targetContext);

    switch (action.id) {
        case "addCoins":
            await addMetaValue(targetContext, "coins", args.amount);
            break;
        case "addReaction":
            await addReaction(args, targetContext);
            break;
        case "addRole":
            await updateRole(args, targetContext, "add");
            break;
        case "addTag":
            await updateTags(args, targetContext, "add");
            break;
        case "closeThread":
            await editThreadState(targetContext, {
                archived: true,
            });
            break;
        case "createChannel":
            await createChannel(args, targetContext);
            break;
        case "createThread":
            await createThread(args, targetContext);
            break;
        case "crosspostMessage":
            await crosspostMessage(targetContext);
            break;
        case "deleteChannel":
            await deleteChannel(targetContext);
            break;
        case "deleteMessage":
            await deleteMessage(targetContext);
            break;
        case "deleteThread":
            await deleteThread(targetContext);
            break;
        case "editChannel":
            await editChannel(args, targetContext);
            break;
        case "editMessage":
            await editMessage(args, targetContext);
            break;
        case "editReply":
            await editReply(args, targetContext);
            break;
        case "editThread":
            await editThread(args, targetContext);
            break;
        case "evalJavaScript":
            await evalJavaScript(args, targetContext);
            break;
        case "lockThread":
            await editThreadState(targetContext, {
                locked: true,
            });
            break;
        case "addMeta":
        case "metaAdd":
            await addMetaValue(targetContext, args.key, args.value);
            break;
        case "metaListAdd":
            await updateMetaList(targetContext, args, "add");
            break;
        case "metaListRemove":
            await updateMetaList(targetContext, args, "remove");
            break;
        case "deleteMeta":
        case "metaRemove":
            await deleteMetaValue(targetContext, args.key);
            break;
        case "setMeta":
        case "metaSet":
            await setMetaValue(targetContext, args.key, args.value);
            break;
        case "metaSubtract":
            await addMetaValue(targetContext, args.key, -Number(args.value || 0));
            break;
        case "metaToggle":
            await setMetaValue(targetContext, args.key, !toBoolean(await getMetaValue(targetContext, args.key)));
            break;
        case "openThread":
            await editThreadState(targetContext, {
                archived: false,
            });
            break;
        case "pinMessage":
            await pinMessage(targetContext);
            break;
        case "randomAction":
            await randomAction(args, targetContext);
            break;
        case "removeCoins":
            await addMetaValue(targetContext, "coins", -Number(args.amount || 0));
            break;
        case "removeReaction":
            await removeReaction(args, targetContext);
            break;
        case "removeRole":
            await updateRole(args, targetContext, "remove");
            break;
        case "removeTag":
            await updateTags(args, targetContext, "remove");
            break;
        case "reply":
            await reply(args, targetContext);
            break;
        case "resetCooldown":
            await deleteMetaValue(targetContext, cooldownKey(args.value));
            break;
        case "sendMessage":
            await sendMessage(args, targetContext);
            break;
        case "sendPrivateMessage":
            await sendPrivateMessage(args, targetContext);
            break;
        case "sendRequest":
            await sendRequest(args, targetContext);
            break;
        case "sendTyping":
            await sendTyping(targetContext);
            break;
        case "setCoins":
            await setMetaValue(targetContext, "coins", Number(args.amount || 0));
            break;
        case "setCooldown":
            await setMetaValue(targetContext, cooldownKey(args.value), Date.now() + Number(args.duration || 0) * 1000);
            break;
        case "setTag":
            await updateTags(args, targetContext, "set");
            break;
        case "showModal":
            await showModal(args, targetContext);
            break;
        case "startThread":
            await startThread(args, targetContext);
            break;
        case "timeout":
        case "timeoutMember":
            await timeoutMember(args, targetContext);
            break;
        case "unlockThread":
            await editThreadState(targetContext, {
                locked: false,
            });
            break;
        case "unpinMessage":
            await unpinMessage(targetContext);
            break;
        case "log":
            targetContext.logger.info(await resolveString(args.message || args.value || "", targetContext));
            break;
        default:
            throw new Error(`Unsupported action "${action.id}".`);
    }
}

async function reply(args, context) {
    const payload = await buildMessagePayload(args, context);

    if (context.interaction) {
        await safeReply(context.interaction, payload);
        return;
    }

    if (context.message) {
        await context.message.reply(payload);
        return;
    }

    throw new Error("reply action needs an interaction or message context.");
}

async function sendMessage(args, context) {
    const channel = await resolveChannel(args.channel, context);
    const payload = await buildMessagePayload(args, context);
    payload.flags &= ~MessageFlags.Ephemeral;

    if (!channel?.send) {
        throw new Error("sendMessage action could not resolve a sendable channel.");
    }

    await channel.send(payload);
}

async function editReply(args, context) {
    if (!context.interaction) {
        throw new Error("editReply action needs an interaction context.");
    }

    const payload = await buildMessagePayload(args, context);

    await safeEditReply(context.interaction, payload);
}

async function sendTyping(context) {
    if (!context.channel?.sendTyping) return;

    await context.channel.sendTyping();
}

async function addReaction(args, context) {
    const message = context.message || await fetchInteractionReply(context);
    const values = Array.isArray(args.value) ? args.value : [args.value];

    for (const value of values.filter(Boolean)) {
        await message.react(value);
    }
}

async function deleteMessage(context) {
    if (!context.message?.deletable) return;

    await context.message.delete();
}

async function editMessage(args, context) {
    const message = context.message || await fetchInteractionReply(context);
    const payload = await buildMessagePayload(args, context);
    payload.flags &= ~MessageFlags.Ephemeral;

    if (!message?.editable) {
        throw new Error("editMessage action could not resolve an editable message.");
    }

    await message.edit(payload);
}

async function sendPrivateMessage(args, context) {
    if (!context.user?.send) {
        throw new Error("sendPrivateMessage action needs a user context.");
    }

    try {
        const payload = await buildMessagePayload(args, context);
        payload.flags &= ~MessageFlags.Ephemeral;

        await context.user.send(payload);
    } catch (error) {
        context.logger.warn(`Could not send a private YAML message to ${context.user?.id}:`, error.message);
    }
}

async function createChannel(args, context) {
    if (!context.guild?.channels) {
        throw new Error("createChannel action needs a guild context.");
    }

    await context.guild.channels.create({
        name: String(args.value),
        type: getChannelType(args["channel-type"] || args.channelType || "text"),
        parent: args.parent ? String(args.parent) : undefined,
        topic: args.description ? String(args.description) : undefined,
        permissionOverwrites: getPermissionOverwrites(args),
    });
}

async function editChannel(args, context) {
    const channel = await resolveChannel(args.channel, context);

    if (!channel?.edit) {
        throw new Error("editChannel action could not resolve an editable channel.");
    }

    await channel.edit({
        name: args.value ? String(args.value) : undefined,
        parent: args.parent ? String(args.parent) : undefined,
        topic: args.description ? String(args.description) : undefined,
        permissionOverwrites: getPermissionOverwrites(args),
    });
}

async function deleteChannel(context) {
    if (!context.channel?.delete) {
        throw new Error("deleteChannel action needs a deletable channel context.");
    }

    await context.channel.delete();
}

async function createThread(args, context) {
    const channel = await resolveChannel(args.channel, context);

    if (!channel?.threads?.create) {
        throw new Error("createThread action needs a channel that can create threads.");
    }

    const threadOptions = {
        name: String(args.value),
        autoArchiveDuration: getArchiveDuration(args.duration),
    };

    if (Array.isArray(args.tags) || args.tags) {
        threadOptions.appliedTags = list(args.tags);
    }

    if (args.private && channel.type !== ChannelType.GuildForum) {
        threadOptions.type = ChannelType.PrivateThread;
    }

    if (channel.type === ChannelType.GuildForum) {
        threadOptions.message = await buildMessagePayload(args, context);
    }

    await channel.threads.create(threadOptions);
}

async function startThread(args, context) {
    if (!context.message?.startThread) {
        throw new Error("startThread action needs a message context.");
    }

    await context.message.startThread({
        name: String(args.value),
        autoArchiveDuration: getArchiveDuration(args.duration),
    });
}

async function editThread(args, context) {
    const thread = getThread(context);

    await thread.edit({
        name: args.value ? String(args.value) : undefined,
        autoArchiveDuration: getArchiveDuration(args.duration),
        appliedTags: args.tags ? list(args.tags) : undefined,
    });
}

async function editThreadState(context, patch) {
    const thread = getThread(context);

    await thread.edit(patch);
}

async function deleteThread(context) {
    const thread = getThread(context);

    await thread.delete();
}

async function updateTags(args, context, mode) {
    const thread = getThread(context);
    const values = list(args.value);
    const current = thread.appliedTags || [];
    let next;

    if (mode === "set") next = values;
    else if (mode === "add") next = [...new Set([...current, ...values])];
    else next = current.filter((tag) => !values.includes(tag));

    await thread.setAppliedTags(next);
}

async function crosspostMessage(context) {
    if (!context.message?.crosspost) {
        throw new Error("crosspostMessage action needs a crosspostable message context.");
    }

    await context.message.crosspost();
}

async function pinMessage(context) {
    const message = context.message || await fetchInteractionReply(context);

    await message.pin();
}

async function unpinMessage(context) {
    const message = context.message || await fetchInteractionReply(context);

    await message.unpin();
}

async function removeReaction(args, context) {
    const message = context.message || await fetchInteractionReply(context);
    const values = list(args.value);

    if (!values.length) {
        await message.reactions.removeAll();
        return;
    }

    for (const value of values) {
        const reaction = message.reactions.cache.get(value)
            || message.reactions.cache.find((cachedReaction) => cachedReaction.emoji.toString() === value);

        if (reaction) await reaction.users.remove(context.client.user.id);
    }
}

async function showModal(args, context) {
    if (!context.interaction?.showModal) {
        throw new Error("showModal action needs an interaction context.");
    }

    const modal = new ModalBuilder()
        .setTitle(String(args.title || "Modal"))
        .setCustomId(String(args["custom-id"] || args.customId));

    addModalComponents(modal, args.components || []);

    await context.interaction.showModal(modal);
}

async function randomAction(args, context) {
    const actions = args.actions || [];

    if (!actions.length) return;

    await runAction(actions[Math.floor(Math.random() * actions.length)], context);
}

async function sendRequest(args, context) {
    const headers = args.headers || {};
    const request = await fetch(String(args.value), {
        method: args.method || "GET",
        headers,
        body: args.body && String(args.method || "GET").toUpperCase() !== "GET"
            ? typeof args.body === "string" ? args.body : JSON.stringify(args.body)
            : undefined,
    });
    const text = await request.text();
    let payload = text;

    try {
        payload = JSON.parse(text);
    } catch {}

    context.variables.data_status = request.status;
    context.variables.data_ok = request.ok;
    flattenData(payload, "data", context.variables);

    if (Array.isArray(args["follow-up-actions"])) {
        await runActions(args["follow-up-actions"], context);
    }
}

async function evalJavaScript(args, context) {
    if (!context.interaction) {
        throw new Error("evalJavaScript action needs an interaction context.");
    }

    const deferred = await safeDeferReply(context.interaction, {
        flags: MessageFlags.Ephemeral,
    });

    if (!deferred && !context.interaction.deferred && !context.interaction.replied) return;

    const code = await resolveString(args.code || "", context);
    const restricted = ["global", "process", "require", "child_process", "fs", "eval", "Bun"];

    context.variables.eval_code = truncate(code, 1000);

    if (new RegExp(restricted.join("|")).test(code)) {
        context.variables.eval_error_type = "RestrictedCode";
        context.variables.eval_error = "The code includes restricted functions or properties.";

        await safeEditReply(context.interaction, await buildMessagePayload(args.error || defaultEvalErrorMessage(), context));
        return;
    }

    try {
        const startedAt = process.hrtime();
        let evaluated = await evalWithTimeout(code, Number(args.timeout || 3000));
        const evaluatedType = getEvalType(evaluated);

        if (typeof evaluated !== "string") {
            evaluated = inspect(evaluated, {
                depth: 2,
            });
        }

        const elapsed = process.hrtime(startedAt);
        const executionTime = (elapsed[0] * 1000 + elapsed[1] / 1e6).toFixed(3);
        const resultSize = Buffer.byteLength(evaluated, "utf8");

        context.variables.eval_type = evaluatedType;
        context.variables.eval_result = truncate(evaluated, 1000);
        context.variables.eval_size = resultSize > 1024 ? `${(resultSize / 1024).toFixed(2)} KB` : `${resultSize} bytes`;
        context.variables.eval_time = `${executionTime}ms`;

        await safeEditReply(context.interaction, await buildMessagePayload(args.success || defaultEvalSuccessMessage(), context));
    } catch (error) {
        context.variables.eval_error_type = error instanceof SyntaxError ? "SyntaxError" : error.constructor.name;
        context.variables.eval_error = truncate(String(error), 1000);

        await safeEditReply(context.interaction, await buildMessagePayload(args.error || defaultEvalErrorMessage(), context));
    }
}

async function updateRole(args, context, mode) {
    const member = await resolveMember(args.member || args.user, context);
    const roles = args.value === undefined && context.role
        ? [context.role.id]
        : Array.isArray(args.value) ? args.value : [args.value];

    if (!member?.roles) {
        throw new Error(`${mode}Role action could not resolve a guild member.`);
    }

    for (const roleValue of roles.filter(Boolean)) {
        const role = resolveRole(roleValue, context);

        if (!role) {
            throw new Error(`Could not resolve role "${roleValue}".`);
        }

        if (mode === "add") await member.roles.add(role);
        else await member.roles.remove(role);
    }
}

async function timeoutMember(args, context) {
    const member = await resolveMember(args.member || args.user || args.value, context);
    const seconds = Number(args.duration || args.seconds || 60);

    if (!member?.timeout) {
        throw new Error("timeout action could not resolve a guild member.");
    }

    await member.timeout(seconds * 1000, args.reason || "YAML action timeout");
}

async function resolveTargetContext(target, context) {
    if (!target) return context;

    const resolvedTarget = await resolveValue(target, context);
    const next = {
        ...context,
    };

    if (resolvedTarget.guild) {
        next.guild = await resolveGuild(resolvedTarget.guild, next);
    }

    if (resolvedTarget.channel) {
        next.channel = await resolveChannel(resolvedTarget.channel, next);
    }

    if (resolvedTarget.user) {
        next.user = await resolveUser(resolvedTarget.user, next);
    }

    if (resolvedTarget.member) {
        next.member = await resolveMember(resolvedTarget.member, next);
        next.user = next.member?.user || next.user;
    }

    if (resolvedTarget.role) {
        next.role = resolveRole(resolvedTarget.role, next);
    }

    if (resolvedTarget.message) {
        next.message = await resolveMessage(resolvedTarget.message, next);
        next.channel = next.message?.channel || next.channel;
        next.guild = next.message?.guild || next.guild;
    }

    return next;
}

async function updateMetaList(context, args, mode) {
    const current = await getMetaValue(context, args.key);
    const values = Array.isArray(current) ? current : list(current).filter(Boolean);
    const value = String(args.value);
    const next = mode === "add"
        ? [...new Set([...values, value])]
        : values.filter((entry) => entry !== value);

    await setMetaValue(context, args.key, next);
}

async function runNotMetActions(conditions, context) {
    for (const condition of conditions || []) {
        if (Array.isArray(condition["not-met-actions"]) && !await context.evaluateConditions([condition], context)) {
            await runActions(condition["not-met-actions"], context);
        }
    }
}

function addModalComponents(modal, configs) {
    if (!Array.isArray(configs) || configs.length === 0) {
        throw new Error("showModal action needs at least one component.");
    }

    if (configs.length > 5) {
        throw new Error("showModal action cannot have more than five top-level components.");
    }

    for (let index = 0; index < configs.length;) {
        const type = getModalComponentType(configs[index]);

        if (type === "label") {
            const labels = [];

            while (configs[index] && getModalComponentType(configs[index]) === "label") {
                labels.push(buildModalLabel(configs[index]));
                index += 1;
            }

            modal.addLabelComponents(...labels);
            continue;
        }

        if (type === "text-display") {
            const textDisplays = [];

            while (configs[index] && getModalComponentType(configs[index]) === "text-display") {
                textDisplays.push(buildModalTextDisplay(configs[index]));
                index += 1;
            }

            modal.addTextDisplayComponents(...textDisplays);
            continue;
        }

        modal.addComponents(buildModalRow(configs[index]));
        index += 1;
    }
}

function buildModalLabel(config) {
    const inputConfig = config.component || config.input;

    if (!inputConfig) {
        throw new Error("A modal label needs a nested component.");
    }

    const label = new LabelBuilder()
        .setLabel(String(config.label || inputConfig.label || getCustomId(inputConfig)));

    if (config.description) label.setDescription(String(config.description));

    switch (getModalComponentType(inputConfig)) {
        case "text-input":
            label.setTextInputComponent(buildModalTextInput(inputConfig));
            break;
        case "string-select":
            label.setStringSelectMenuComponent(buildModalStringSelect(inputConfig));
            break;
        case "file-upload":
            label.setFileUploadComponent(buildModalFileUpload(inputConfig));
            break;
        default:
            throw new Error(`Unsupported modal label component type "${inputConfig.type}".`);
    }

    return label;
}

function buildModalTextDisplay(config) {
    return new TextDisplayBuilder().setContent(String(config.content ?? config.value ?? ""));
}

function buildModalRow(config) {
    return new ActionRowBuilder().addComponents(buildModalTextInput(config, {
        legacyLabel: true,
    }));
}

function buildModalTextInput(config, options = {}) {
    const inputConfig = config.component || config;
    const input = new TextInputBuilder()
        .setCustomId(String(getCustomId(inputConfig)))
        .setStyle(getTextInputStyle(inputConfig.style));

    if (options.legacyLabel) {
        input.setLabel(String(config.label || inputConfig.label || getCustomId(inputConfig)));
    }

    if (inputConfig.placeholder) input.setPlaceholder(String(inputConfig.placeholder));
    if (inputConfig.value !== undefined) input.setValue(String(inputConfig.value));
    if (inputConfig.required !== undefined) input.setRequired(toBoolean(inputConfig.required));
    if (inputConfig["min-length"] !== undefined) input.setMinLength(Number(inputConfig["min-length"]));
    if (inputConfig["max-length"] !== undefined) input.setMaxLength(Number(inputConfig["max-length"]));

    return input;
}

function buildModalStringSelect(config) {
    const options = config.options || [];

    if (!Array.isArray(options) || options.length === 0 || options.length > 25) {
        throw new Error("A modal string-select needs 1-25 options.");
    }

    const select = new StringSelectMenuBuilder()
        .setCustomId(String(getCustomId(config)));

    if (config.placeholder) select.setPlaceholder(String(config.placeholder));
    if (config.required !== undefined) select.setRequired(toBoolean(config.required));
    if (config["min-values"] !== undefined) select.setMinValues(Number(config["min-values"]));
    if (config.minValues !== undefined) select.setMinValues(Number(config.minValues));
    if (config["max-values"] !== undefined) select.setMaxValues(Number(config["max-values"]));
    if (config.maxValues !== undefined) select.setMaxValues(Number(config.maxValues));

    select.addOptions(options.map(buildModalStringSelectOption));

    return select;
}

function buildModalStringSelectOption(option) {
    const label = option.label || option.name;
    const selectOption = new StringSelectMenuOptionBuilder()
        .setLabel(String(label))
        .setValue(String(option.value ?? label));

    if (option.description) selectOption.setDescription(String(option.description));
    if (option.emoji) selectOption.setEmoji(option.emoji);
    if (option.default) selectOption.setDefault(true);

    return selectOption;
}

function buildModalFileUpload(config) {
    const upload = new FileUploadBuilder()
        .setCustomId(String(getCustomId(config)));

    if (config.required !== undefined) upload.setRequired(toBoolean(config.required));
    if (config["min-values"] !== undefined) upload.setMinValues(Number(config["min-values"]));
    if (config.minValues !== undefined) upload.setMinValues(Number(config.minValues));
    if (config["max-values"] !== undefined) upload.setMaxValues(Number(config["max-values"]));
    if (config.maxValues !== undefined) upload.setMaxValues(Number(config.maxValues));

    return upload;
}

function getModalComponentType(config = {}) {
    if (!config.type) {
        if (Array.isArray(config.options)) return "string-select";

        return "text-input";
    }

    const normalized = String(config.type).replaceAll("_", "-").toLowerCase();
    const aliases = {
        input: "text-input",
        select: "string-select",
        "select-menu": "string-select",
        "string-select-menu": "string-select",
        text: "text-display",
        textdisplay: "text-display",
        upload: "file-upload",
        file: "file-upload",
    };

    return aliases[normalized] || normalized;
}

function getCustomId(config) {
    const customId = config["custom-id"] || config.customId;

    if (!customId) {
        throw new Error(`${config.type || "modal component"} needs custom-id.`);
    }

    return customId;
}

function getTextInputStyle(value) {
    return String(value || "short").toLowerCase() === "paragraph"
        ? TextInputStyle.Paragraph
        : TextInputStyle.Short;
}

function getChannelType(value) {
    const normalized = String(value).replaceAll("_", "").replaceAll("-", "").toLowerCase();
    const types = {
        announcement: ChannelType.GuildAnnouncement,
        category: ChannelType.GuildCategory,
        forum: ChannelType.GuildForum,
        media: ChannelType.GuildMedia,
        stage: ChannelType.GuildStageVoice,
        text: ChannelType.GuildText,
        voice: ChannelType.GuildVoice,
    };

    return types[normalized] ?? ChannelType.GuildText;
}

function getArchiveDuration(duration) {
    const minutes = Math.ceil(Number(duration || 3600) / 60);
    const allowed = [
        ThreadAutoArchiveDuration.OneHour,
        ThreadAutoArchiveDuration.OneDay,
        ThreadAutoArchiveDuration.ThreeDays,
        ThreadAutoArchiveDuration.OneWeek,
    ];

    return allowed.find((value) => value >= minutes) || ThreadAutoArchiveDuration.OneWeek;
}

function getPermissionOverwrites(args) {
    const overwrites = args["permission-overwrites"] || args.permissionOverwrites;

    if (!Array.isArray(overwrites)) return undefined;

    return overwrites.map((overwrite) => ({
        id: String(overwrite.id),
        allow: list(overwrite.allow).map(normalizePermission).filter(Boolean),
        deny: list(overwrite.deny).map(normalizePermission).filter(Boolean),
    }));
}

function normalizePermission(value) {
    const normalized = String(value).replaceAll("_", "").toLowerCase();
    const key = Object.keys(PermissionFlagsBits).find((permission) => permission.toLowerCase() === normalized);

    return key ? PermissionFlagsBits[key] : null;
}

function getThread(context) {
    const channel = context.channel;

    if (!channel?.isThread?.()) {
        throw new Error("This action needs a thread context.");
    }

    return channel;
}

function flattenData(value, prefix, target) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
        for (const [key, entry] of Object.entries(value)) {
            flattenData(entry, `${prefix}_${key}`, target);
        }

        return;
    }

    target[prefix] = Array.isArray(value) ? value.join(", ") : value;
}

function cooldownKey(value) {
    return `cooldown:${value || "default"}`;
}

function toBoolean(value) {
    return value === true || String(value).toLowerCase() === "true";
}

async function resolveChannel(value, context) {
    if (!value) return context.channel;

    const id = String(value).replace(/[<#>]/g, "");
    const cached = context.client.channels.cache.get(id)
        || context.guild?.channels.cache.find((channel) => channel.name === value);

    if (cached) return cached;

    return context.client.channels.fetch(id);
}

async function resolveGuild(value, context) {
    const guild = String(value);

    return context.client.guilds.cache.get(guild)
        || context.client.guilds.cache.find((cachedGuild) => cachedGuild.name.toLowerCase() === guild.toLowerCase())
        || context.client.guilds.fetch(guild);
}

async function resolveUser(value, context) {
    const id = String(value).replace(/[<@!>]/g, "");

    return context.client.users.cache.get(id)
        || context.guild?.members.cache.find((member) => member.displayName.toLowerCase() === String(value).toLowerCase())?.user
        || context.client.users.fetch(id);
}

async function resolveMessage(value, context) {
    if (!context.channel?.messages) {
        throw new Error("message target needs a channel context.");
    }

    const id = String(value);
    const cached = context.channel.messages.cache.get(id)
        || context.channel.messages.cache.find((message) => message.content === id);

    return cached || context.channel.messages.fetch(id);
}

function list(value) {
    if (Array.isArray(value)) return value.map(String);
    if (value === undefined || value === null || value === "") return [];

    return [String(value)];
}

async function resolveMember(value, context) {
    if (!value) return context.member;

    const id = String(value).replace(/[<@!>]/g, "");

    return context.guild?.members.cache.get(id) || context.guild?.members.fetch(id);
}

function resolveRole(value, context) {
    if (!value && context.role) return context.role;

    const roleValue = String(value).replace(/[<@&>]/g, "");

    return context.guild?.roles.cache.get(roleValue)
        || context.guild?.roles.cache.find((role) => role.name.toLowerCase() === String(value).toLowerCase());
}

function evalWithTimeout(code, timeout) {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => reject(new Error("Execution timed out.")), timeout);

        Promise.resolve(eval(`(async () => { return ${code} })()`))
            .then((value) => {
                clearTimeout(timeoutId);
                resolve(value);
            })
            .catch((error) => {
                clearTimeout(timeoutId);
                reject(error);
            });
    });
}

function getEvalType(value) {
    if (Array.isArray(value)) return "array";
    if (value === null) return "null";

    return typeof value;
}

function defaultEvalSuccessMessage() {
    return {
        components: [
            {
                type: "container",
                color: "#5865f2",
                components: [
                    {
                        type: "text-display",
                        content: "## JavaScript evaluation",
                    },
                    {
                        type: "text-display",
                        content: "**Type:** `%eval_type%`\n**Time:** `%eval_time%`\n**Size:** `%eval_size%`",
                    },
                    {
                        type: "text-display",
                        content: "```js\n%eval_result%\n```",
                    },
                ],
            },
        ],
    };
}

function defaultEvalErrorMessage() {
    return {
        components: [
            {
                type: "container",
                color: "#ed4245",
                components: [
                    {
                        type: "text-display",
                        content: "## JavaScript evaluation failed",
                    },
                    {
                        type: "text-display",
                        content: "**%eval_error_type%**\n```js\n%eval_error%\n```",
                    },
                ],
            },
        ],
    };
}

function truncate(text, maxLength) {
    const value = String(text);

    return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

async function fetchInteractionReply(context) {
    if (!context.interaction) {
        throw new Error("No message is available for this action.");
    }

    return context.interaction.fetchReply();
}

module.exports = {
    runActions,
    validateActions,
};

function validateActions(actions, messages = new Map()) {
    if (!Array.isArray(actions) || actions.length === 0) {
        return {
            valid: false,
            reason: "actions must be a non-empty array",
        };
    }

    for (const action of actions) {
        const conditionValidation = validateConditions(action.conditions);

        if (!conditionValidation.valid) return conditionValidation;

        if (Array.isArray(action.actions)) {
            const validation = validateActions(action.actions, messages);

            if (!validation.valid) return validation;
            const conditionValidation = validateNotMetActions(action.conditions, messages);

            if (!conditionValidation.valid) return conditionValidation;
            continue;
        }

        const notMetValidation = validateNotMetActions(action.conditions, messages);
        if (!notMetValidation.valid) return notMetValidation;

        if (Array.isArray(action.args?.actions)) {
            const validation = validateActions(action.args.actions, messages);

            if (!validation.valid) return validation;
        }

        if (Array.isArray(action.args?.["follow-up-actions"])) {
            const validation = validateActions(action.args["follow-up-actions"], messages);

            if (!validation.valid) return validation;
        }

        if (!actionIds.has(action.id)) {
            return {
                valid: false,
                reason: `unsupported action "${action.id}"`,
            };
        }

        const messageValidation = validateActionMessage(action, messages);

        if (!messageValidation.valid) return messageValidation;
    }

    return {
        valid: true,
    };
}

function validateNotMetActions(conditions, messages) {
    for (const condition of conditions || []) {
        if (Array.isArray(condition["not-met-actions"])) {
            const validation = validateActions(condition["not-met-actions"], messages);

            if (!validation.valid) return validation;
        }
    }

    return {
        valid: true,
    };
}

function validateActionMessage(action, messages) {
    if (!["reply", "sendMessage", "sendPrivateMessage", "editMessage", "editReply"].includes(action.id)) {
        return {
            valid: true,
        };
    }

    const args = action.args || {};

    if (args.message || args["message-id"] || args.messageId) {
        const messageId = String(args.message || args["message-id"] || args.messageId);

        return {
            valid: messages.has(messageId),
            reason: `unknown message template "${messageId}"`,
        };
    }

    if (args.components || args.content) {
        return validateMessageConfig(args);
    }

    return {
        valid: false,
        reason: `${action.id} action needs message, components, or content`,
    };
}
