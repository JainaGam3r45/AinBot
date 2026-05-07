# Motor de comandos y eventos YAML

Este bot carga comandos, eventos y mensajes reutilizables con Display Components desde archivos YAML. JavaScript queda reservado para el núcleo de ejecución dentro de `Utils` y `Events/core.js`; el comportamiento del servidor debería agregarse mediante YAML.

## Carpetas

- `configs/commands`: comandos slash.
- `configs/events`: scripts de eventos.
- `configs/messages`: plantillas reutilizables de mensajes con Display Components.
- `Utils/yamlengine`: runtime que interpreta YAML, renderiza Display Components, evalúa condiciones y ejecuta acciones.
- `Events/core.js`: puente ligero con Discord que carga comandos YAML y enruta interacciones.

Los archivos terminados en `.yml` o `.yaml` se cargan de forma recursiva. Para desactivar un archivo o carpeta sin eliminarlo, agrega `_` al inicio de su nombre.

## Comandos

Crea un archivo dentro de `configs/commands`.

```yml
name: hello
description: "Envía una respuesta desde YAML."
contexts:
  - guild
permissions:
  - ManageMessages
developer: false
options:
  - name: target
    description: "Elige un usuario."
    type: user
    required: false
actions:
  - id: reply
    args:
      ephemeral: true
      components:
        - type: text-display
          content: "Hola %user_mention%. Objetivo: %option_target_mention%"
```

Los tipos de opciones soportados son `string`, `integer`, `number`, `boolean`, `user`, `channel`, `role` y `mentionable`. Las opciones de texto y número pueden usar `choices`, `min-length`, `max-length`, `min-value` y `max-value` cuando Discord lo permite.

Los placeholders de opciones incluyen `%option_name%`, `%option_name_id%`, `%option_name_mention%`, `%option_name_is_provided%`, `%option_name_choice_name%`, `%option_name_username%` y `%option_name_display_name%`.

## Eventos

Crea un archivo dentro de `configs/events`.

```yml
name: welcome-message
trigger: guildMemberAdd
actions:
  - id: sendMessage
    args:
      channel: "welcome"
      components:
        - type: text-display
          content: "Bienvenido %user_mention% a %guild_name%."
```

Triggers soportados:

- `buttonClick`: cuando se presiona un botón con custom id iniciado en `script_`.
- `channelCreate`: cuando se crea un canal.
- `channelDelete`: cuando se elimina un canal.
- `displayNameUpdate`: cuando cambia el nombre visible de un miembro.
- `everyMinute`: ejecuta el script una vez por minuto para cada servidor cargado.
- `everyHour`: ejecuta el script una vez por hora para cada servidor cargado.
- `everyDay`: ejecuta el script una vez por día para cada servidor cargado.
- `guildBoostAdd`: cuando un miembro empieza a boostear el servidor.
- `guildBoostRemove`: cuando un miembro deja de boostear el servidor.
- `guildMemberAdd`: cuando un miembro entra al servidor.
- `guildMemberRemove`: cuando un miembro sale del servidor.
- `messageCreate`: cuando se crea un mensaje.
- `messageDelete`: cuando se elimina un mensaje.
- `messageReactionAdd`: cuando se agrega una reacción a un mensaje.
- `messageReactionRemove`: cuando se quita una reacción de un mensaje.
- `messageUpdate`: cuando se edita un mensaje.
- `modalSubmit`: cuando se envía un modal con custom id iniciado en `script_`.
- `presenceUpdate`: cuando cambia la presencia de un usuario.
- `selectMenuSubmit`: cuando se envía un select menu con custom id iniciado en `script_`.

`inviteCountUpdate` y los triggers de tickets no están incluidos todavía porque necesitan sistemas propios encima de los eventos base de Discord.

En botones, selects y modales, usa custom ids con este formato:

```text
script_<identificador>:<arg0>:<arg1>
```

Ejemplo:

```text
script_profileOpen:%user_id%:summary
```

Si un argumento contiene `:`, envuélvelo en comillas simples o dobles.

Variables de interacción disponibles:

