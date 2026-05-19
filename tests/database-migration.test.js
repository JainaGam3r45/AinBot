const { mkdtemp, rm } = require("fs/promises");
const os = require("os");
const path = require("path");
const { afterEach, describe, expect, test } = require("bun:test");
const { createDatabaseFromConfig } = require("../src/database");
const { DatabaseMigrationConflictError, migrateDatabaseRecords } = require("../src/database/migration");

const temporaryDirectories = [];

afterEach(async () => {
    const directories = temporaryDirectories.splice(0);

    await Promise.all(directories.map(removeTemporaryDirectory));
});

describe("database migration", () => {
    test("copies records from one SQLite database to another", async () => {
        await usingDatabases(async ({ source, target }) => {
            await source.namespace("guilds").set("123", {
                language: "es",
                premium: false,
            });
            await source.namespace("guilds").set("456", ["a", "b"]);
            await source.namespace("yaml-meta").set("global:visits", 42);
            await source.namespace("yaml-meta").set("global:empty", null);

            const stats = await migrateDatabaseRecords({
                source,
                target,
            });

            expect(stats).toMatchObject({
                read: 4,
                copied: 4,
                overwritten: 0,
                conflicts: 0,
                dryRun: false,
            });
            expect(await target.namespace("guilds").get("123")).toEqual({
                language: "es",
                premium: false,
            });
            expect(await target.namespace("guilds").get("456")).toEqual(["a", "b"]);
            expect(await target.namespace("yaml-meta").get("global:visits")).toBe(42);
            expect(await target.has("yaml-meta", "global:empty")).toBe(true);
            expect(await target.namespace("yaml-meta").get("global:empty")).toBe(null);
        });
    });

    test("aborts before writing when the target has conflicts", async () => {
        await usingDatabases(async ({ source, target }) => {
            await source.namespace("guilds").set("123", {
                language: "es",
            });
            await source.namespace("guilds").set("456", {
                language: "en",
            });
            await target.namespace("guilds").set("123", {
                language: "fr",
            });

            await expect(migrateDatabaseRecords({
                source,
                target,
                onConflict: "abort",
            })).rejects.toBeInstanceOf(DatabaseMigrationConflictError);

            expect(await target.namespace("guilds").get("123")).toEqual({
                language: "fr",
            });
            expect(await target.has("guilds", "456")).toBe(false);
        });
    });

    test("overwrites conflicting records when requested", async () => {
        await usingDatabases(async ({ source, target }) => {
            await source.namespace("guilds").set("123", {
                language: "es",
            });
            await source.namespace("guilds").set("456", {
                language: "en",
            });
            await target.namespace("guilds").set("123", {
                language: "fr",
            });

            const stats = await migrateDatabaseRecords({
                source,
                target,
                onConflict: "overwrite",
            });

            expect(stats).toMatchObject({
                read: 2,
                copied: 1,
                overwritten: 1,
                conflicts: 1,
            });
            expect(await target.namespace("guilds").get("123")).toEqual({
                language: "es",
            });
            expect(await target.namespace("guilds").get("456")).toEqual({
                language: "en",
            });
        });
    });

    test("dry run reports work without writing records", async () => {
        await usingDatabases(async ({ source, target }) => {
            await source.namespace("guilds").set("123", {
                language: "es",
            });

            const stats = await migrateDatabaseRecords({
                source,
                target,
                dryRun: true,
            });

            expect(stats).toMatchObject({
                read: 1,
                copied: 1,
                overwritten: 0,
                conflicts: 0,
                dryRun: true,
            });
            expect(await target.has("guilds", "123")).toBe(false);
        });
    });
});

async function usingDatabases(callback) {
    const directory = await mkdtemp(path.join(os.tmpdir(), "ainbot-migration-"));

    temporaryDirectories.push(directory);

    const source = await createSqliteDatabase(path.join(directory, "source.sqlite"));
    const target = await createSqliteDatabase(path.join(directory, "target.sqlite"));

    try {
        await callback({
            source,
            target,
        });
    } finally {
        await source.close();
        await target.close();
    }
}

function createSqliteDatabase(sqlitePath) {
    return createDatabaseFromConfig({
        provider: "sqlite",
        sqlitePath,
        tableName: "ainbot_records",
    });
}

async function removeTemporaryDirectory(directory) {
    for (let attempt = 0; attempt < 10; attempt += 1) {
        try {
            await rm(directory, {
                force: true,
                recursive: true,
            });
            return;
        } catch (error) {
            if (error.code !== "EBUSY") throw error;
            if (attempt === 9) return;

            await wait(100);
        }
    }
}

function wait(milliseconds) {
    return new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
    });
}
