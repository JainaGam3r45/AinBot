# Intents privilegiados de Discord

Algunos Gateway Intents piden datos sensibles (miembros, presencia, texto de mensajes). Discord los llama **privileged intents**. Hay que activarlos en el [Developer Portal](https://discord.com/developers/applications) (Bot -> Privileged Gateway Intents) **y** pedirlos en el Identify del bot.

Si el código pide un intent que el Portal no tiene activado, Discord cierra la conexión con el código **4014** (Disallowed Intents). El código **4013** es otro caso: Invalid Intents.

Con menos de 10.000 usuarios puedes togglearlos a mano. Por encima, Discord pide review.

## Qué hace AinBot

Por defecto el bot pide los tres privilegiados. Si Discord responde 4014, el arranque falla con un mensaje que indica qué falta, el enlace al Portal y qué sistemas se quedan sin datos.

Puedes omitir intents a propósito con `.env` y seguir arrancando (slash commands y el núcleo siguen). Los sistemas que dependan del intent ausente se degradan y el logger avisa.

```env
# Todos (default si omites la variable)
AINBOT_PRIVILEGED_INTENTS=GuildMembers,GuildPresences,MessageContent

# Solo algunos
AINBOT_PRIVILEGED_INTENTS=GuildMembers,MessageContent

# Ninguno
AINBOT_PRIVILEGED_INTENTS=none
```

Los valores del Portal tienen que coincidir con lo que pides aquí. Si pides `MessageContent` en `.env` pero el toggle del Portal está apagado, vuelves a caer en 4014.

## Mapa intent -> sistemas

| Intent | Toggle en el Portal | Si falta |
| ------ | ------------------- | -------- |
| `GuildMembers` | Server Members Intent | No llegan join/leave/member update (salvo el propio bot). Se rompen EventLogs de welcome/leave, YAML `guildMemberAdd` / `guildMemberRemove` / `displayNameUpdate` / `guildBoostAdd` / `guildBoostRemove`, y `members.fetch` en acciones. |
| `GuildPresences` | Presence Intent | No llega `presenceUpdate`. Solo afecta YAML `presenceUpdate` (`old_status` / `new_status`). Poner el status del bot (`setPresence`) **no** necesita este intent. |
| `MessageContent` | Message Content Intent | Los eventos de mensaje sí llegan, pero `content`, embeds, attachments, components y polls llegan vacíos (salvo mensajes del bot, DMs, menciones y context menu). Se degradan EventLogs de delete/edit, `matchesRegex`, el placeholder `message_content` y scripts `messageCreate` basados en texto. |

Los slash commands y el resto de interacciones **no** dependen de intents privilegiados.

## Buenas prácticas

- Pide solo lo que uses. Este repo es un ejemplo completo, así que por defecto pide los tres.
- Si no vas a leer contenido de mensajes, quita `MessageContent` del `.env` y del Portal.
- Si no necesitas presencia de usuarios, quita `GuildPresences`. El bot puede seguir mostrando "Playing Ainbot" sin ese intent.
- Arranca con `bun` (`bun start` / `bun run dev`). Bun carga el `.env` automáticamente. Si lanzas el proceso con `node`, ese archivo no se carga igual.

Más detalle oficial: [Gateway Intents](https://docs.discord.com/developers/events/gateway#gateway-intents) y [Privileged Intents](https://support-dev.discord.com/hc/en-us/articles/6207308062871-What-are-Privileged-Intents).
