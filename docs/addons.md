# Addons

AinBot puede cargar módulos privados de JavaScript directamente desde `configs`. Esto permite mantener módulos de pago fuera del repositorio público, sin perder la capacidad de instalarlos, listarlos, activarlos y desactivarlos desde el bot público.

## Instalar un addon

Copia la carpeta del addon dentro de `configs`:

```text
configs/
  Music/
    events/
    interactions/
    resources/
      config.yml
    index.js
    package.json
    README.md
```

Reinicia el bot y ejecuta:

```text
/addons list
```

Solo los IDs configurados en `DEVELOPERS_IDS` pueden usar `/addons`.

## Activar o desactivar un addon

```text
/addons enable name:music
/addons disable name:music
```

El estado de activación se guarda en `configs/modules.json`. Ese archivo está ignorado por Git porque es estado de ejecución y puede contener decisiones privadas de instalación. El loader también lee `configs/addons.json` si existe, para conservar instalaciones antiguas.

## Archivo de entrada del addon

Cada addon necesita un archivo `index.js`. También puede incluir `resources/config.yml` para mensajes, opciones, comandos activados y valores editables por el usuario.

```js
const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    name: "music",
    version: "1.0.0",
    description: "Adds paid music playback commands.",
    author: "JainaGam3r45",
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
    async load({ logger, database, config }) {
        logger.info("Music addon loaded.");

        return {
            commands: [],
            events: [],
        };
    },
};
```

## Configuración del addon

Si existe `resources/config.yml` o `resources/config.yaml`, AinBot lo carga y lo entrega al addon como `config`. Por compatibilidad, también acepta `config.yml` y `config.yaml` en la raíz del addon.

```yml
commands:
  play:
    enabled: true
    name: play
    description: Play a song.

messages:
  loaded: Music addon loaded.
  no_results: I could not find anything for that search.
```

El addon decide cómo usar esa configuración. La convención recomendada es usar YAML para:

- traducir mensajes;
- cambiar nombres y descripciones de comandos;
- activar o desactivar comandos del addon;
- ajustar límites, proveedores y valores por defecto.

## API del addon

La función `load` recibe:

- `client`: cliente de Discord.
- `logger`: logger centralizado de AinBot.
- `addonName`: nombre normalizado del addon.
- `root`: carpeta raíz del bot.
- `directory`: carpeta donde está instalado el addon.
- `config`: configuración YAML cargada desde la carpeta del addon.
- `database`: namespace de base de datos aislado para el addon, por ejemplo `addons.music`.

Los comandos deben usar la misma forma que los comandos internos:

```js
{
    data: new SlashCommandBuilder(),
    developer: false,
    async execute(interaction, client) {}
}
```

Los eventos deben usar la misma forma que los eventos internos:

```js
{
    name: Events.GuildMemberAdd,
    once: false,
    async execute(member, client) {}
}
```

## Addons de pago

No subas código de addons de pago a este repositorio. Distribuye el addon de pago como un archivo separado o desde un repositorio privado, y pide a los usuarios que lo coloquen en `configs/Music`.

El primer addon comercial planeado para AinBot es el [addon de música](music-addon.md), con un precio de **USD $10**.

Para un addon comercial de música, deja el repositorio público limitado a:

- este cargador de addons;
- documentación sobre cómo instalar addons;
- variables opcionales en `.env.example` para nombres de configuración pública;
- nada de código fuente del módulo de música, lógica interna del reproductor, validación de licencias o credenciales de proveedores.
