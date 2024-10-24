async function loadCommands(client) {
    const { loadFiles } = require("../Functions/fileLoader");
    const CustomLogger = require('../Utils/CustomLogger');
    const path = require('path');
    const send = new CustomLogger();

    await client.application.commands.cache.clear();
    await client.commands.clear();

    let commandsArray = [];

    const Files = await loadFiles("Commands");

    Files.forEach((file) => {
        const command = require(file);
        const fileName = path.basename(file);
        client.commands.set(command.data.name, command);

        commandsArray.push(command.data.toJSON());

        try {
            send.log(`&b[${command.data.name}] &a${fileName} ✅`);
        } catch (error) {
            send.log(`&c[Error] &7${fileName}: &4${error.message.padEnd(16)} ❌`);
        }
    });

    client.application.commands.set(commandsArray);

    return send.log(`&b[INFO] &fCommands loading &acompleted&f. ✅`);
}

module.exports = { loadCommands };