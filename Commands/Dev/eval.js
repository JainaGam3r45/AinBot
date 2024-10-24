const { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
    developer: true,
    data: new SlashCommandBuilder()
    .setName('eval')
    .setDescription("⛔ ¡Evalúa un código en JavaScript!")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option => option
        .setName("code")
        .setDescription("Escribe el código a evaluar")
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(4096)
    ),
    /**
     * @param {ChatInputCommandInteraction} interaction
     */
    async execute(interaction) {

        const { options, user } = interaction;
        const code = options.getString("code");

        await interaction.deferReply({ ephemeral: true });

        // Prevenir acceso a comandos peligrosos
        const dangerousGlobals = ['global', 'process', 'require', 'child_process', 'fs', 'eval'];
        if (new RegExp(dangerousGlobals.join('|')).test(code)) {
            return interaction.editReply({ content: "⚠️ El código incluye funciones o propiedades restringidas.", ephemeral: true });
        }

        const evalWithTimeout = (code, timeout = 3000) => {
            return new Promise((resolve, reject) => {
                const evalPromise = eval(`(async () => { return ${code} })()`);
                const timeoutId = setTimeout(() => reject(new Error("⏱️ Tiempo de ejecución excedido")), timeout);
        
                Promise.resolve(evalPromise)
                    .then(result => {
                        clearTimeout(timeoutId);
                        resolve(result);
                    })
                    .catch(err => {
                        clearTimeout(timeoutId);
                        reject(err);
                    });
            });
        };

        try {
            const startTime = process.hrtime();
            let evaluado = await evalWithTimeout(code);
            if (typeof evaluado !== "string") evaluado = require("util").inspect(evaluado, { depth: 2 });

            let type = typeof evaluado;
            if (type === 'object' && evaluado !== null) {
                type = Array.isArray(evaluado) ? 'array' : 'object';
            } else if (type === 'function') {
                type = 'function';
            }

            const endTime = process.hrtime(startTime);
            const executionTime = (endTime[0] * 1000 + endTime[1] / 1e6).toFixed(3);
            const resultSize = Buffer.byteLength(evaluado, 'utf-8');
            const resultSizeKb = (resultSize / 1024).toFixed(2);
            const sizeDisplay = resultSize > 1024 ? `${resultSizeKb} KB` : `${resultSize} bytes`;

            return await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('Blurple')
                        .setTitle('Evaluación de JavaScript')
                        .addFields([
                            { name: "Código", value: `\`\`\`js\n${truncate(code, 1000)}\n\`\`\``, inline: true },
                            { name: "Tipo", value: `\`\`\`js\n${type.charAt(0).toUpperCase() + type.slice(1)}\n\`\`\``, inline: true },
                            { name: "Resultado", value: `\`\`\`js\n${truncate(evaluado, 1000)}\n\`\`\`` },
                            { name: "Tamaño del Resultado", value: `${sizeDisplay}`, inline: true }
                        ])
                        .setFooter({ text: `Tiempo de ejecución: ${executionTime}ms | Ejecutado por ${user.tag}` })
                        .setTimestamp()
                ]
            });
        } catch (err) {
            const isSyntaxError = err instanceof SyntaxError;
            const errorType = isSyntaxError ? "Error de Sintaxis" : err.constructor.name;

            return await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("Red")
                        .setTitle(`Evaluación de JavaScript - ${isSyntaxError ? "Error de Sintaxis" : "Error"}`)
                        .addFields([
                            { name: "Código", value: `\`\`\`js\n${truncate(code, 1000)}\n\`\`\``, inline: true },
                            { name: "Tipo de Error", value: `\`\`\`js\n${errorType}\n\`\`\``, inline: true },
                            { name: "Descripción", value: `\`\`\`js\n${truncate(err.toString(), 1000)}\n\`\`\`` }
                        ])
                ]
            });
        }

    },
};

// Achicar textos largos
function truncate(text, maxLength) {
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
}