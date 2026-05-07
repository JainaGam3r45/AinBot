# YAML command and event engine

This bot can load commands, events, and reusable Display Component messages from YAML files. JavaScript commands and events still work; YAML configs are loaded beside them.

## Folders

- `configs/commands`: slash commands.
- `configs/events`: event scripts.
- `configs/messages`: reusable Display Component message templates.

Files ending in `.yml` or `.yaml` are loaded recursively. Prefix a file or folder with `_` to disable it without deleting it.

## Commands

Create a file in `configs/commands`.

```yml
name: hello
description: "Send a YAML response."
contexts:
  - guild
permissions:
  - ManageMessages
developer: false
options:
  - name: target
    description: "Choose a user."
    type: user
    required: false
actions:
  - id: reply
    args:
      ephemeral: true
      components:
        - type: text-display
          content: "Hello %user_mention%. Target: %option_target_mention%"
```

Supported option types are `string`, `integer`, `number`, `boolean`, `user`, `channel`, `role`, and `mentionable`. String and number options can use `choices`, `min-length`, `max-length`, `min-value`, and `max-value` when Discord supports them.

Command option placeholders include `%option_name%`, `%option_name_id%`, `%option_name_mention%`, `%option_name_is_provided%`, `%option_name_username%`, and `%option_name_display_name%`.

## Events

Create a file in `configs/events`.

```yml
name: welcome-message
trigger: guildMemberAdd
actions:
  - id: sendMessage
    args:
      channel: "welcome"
      components:
        - type: text-display
          content: "Welcome %user_mention% to %guild_name%."
```

Supported triggers are `messageCreate`, `guildMemberAdd`, `guildMemberRemove`, `buttonClick`, and `selectMenuSubmit`.

For button and select triggers, the custom id is split by `_`. A button with `script_ticket_open` gives `%button_custom_id%`, `%button_args_count%`, `%button_args%`, `%button_arg_0%`, and `%button_arg_1%`.

## Messages

Create reusable message templates in `configs/messages`.

```yml
id: default-welcome
disable-mentions: true
components:
  - type: container
    color: "#2f80ed"
    components:
      - type: text-display
        content: "# Hello, %user_display_name%"
      - type: separator
        spacing: 1
```

Use a template from an action with `message: default-welcome`. Inline `components` are also supported.

Supported components are `text-display`, `container`, `section`, `separator`, `action-row`, `button`, `select-menu`, `thumbnail`, `media-gallery`, and `file`. YAML messages are sent with Discord's `IsComponentsV2` flag, so they must not include embeds or normal message content. If you provide `content`, the engine converts it into a `text-display` component.

## Actions

Supported actions:

- `reply`: replies to the current interaction or message.
- `sendMessage`: sends to `args.channel` or the current channel.
- `editReply`: edits the current interaction reply.
- `addReaction`: reacts to the current message.
- `deleteMessage`: deletes the current message when possible.
- `addRole` and `removeRole`: update the current or configured member.
- `timeout`: times out the current or configured member. `duration` is in seconds.
- `setMeta`, `addMeta`, and `deleteMeta`: store scoped metadata for the current guild and user.
- `log`: writes a message through the central logger.

Meta values use the configured database. If `DATABASE_PROVIDER=none`, they are stored in memory and lost when the process restarts.

## Conditions

Supported conditions:

- `isBot`
- `isUser`
- `hasPermission`
- `hasRole`
- `inChannel`
- `matchesRegex`
- `anyOf`
- `allOf`
- `noneOf`

Prefix an id with `!` or set `inverse: true` to invert it.

```yml
conditions:
  - id: "!isBot"
  - id: hasPermission
    args:
      value: ManageMessages
```

## Placeholders

Common placeholders include `%bot_username%`, `%guild_name%`, `%channel_mention%`, `%user_mention%`, `%user_display_name%`, `%message_content%`, `%date%`, `%hour%`, `%minute%`, and `%meta_key%`.

Placeholders are available in strings across commands, events, actions, and message components. To choose random text, use `random: ["First value", "Second value"]` where a normal string value would go.
