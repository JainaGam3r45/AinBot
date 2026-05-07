# AinBot Remake 2024 🌟

![](https://komarev.com/ghpvc/?username=jainagam3r45&color=green)
![GitHub repo size](https://img.shields.io/github/repo-size/JainaGam3r45/AinBot)
![GitHub license](https://img.shields.io/github/license/JainaGam3r45/AinBot)

> [!NOTE]
> AinBot es un bot de Discord desarrollado originalmente en 2018 utilizando la versión 11.4.2 de discord.js. Este proyecto fue creado inicialmente como un bot personalizado para un servidor específico en Discord. En 2024, el proyecto se reanuda con la intención de servir como un ejemplo educativo y un recurso de código de ejemplo actualizado a las mejores prácticas actuales.

## Motivación
El objetivo principal de revivir este proyecto es proporcionar un recurso educativo para la comunidad de desarrollo de Discord, mostrando cómo se estructuraba un bot en versiones antiguas de discord.js y cómo se puede actualizar a la versión más reciente (discord.js v14) utilizando las mejores prácticas modernas de JavaScript y Discord bot development.

## Instalación
Para clonar y ejecutar localmente este proyecto, asegúrate de tener **[Node.js](https://nodejs.org/en)** instalado.

1. Clona el repositorio:
```bash
git clone https://github.com/JainaGam3r45/AinBot.git
cd AinBot
```

2. Instala las dependencias:
```bash
npm install
```

3. Crea un archivo `.env` en el directorio raíz del proyecto y configura tus variables de entorno:
```makefile
BOT_TOKEN="<your-token-bot>"
PREFIX="<your-prefix-bot>"
DEVELOPER_IDS= [
    "<your-developer-id>",
    // Agrega más IDs de desarrolladores aquí
]
```

4. Ejecuta el bot en modo normal/producción:
```bash
npm start
```

Para iniciar el bot en modo desarrollo y mostrar mensajes de debug:

```bash
npm run dev
```

## Base de datos

AinBot incluye una capa de base de datos configurable desde variables de entorno. El bot expone la conexión como `client.database`, con namespaces para separar datos por dominio:

```js
const guilds = client.database.namespace("guilds");

await guilds.set(interaction.guildId, {
    language: "es",
    premium: false,
});

const settings = await guilds.get(interaction.guildId);
```

El proveedor se elige con `DATABASE_PROVIDER`:

- `none`: desactiva persistencia sin romper el arranque del bot.
- `memory`: útil para pruebas locales rápidas; los datos se pierden al reiniciar.
- `sqlite`: recomendado para bots pequeños o medianos con una sola instancia.
- `postgresql`: recomendado para bots que van a escalar, usar shards o correr varias instancias.
- `mysql` / `mariadb`: buenas opciones si ya tienes esa infraestructura.
- `mongodb`: útil cuando tus datos son documentos flexibles y cambian mucho de forma.

Los drivers son opcionales para no instalar dependencias que quizá no uses. Instala solo el que necesites:

```bash
npm install better-sqlite3
npm install pg
npm install mysql2
npm install mariadb
npm install mongodb
```

Ejemplo con SQLite:

```makefile
DATABASE_PROVIDER="sqlite"
DATABASE_PATH="data/ainbot.sqlite"
```

Ejemplo con PostgreSQL:

```makefile
DATABASE_PROVIDER="postgresql"
DATABASE_URL="postgres://user:password@localhost:5432/ainbot"
DATABASE_SSL="false"
```

## Contribución

Este proyecto está abierto a contribuciones y sugerencias. Si deseas contribuir, por favor sigue estos pasos:

1. Haz un fork del proyecto.
2. Crea una nueva rama (`git checkout -b feature/new-changes`).
3. Haz commit de tus cambios (`git commit -am 'Añade esto ...'`).
4. Sube tus cambios (`git push origin feature/new-changes`).
5. Abre un **Pull Request**.

## Licencia

Distribuido bajo la licencia **MIT**. Consulta [LICENSE](LICENSE) para más información.

## Contacto

JainaGam3r45 - [JainaGam3r45@gmail.com](mailto:jainagam3r45@gmail.com)

---

Proyecto desarrollado como hobbie y con propósitos educativos en mente.