- Botones: `%button_custom_id%`, `%button_args_count%`, `%button_args%`, `%button_arg_0%`.
- Select menus: `%select_menu_custom_id%`, `%select_menu_values_count%`, `%select_menu_values%`, `%select_menu_value_0%`, `%select_menu_args_count%`, `%select_menu_args%`, `%select_menu_arg_0%`.
- Modales: `%modal_custom_id%`, `%modal_args_count%`, `%modal_args%`, `%modal_arg_0%` y `%modal_<custom-id>%` para cada campo de texto.

Variables extra por trigger:

- `displayNameUpdate`: `%old_display_name%`, `%new_display_name%`.
- `messageReactionAdd` / `messageReactionRemove`: `%reaction_emoji%`.
- `messageUpdate`: `%message_old_content%`.
- `presenceUpdate`: `%old_status%`, `%new_status%`.

## Targets

Cada acción puede definir `target` para cambiar el contexto donde se ejecuta. Los targets soportados son `member`, `channel`, `message`, `role`, `user` y `guild`.

```yml
actions:
  - id: addRole
    args:
      value: "%option_role_id%"
    target:
      member: "%option_user_id%"
  - id: sendMessage
    args:
      content: "Rol actualizado."
    target:
      channel: "logs"
```

El target se resuelve antes de evaluar las condiciones de la acción, así que las condiciones y placeholders de esa acción usan el nuevo contexto.

## Metas

Puedes declarar metadatos en `configs/metas`. Los archivos `.yml` o `.yaml` se cargan de forma recursiva y pueden contener una meta directa o una lista bajo `metas`.

```yml
metas:
  - key: counting
    type: number
    mode: channel
    default: 0
  - key: experience
    type: number
    mode: user
    default: 0
    leaderboard:
      enabled: true
      name: experience
      description: "Tabla de experiencia"
      format: "**%value%** xp"
```

Tipos soportados: `number`, `string`, `boolean` y `list`.

Modos soportados:

- `global`: un valor compartido para todo el bot.
- `guild`: un valor por servidor.
- `user`: un valor por usuario dentro del servidor.
- `channel`: un valor por canal dentro del servidor.
- `message`: un valor por mensaje dentro del servidor.

Si una meta no está declarada, el motor conserva el comportamiento antiguo: alcance por servidor y usuario, sin coerción de tipo. Los leaderboards se validan en metas `number` con modo `user`, pero el comando `/leaderboard` todavía no está implementado.

## Ejemplo de logs de eventos

El proyecto incluye un ejemplo activo de logs de eventos en `configs/events/eventlogs`. No usa variables de entorno: el canal de logs se guarda en la meta de servidor `event_log_channel`, declarada en `configs/metas/eventlogs.yml`.

Para activar los logs en un servidor, usa el comando de desarrollador:

```text
/eventlogs channel:#logs
```

El comando guarda el canal elegido en `event_log_channel`. Mientras esa meta esté vacía, los eventos no envían mensajes.

Los ejemplos incluidos registran:

- mensajes eliminados;
- mensajes editados;
- canales creados;
- canales eliminados;
- miembros que entran;
- miembros que salen.

Cada evento usa `target.channel: "%meta_event_log_channel%"`, una condición `textLengthAbove` para evitar envíos sin configurar y mensajes con Display Components V2.

## Mensajes

Crea plantillas reutilizables de mensajes dentro de `configs/messages`.

```yml
id: default-welcome
disable-mentions: true
components:
  - type: container
    color: "#2f80ed"
    components:
      - type: text-display
        content: "# Hola, %user_display_name%"
      - type: separator
        spacing: 1
```

Usa una plantilla desde una acción con `message: default-welcome`. También se soportan `components` definidos en línea.

Los componentes soportados son `text-display`, `container`, `section`, `separator`, `action-row`, `button`, `select-menu`, `thumbnail`, `media-gallery` y `file`. Los mensajes YAML se envían con la flag `IsComponentsV2` de Discord, así que no deben incluir embeds ni contenido normal de mensaje. Si defines `content`, el motor lo convierte en un componente `text-display`.

## Acciones

Acciones soportadas:

