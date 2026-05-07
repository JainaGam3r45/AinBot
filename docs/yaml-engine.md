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

Los placeholders de opciones incluyen `%option_name%`, `%option_name_id%`, `%option_name_mention%`, `%option_name_is_provided%`, `%option_name_username%` y `%option_name_display_name%`.

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

Los triggers soportados son `messageCreate`, `guildMemberAdd`, `guildMemberRemove`, `buttonClick` y `selectMenuSubmit`.

En botones y selects, el custom id se separa por `_`. Un botón con `script_ticket_open` genera `%button_custom_id%`, `%button_args_count%`, `%button_args%`, `%button_arg_0%` y `%button_arg_1%`.

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

- `reply`: responde a la interacción o mensaje actual.
- `sendMessage`: envía un mensaje a `args.channel` o al canal actual.
- `editReply`: edita la respuesta actual de la interacción.
- `sendTyping`: envía el indicador de escritura en el canal actual.
- `addReaction`: reacciona al mensaje actual.
- `deleteMessage`: elimina el mensaje actual cuando sea posible.
- `addRole` y `removeRole`: actualizan el miembro actual o configurado.
- `timeout`: aplica timeout al miembro actual o configurado. `duration` se expresa en segundos.
- `evalJavaScript`: evalúa una expresión JavaScript para comandos de desarrollador confiables y renderiza el resultado con Display Components.
- `setMeta`, `addMeta` y `deleteMeta`: guardan metadatos con alcance por guild y usuario.
- `log`: escribe un mensaje mediante el logger central.

Los valores meta usan la base de datos configurada. Si `DATABASE_PROVIDER=none`, se guardan en memoria y se pierden al reiniciar el proceso.

## Condiciones

Condiciones soportadas:

- `isBot`
- `isUser`
- `hasPermission`
- `hasRole`
- `inChannel`
- `matchesRegex`
- `anyOf`
- `allOf`
- `noneOf`

Para invertir una condición, antepone `!` al id o define `inverse: true`.

```yml
conditions:
  - id: "!isBot"
  - id: hasPermission
    args:
      value: ManageMessages
```

## Placeholders

Los placeholders comunes incluyen `%bot_username%`, `%guild_name%`, `%channel_mention%`, `%user_mention%`, `%user_display_name%`, `%message_content%`, `%interaction_latency%`, `%api_latency%`, `%date%`, `%hour%`, `%minute%` y `%meta_key%`.

Los placeholders están disponibles en strings dentro de comandos, eventos, acciones y componentes de mensaje. Para elegir texto aleatorio, usa `random: ["Primer valor", "Segundo valor"]` donde normalmente iría un string.

Los archivos predeterminados `ping.yml` y `eval.yml` muestran cómo expresar comandos JavaScript antiguos como comandos YAML. `ping.yml` usa placeholders y Display Components normales. `eval.yml` mantiene el trabajo peligroso dentro de la acción integrada `evalJavaScript`, mientras que el nombre del comando, la opción, los permisos y los layouts de éxito/error viven en YAML.
