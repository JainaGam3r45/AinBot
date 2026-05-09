const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    FileBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags,
    SectionBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    StringSelectMenuBuilder,
    TextDisplayBuilder,
    ThumbnailBuilder,
} = require("discord.js");
const path = require("path");
const { loadModuleYamlFiles } = require("./files");
const { resolveValue } = require("./placeholders");

const buttonStyles = {
    primary: ButtonStyle.Primary,
    secondary: ButtonStyle.Secondary,
    success: ButtonStyle.Success,
    danger: ButtonStyle.Danger,
    link: ButtonStyle.Link,
    url: ButtonStyle.Link,
};

/**
 * Loads reusable message templates.
 * @param {object} logger Logger used for invalid configs.
 */
async function loadMessageTemplates(logger) {
    const templates = new Map();
    const files = await loadModuleYamlFiles([path.join("messages"), path.join("resources", "messages")], logger, ["configs/messages"]);

    for (const file of files) {
        const id = String(file.value.id || file.id).trim();

        if (!id) {
            logger.issue(`Message template ${file.file} is missing an id.`);
            continue;
        }

        const validation = validateMessageConfig(file.value);

        if (!validation.valid) {
            logger.issue(`Message template ${id} is invalid: ${validation.reason}`);
            continue;
        }

        templates.set(id, {
            ...file.value,
            id,
            file: file.file,
        });
    }

    return templates;
}

/**
 * Builds a Discord message payload from a YAML message config.
 * @param {object} input Inline message config or action args.
 * @param {object} context Runtime placeholder context.
 */
async function buildMessagePayload(input, context) {
    const source = getMessageSource(input, context);
    const resolved = await resolveValue(source, context);
    const components = await buildComponents(getConfiguredComponents(resolved), context);
    const validation = validateBuiltMessage(components);

    if (!validation.valid) {
        throw new Error(validation.reason);
    }

    const payload = {
        components,
        flags: MessageFlags.IsComponentsV2,
    };

    if (resolved.ephemeral) {
        payload.flags |= MessageFlags.Ephemeral;
    }

    if (resolved["disable-mentions"] || resolved.disableMentions) {
        payload.allowedMentions = {
            parse: [],
            users: [],
            roles: [],
            repliedUser: false,
        };
    }

    return payload;
}

function getMessageSource(input, context) {
    const messageId = input.message || input["message-id"] || input.messageId;

    if (messageId) {
        const template = context.messages.get(String(messageId));

        if (!template) {
            throw new Error(`Unknown message template "${messageId}".`);
        }

        return {
            ...template,
            ephemeral: input.ephemeral ?? template.ephemeral,
            "disable-mentions": input["disable-mentions"] ?? input.disableMentions ?? template["disable-mentions"],
        };
    }

    return input;
}

function getConfiguredComponents(config) {
    if (Array.isArray(config.components)) return config.components;
    if (config.content) {
        return [
            {
                type: "text-display",
                content: config.content,
            },
        ];
    }

    return [];
}

async function buildComponents(configs, context) {
    const components = [];

    for (const config of configs) {
        if (await shouldRenderComponent(config, context)) {
            components.push(buildComponent(config, context));
        }
    }

    return components;
}

async function shouldRenderComponent(config, context) {
    if (!Array.isArray(config.conditions) || !context.evaluateConditions) return true;

    return context.evaluateConditions(config.conditions, context);
}

function buildComponent(config, context) {
    switch (config.type) {
        case "text-display":
            return new TextDisplayBuilder().setContent(String(config.content ?? ""));
        case "container":
            return buildContainer(config, context);
        case "section":
            return buildSection(config, context);
        case "separator":
            return buildSeparator(config);
        case "action-row":
            return buildActionRow(config, context);
        case "button":
            return buildButton(config);
        case "select-menu":
            return buildSelectMenu(config);
        case "thumbnail":
            return buildThumbnail(config);
        case "media-gallery":
            return buildMediaGallery(config);
        case "file":
            return buildFile(config);
        default:
            throw new Error(`Unsupported display component type "${config.type}".`);
    }
}

