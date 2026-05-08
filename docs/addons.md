# Addons

AinBot can load private JavaScript addons from `build/addons`. This keeps paid modules out of the public repository while leaving the public bot able to install, list, enable, and disable them.

## Install an addon

Copy the addon folder into `build/addons`:

```text
build/
  addons/
    music/
      index.js
      package.json
      README.md
```

Restart the bot and run:

```text
/addons list
```

Only developer IDs from `DEVELOPERS_IDS` can use `/addons`.

## Enable or disable an addon

```text
/addons enable name:music
/addons disable name:music
```

The enabled state is saved in `configs/addons.json`. That file is ignored by Git because it is runtime state and may contain private installation choices.

## Addon entry file

Every addon needs an `index.js` file. The addon can export commands, events, and an optional `load` function.

```js
const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    name: "music",
    version: "1.0.0",
    description: "Adds paid music playback commands.",
    author: "AinBot",
    commands: [
        {
            data: new SlashCommandBuilder()
                .setName("play")
                .setDescription("Play a song.")
                .addStringOption((option) => option
                    .setName("query")
                    .setDescription("Song name or URL.")
                    .setRequired(true)),
            async execute(interaction, client) {
                await interaction.reply("Music addon is installed.");
            },
        },
    ],
    events: [],
    async load({ logger, database }) {
        logger.info("Music addon loaded.");

        return {
            commands: [],
            events: [],
        };
    },
};
```

## Addon API

The `load` function receives:

- `client`: Discord client.
- `logger`: centralized AinBot logger.
- `addonName`: normalized addon name.
- `root`: bot root folder.
- `directory`: installed addon folder.
- `database`: addon-scoped database namespace, such as `addons.music`.

Commands must use the same shape as internal commands:

```js
{
    data: new SlashCommandBuilder(),
    developer: false,
    async execute(interaction, client) {}
}
```

Events must use the same shape as internal events:

```js
{
    name: Events.GuildMemberAdd,
    once: false,
    async execute(member, client) {}
}
```

## Paid addons

Do not commit paid addon code to this repository. Ship the paid addon as a separate archive or private repository, then ask users to place it in `build/addons/music`.

For a commercial music addon, keep the public repo limited to:

- this addon loader;
- addon installation docs;
- optional `.env.example` variables for public configuration names;
- no music source code, player internals, license logic, or provider credentials.
