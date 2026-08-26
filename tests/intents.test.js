const { describe, expect, test } = require("bun:test");
const { GatewayIntentBits } = require("discord.js");
const {
    PRIVILEGED_INTENTS,
    buildGatewayIntents,
    formatDisallowedIntentsHelp,
    isDisallowedIntentsError,
    listMissingPrivilegedIntents,
    resolvePrivilegedIntents,
} = require("../src/core/runtime/intents");

describe("privileged intents", () => {
    test("defaults to all three privileged intents when env is unset", () => {
        expect(resolvePrivilegedIntents({})).toEqual([
            "GuildMembers",
            "GuildPresences",
            "MessageContent",
        ]);
    });

    test("parses csv and none from AINBOT_PRIVILEGED_INTENTS", () => {
        expect(resolvePrivilegedIntents({
            AINBOT_PRIVILEGED_INTENTS: "GuildMembers, MessageContent",
        })).toEqual(["GuildMembers", "MessageContent"]);

        expect(resolvePrivilegedIntents({
            AINBOT_PRIVILEGED_INTENTS: "none",
        })).toEqual([]);

        expect(resolvePrivilegedIntents({
            AINBOT_PRIVILEGED_INTENTS: "",
        })).toEqual([]);
    });

    test("buildGatewayIntents includes only requested privileged bits", () => {
        const withAll = buildGatewayIntents({});
        expect(withAll).toContain(GatewayIntentBits.GuildMembers);
        expect(withAll).toContain(GatewayIntentBits.GuildPresences);
        expect(withAll).toContain(GatewayIntentBits.MessageContent);
        expect(withAll).toContain(GatewayIntentBits.Guilds);

        const stripped = buildGatewayIntents({
            AINBOT_PRIVILEGED_INTENTS: "none",
        });
        expect(stripped).not.toContain(GatewayIntentBits.GuildMembers);
        expect(stripped).not.toContain(GatewayIntentBits.GuildPresences);
        expect(stripped).not.toContain(GatewayIntentBits.MessageContent);
        expect(stripped).toContain(GatewayIntentBits.Guilds);
    });

    test("listMissingPrivilegedIntents reports systems impact map keys", () => {
        const missing = listMissingPrivilegedIntents([
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers,
        ]);

        expect(missing).toEqual(["GuildPresences", "MessageContent"]);
        expect(PRIVILEGED_INTENTS.MessageContent.systems.length).toBeGreaterThan(0);
        expect(PRIVILEGED_INTENTS.GuildMembers.yamlTriggers).toContain("guildMemberAdd");
        expect(PRIVILEGED_INTENTS.GuildMembers.yamlTriggers).toContain("displayNameUpdate");
    });

    test("detects 4014 and formats actionable help", () => {
        expect(isDisallowedIntentsError({ code: 4014, message: "nope" })).toBe(true);
        expect(isDisallowedIntentsError(new Error("Disallowed intents detected"))).toBe(true);
        expect(isDisallowedIntentsError(new Error("invalid token"))).toBe(false);

        const help = formatDisallowedIntentsHelp({ message: "Disallowed intents" }, ["MessageContent"]);
        expect(help).toContain("4014");
        expect(help).toContain("Message Content Intent");
        expect(help).toContain("AINBOT_PRIVILEGED_INTENTS");
        expect(help).not.toContain("—");
    });
});