function buildContainer(config, context) {
    const builder = new ContainerBuilder();

    if (config.color) builder.setAccentColor(parseColor(config.color));
    if (config.spoiler) builder.setSpoiler(true);

    for (const component of config.components || []) {
        const child = buildComponent(component, context);

        switch (component.type) {
            case "text-display":
                builder.addTextDisplayComponents(child);
                break;
            case "section":
                builder.addSectionComponents(child);
                break;
            case "action-row":
                builder.addActionRowComponents(child);
                break;
            case "media-gallery":
                builder.addMediaGalleryComponents(child);
                break;
            case "separator":
                builder.addSeparatorComponents(child);
                break;
            case "file":
                builder.addFileComponents(child);
                break;
            default:
                throw new Error(`Component "${component.type}" cannot be inside a container.`);
        }
    }

    return builder;
}

function buildSection(config, context) {
    const builder = new SectionBuilder();
    const textComponents = (config.components || []).filter((component) => component.type === "text-display");

    if (!textComponents.length) {
        throw new Error("A section needs at least one text-display component.");
    }

    builder.addTextDisplayComponents(...textComponents.slice(0, 3).map((component) => buildComponent(component, context)));

    if (config.accessory) {
        if (config.accessory.type === "button") {
            builder.setButtonAccessory(buildButton(config.accessory));
        } else if (config.accessory.type === "thumbnail") {
            builder.setThumbnailAccessory(buildThumbnail(config.accessory));
        } else {
            throw new Error("A section accessory must be a button or thumbnail.");
        }
    } else {
        throw new Error("A section needs a button or thumbnail accessory.");
    }

    return builder;
}

function buildSeparator(config) {
    const builder = new SeparatorBuilder();

    if (config.divider !== undefined) builder.setDivider(Boolean(config.divider));
    if (config.spacing !== undefined) {
        builder.setSpacing(Number(config.spacing) >= 2 ? SeparatorSpacingSize.Large : SeparatorSpacingSize.Small);
    }

    return builder;
}

function buildActionRow(config, context) {
    const components = config.components || [];

    if (!components.length) {
        throw new Error("An action-row needs at least one component.");
    }

    return new ActionRowBuilder().setComponents(...components.map((component) => buildComponent(component, context)));
}

function buildButton(config) {
    const style = buttonStyles[String(config.style || "secondary").toLowerCase()];

    if (!style) {
        throw new Error(`Unsupported button style "${config.style}".`);
    }

    const builder = new ButtonBuilder().setStyle(style);

    if (config.label) builder.setLabel(String(config.label));
    if (config.emoji) builder.setEmoji(config.emoji);
    if (config.disabled) builder.setDisabled(true);

    if (style === ButtonStyle.Link) {
        builder.setURL(String(config.url));
    } else {
        builder.setCustomId(String(config["custom-id"] || config.customId));
    }

    return builder;
}

function buildSelectMenu(config) {
    const builder = new StringSelectMenuBuilder()
        .setCustomId(String(config["custom-id"] || config.customId));

    if (config.placeholder) builder.setPlaceholder(String(config.placeholder));
    if (config["min-values"] !== undefined) builder.setMinValues(Number(config["min-values"]));
    if (config["max-values"] !== undefined) builder.setMaxValues(Number(config["max-values"]));

    builder.addOptions((config.options || []).map((option) => ({
        label: String(option.label),
        value: String(option.value),
        description: option.description ? String(option.description) : undefined,
        emoji: option.emoji,
        default: Boolean(option.default),
    })));

    return builder;
}

function buildThumbnail(config) {
    const builder = new ThumbnailBuilder().setURL(String(config.url));

    if (config.description) builder.setDescription(String(config.description));
    if (config.spoiler) builder.setSpoiler(true);

    return builder;
}

function buildMediaGallery(config) {
    const builder = new MediaGalleryBuilder();

    builder.addItems((config.items || []).map((item) => {
        const mediaItem = new MediaGalleryItemBuilder().setURL(String(item.url));

        if (item.description) mediaItem.setDescription(String(item.description));
        if (item.spoiler) mediaItem.setSpoiler(true);

        return mediaItem;
    }));

    return builder;
}

function buildFile(config) {
    const builder = new FileBuilder().setURL(String(config.url));

    if (config.spoiler) builder.setSpoiler(true);

    return builder;
}

