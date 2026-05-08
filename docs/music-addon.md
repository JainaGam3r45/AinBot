# Addon de música

El addon de música es un módulo privado de pago para AinBot. Está pensado para quienes quieren añadir reproducción musical completa sin modificar el core público del bot.

## Precio

El precio del addon es **USD $10**.

El código del addon no se incluye en este repositorio público. Se entrega por separado y se instala copiando su carpeta dentro de:

```text
configs/addons/music
```

## Qué incluye

- Reproducción de música usando Lavalink.
- Búsqueda por nombre o URL, según las fuentes activas en Lavalink.
- Cola de reproducción por servidor.
- Comandos para reproducir, saltar, detener, pausar, reanudar, ver cola, ver canción actual y cambiar volumen.
- Tarjetas modernas con Discord Display Components.
- Botones interactivos para pausar, reanudar y saltar canciones.
- Botones configurables desde YAML: texto, emoji, color, visibilidad y estado activo.
- Desactivación automática de botones cuando la canción termina, se salta o se detiene.
- Mensajes y diseño configurables desde `config.yml`.
- Soporte para carátulas cuando Lavalink entrega artwork.
- Enlaces directos a canciones usando formato Markdown como `[Title](URL)`.
- Integración con el sistema de addons privados de AinBot.

## Comandos

```text
/play query:<song name or url>
/skip
/stop
/pause
/resume
/queue
/nowplaying
/volume amount:<1-150>
```

Los nombres, descripciones y opciones de los comandos se pueden cambiar desde `config.yml`.

## Fácil de instalar

1. Compra o recibe el paquete privado del addon.
2. Copia la carpeta `music` dentro de `configs/addons`.
3. Configura Lavalink en `configs/addons/music/config.yml`.
4. Reinicia AinBot.
5. Ejecuta `/addons list` para confirmar que aparece instalado.
6. Entra a un canal de voz y usa `/play`.

Ejemplo de estructura:

```text
configs/
  addons/
    music/
      index.js
      config.yml
      README.md
      src/
```

## Configuración

El addon se configura con YAML. Esto permite editar textos, comandos y diseño sin tocar JavaScript.

```yml
settings:
  search-source: scsearch
  default-volume: 80

lavalink:
  host: localhost
  port: 2333
  password: youshallnotpass
  secure: false

commands:
  play:
    enabled: true
    name: play
    description: Play a song in your voice channel.

display:
  playing-now: Playing Now
  added-to-queue: Added to Queue
  track-line: "{title} by **{author}**"

design:
  accent-color: "#5865f2"
  disable-controls-on-track-end: true
```

## Diseño editable

El usuario puede personalizar las tarjetas desde `config.yml`:

- color lateral del contenedor;
- separadores entre secciones;
- títulos de tarjetas;
- formato de canción;
- formato de cola;
- textos de estado;
- etiquetas de botones;
- emojis de botones;
- estilo de botones;
- botones visibles o deshabilitados.

Ejemplo:

```yml
buttons:
  pause:
    visible: true
    enabled: true
    label: Pause
    emoji: "⏸️"
    style: primary
  skip:
    visible: true
    enabled: true
    label: Skip
    emoji: "⏭️"
    style: secondary
```

## Requisitos

- AinBot con el sistema de addons privados.
- Un servidor Lavalink activo.
- Java compatible con la versión de Lavalink que uses.
- Permisos del bot en el canal de voz: ver canal, conectar y hablar.

## Lavalink

El addon no ejecuta Lavalink por sí solo. Lavalink debe estar levantado antes de usar `/play`.

Para pruebas locales, puedes usar:

```yml
lavalink:
  host: localhost
  port: 2333
  password: youshallnotpass
  secure: false
```

Si Lavalink está en una VPS o panel externo, usa el host y puerto públicos del servidor.

## Distribución

Este addon es privado. El repositorio público solo contiene:

- el sistema que permite cargar addons;
- documentación de instalación;
- explicación del addon de música;
- instrucciones de configuración.

El código del addon de música se entrega aparte a quienes lo compren.