- `addCoins`, `removeCoins` y `setCoins`: actualizan el valor meta `coins` del usuario actual.
- `reply`: responde a la interacción o mensaje actual.
- `sendMessage`: envía un mensaje a `args.channel` o al canal actual.
- `sendPrivateMessage`: envía un mensaje privado al usuario actual cuando Discord lo permite.
- `editReply`: edita la respuesta actual de la interacción.
- `editMessage`: edita el mensaje actual cuando el bot puede editarlo.
- `sendTyping`: envía el indicador de escritura en el canal actual.
- `addReaction`: reacciona al mensaje actual.
- `removeReaction`: quita una reacción del bot o todas las reacciones si no pasas `value`.
- `deleteMessage`: elimina el mensaje actual cuando sea posible.
- `pinMessage` y `unpinMessage`: fijan o desfijan el mensaje actual.
- `crosspostMessage`: publica un mensaje de canal de anuncios.
- `addRole` y `removeRole`: actualizan el miembro actual o configurado.
- `timeout` y `timeoutMember`: aplican timeout al miembro actual o configurado. `duration` se expresa en segundos.
- `createChannel`, `editChannel` y `deleteChannel`: administran canales del servidor actual.
- `createThread`, `startThread`, `editThread`, `deleteThread`, `openThread`, `closeThread`, `lockThread` y `unlockThread`: administran hilos.
- `addTag`, `removeTag` y `setTag`: administran tags aplicados en posts/hilos de foro.
- `showModal`: muestra un modal desde una interacción.
- `sendRequest`: hace una petición HTTP y guarda la respuesta en placeholders `%data_*%` para `follow-up-actions`.
- `randomAction`: ejecuta una acción aleatoria desde `args.actions`.
- `setCooldown` y `resetCooldown`: guardan o limpian cooldowns por usuario.
- `evalJavaScript`: evalúa una expresión JavaScript para comandos de desarrollador confiables y renderiza el resultado con Display Components.
- `setMeta`, `addMeta`, `deleteMeta`, `metaSet`, `metaAdd`, `metaSubtract`, `metaToggle`, `metaRemove`, `metaListAdd` y `metaListRemove`: guardan metadatos con alcance por guild y usuario.
- `log`: escribe un mensaje mediante el logger central.

Las acciones `addInviteBonus`, `removeInviteBonus`, `setInviteBonus` y `sendPreset` no están incluidas porque dependen de addons externos que este proyecto no tiene.

Los valores meta usan la base de datos configurada. Si `DATABASE_PROVIDER=none`, se guardan en memoria y se pierden al reiniciar el proceso.

## Condiciones

Condiciones soportadas:

- `anyOf`
- `allOf`
- `atLeastOf`
- `coinsAbove`
- `coinsBelow`
- `isBot`
- `isUser`
- `isBooster`
- `isExpressionTrue`
- `isOnCooldown`
- `isReply`
- `hasPermission`
- `hasRole`
- `hasTag`
- `inChannel`
- `matchesRegex`
- `memberCountAbove`
- `memberCountBelow`
- `metaAbove`
- `metaBelow`
- `metaEquals`
- `metaIncludes`
- `noneOf`
- `textContains`
- `textEndsWith`
- `textEquals`
- `textLengthAbove`
- `textLengthBelow`
- `textStartsWith`

Para invertir una condición, antepone `!` al id o define `inverse: true`.

```yml
conditions:
  - id: "!isBot"
  - id: hasPermission
    args:
      value: ManageMessages
```

Las condiciones `inTicket` y las condiciones de sistemas externos no están incluidas hasta que exista ese sistema en AinBot. Las condiciones de monedas usan el valor meta `coins`.

Las condiciones en acciones pueden incluir `not-met-actions` para ejecutar una alternativa cuando esa condición falla.

## Placeholders

Los placeholders comunes incluyen `%bot_username%`, `%guild_name%`, `%channel_mention%`, `%user_mention%`, `%user_display_name%`, `%message_content%`, `%interaction_latency%`, `%api_latency%`, `%date%`, `%hour%`, `%minute%` y `%meta_key%`.

Los placeholders están disponibles en strings dentro de comandos, eventos, acciones y componentes de mensaje. Para elegir texto aleatorio, usa `random: ["Primer valor", "Segundo valor"]` donde normalmente iría un string.

Los archivos predeterminados `ping.yml` y `eval.yml` muestran cómo expresar comandos JavaScript antiguos como comandos YAML. `ping.yml` usa placeholders y Display Components normales. `eval.yml` mantiene el trabajo peligroso dentro de la acción integrada `evalJavaScript`, mientras que el nombre del comando, la opción, los permisos y los layouts de éxito/error viven en YAML.