function parseColor(value) {
    const color = String(value).trim().replace(/^#/, "");

    if (!/^[0-9a-f]{6}$/i.test(color)) {
        throw new Error(`Invalid container color "${value}".`);
    }

    return Number.parseInt(color, 16);
}

function validateMessageConfig(config) {
    const components = getConfiguredComponents(config);

    if (!Array.isArray(components) || components.length === 0) {
        return {
            valid: false,
            reason: "message needs at least one component or content value",
        };
    }

    const validation = validateComponentConfigs(components);

    if (!validation.valid) return validation;

    return {
        valid: true,
    };
}

function validateComponentConfigs(components) {
    for (const component of components) {
        const validation = validateComponentConfig(component);

        if (!validation.valid) return validation;
    }

    return {
        valid: true,
    };
}

function validateComponentConfig(component) {
    if (!component?.type) {
        return {
            valid: false,
            reason: "component is missing a type",
        };
    }

    switch (component.type) {
        case "text-display":
            return requireField(component, "content");
        case "container":
            return validateComponentConfigs(component.components || []);
        case "section":
            if (!Array.isArray(component.components) || !component.components.some((child) => child.type === "text-display")) {
                return {
                    valid: false,
                    reason: "section needs at least one text-display component",
                };
            }

            if (!component.accessory) {
                return {
                    valid: false,
                    reason: "section needs a button or thumbnail accessory",
                };
            }

            return component.accessory ? validateComponentConfig(component.accessory) : { valid: true };
        case "separator":
            return {
                valid: true,
            };
        case "action-row":
            if (!Array.isArray(component.components) || component.components.length === 0 || component.components.length > 5) {
                return {
                    valid: false,
                    reason: "action-row needs 1-5 components",
                };
            }

            return validateComponentConfigs(component.components);
        case "button":
            if (String(component.style || "secondary").toLowerCase() === "link") return requireField(component, "url");

            return requireField(component, component["custom-id"] ? "custom-id" : "customId");
        case "select-menu":
            if (!Array.isArray(component.options) || component.options.length === 0 || component.options.length > 25) {
                return {
                    valid: false,
                    reason: "select-menu needs 1-25 options",
                };
            }

            return requireField(component, component["custom-id"] ? "custom-id" : "customId");
        case "thumbnail":
        case "file":
            return requireField(component, "url");
        case "media-gallery":
            if (!Array.isArray(component.items) || component.items.length === 0 || component.items.length > 10) {
                return {
                    valid: false,
                    reason: "media-gallery needs 1-10 items",
                };
            }

            if (component.items.some((item) => !item.url)) {
                return {
                    valid: false,
                    reason: "each media-gallery item needs a url",
                };
            }

            return {
                valid: true,
            };
        default:
            return {
                valid: false,
                reason: `unsupported component type "${component.type}"`,
            };
    }
}

function requireField(config, field) {
    if (config[field] === undefined || config[field] === null || config[field] === "") {
        return {
            valid: false,
            reason: `${config.type} needs ${field}`,
        };
    }

    return {
        valid: true,
    };
}

function validateBuiltMessage(components) {
    const json = components.map((component) => component.toJSON());
    const count = countComponents(json);
    const textLength = countTextLength(json);

    if (!components.length) {
        return {
            valid: false,
            reason: "Display Component messages need at least one rendered component.",
        };
    }

    if (count > 40) {
        return {
            valid: false,
            reason: "Display Component messages cannot contain more than 40 total components.",
        };
    }

    if (textLength > 4000) {
        return {
            valid: false,
            reason: "Display Component messages cannot contain more than 4000 text characters.",
        };
    }

    return {
        valid: true,
    };
}

function countComponents(components) {
    return components.reduce((total, component) => {
        if (Array.isArray(component.components)) return total + 1 + countComponents(component.components);
        if (Array.isArray(component.items)) return total + 1 + component.items.length;
        if (component.accessory) return total + 2;

        return total + 1;
    }, 0);
}

function countTextLength(components) {
    return components.reduce((total, component) => {
        const own = typeof component.content === "string" ? component.content.length : 0;
        const children = Array.isArray(component.components) ? countTextLength(component.components) : 0;

        return total + own + children;
    }, 0);
}

module.exports = {
    buildMessagePayload,
    loadMessageTemplates,
    validateMessageConfig,
};
