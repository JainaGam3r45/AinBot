const evalCommand = require('../../../Commands/Dev/eval');

function makeInteraction(code) {
    return {
        options: { getString: jest.fn().mockReturnValue(code) },
        user: { id: 'dev123', tag: 'Dev#0001' },
        deferReply: jest.fn().mockResolvedValue(undefined),
        editReply: jest.fn().mockResolvedValue(undefined),
    };
}

describe('eval command definition', () => {
    test('exports a data property with name "eval"', () => {
        expect(evalCommand.data.name).toBe('eval');
    });

    test('exports an execute function', () => {
        expect(typeof evalCommand.execute).toBe('function');
    });

    test('is marked as a developer-only command', () => {
        expect(evalCommand.developer).toBe(true);
    });
});

describe('eval command execute() – dangerous globals', () => {
    const dangerousCodes = [
        'process.exit()',
        'require("fs")',
        'global.secret',
        'child_process.exec("ls")',
        'fs.readFileSync("/etc/passwd")',
        'eval("1+1")',
    ];

    test.each(dangerousCodes)('blocks code containing "%s"', async (code) => {
        const interaction = makeInteraction(code);
        await evalCommand.execute(interaction);
        expect(interaction.deferReply).toHaveBeenCalled();
        expect(interaction.editReply).toHaveBeenCalledWith({
            content: '⚠️ El código incluye funciones o propiedades restringidas.',
            ephemeral: true,
        });
    });
});

describe('eval command execute() – successful evaluation', () => {
    test('evaluates a simple expression and replies with an embed', async () => {
        const interaction = makeInteraction('1 + 1');
        await evalCommand.execute(interaction);
        expect(interaction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
        expect(interaction.editReply).toHaveBeenCalledTimes(1);
        const [arg] = interaction.editReply.mock.calls[0];
        expect(arg).toHaveProperty('embeds');
        expect(arg.embeds).toHaveLength(1);
    });

    test('result embed contains the evaluated code in a field', async () => {
        const interaction = makeInteraction('2 * 3');
        await evalCommand.execute(interaction);
        const embed = interaction.editReply.mock.calls[0][0].embeds[0];
        const codeField = embed.data.fields.find((f) => f.name === 'Código');
        expect(codeField.value).toContain('2 * 3');
    });

    test('result embed contains the result value', async () => {
        const interaction = makeInteraction('40 + 2');
        await evalCommand.execute(interaction);
        const embed = interaction.editReply.mock.calls[0][0].embeds[0];
        const resultField = embed.data.fields.find((f) => f.name === 'Resultado');
        expect(resultField.value).toContain('42');
    });

    test('result embed contains execution time in the footer', async () => {
        const interaction = makeInteraction('"hello"');
        await evalCommand.execute(interaction);
        const embed = interaction.editReply.mock.calls[0][0].embeds[0];
        expect(embed.data.footer.text).toMatch(/Tiempo de ejecución:/);
    });

    test('shows result size in bytes for small results', async () => {
        const interaction = makeInteraction('"hi"');
        await evalCommand.execute(interaction);
        const embed = interaction.editReply.mock.calls[0][0].embeds[0];
        const sizeField = embed.data.fields.find((f) => f.name === 'Tamaño del Resultado');
        expect(sizeField.value).toMatch(/bytes/);
    });

    test('evaluates a string expression and detects type', async () => {
        const interaction = makeInteraction('"hello world"');
        await evalCommand.execute(interaction);
        const embed = interaction.editReply.mock.calls[0][0].embeds[0];
        const typeField = embed.data.fields.find((f) => f.name === 'Tipo');
        expect(typeField.value.toLowerCase()).toContain('string');
    });

    test('inspects non-string results with util.inspect', async () => {
        const interaction = makeInteraction('[1, 2, 3]');
        await evalCommand.execute(interaction);
        const embed = interaction.editReply.mock.calls[0][0].embeds[0];
        const resultField = embed.data.fields.find((f) => f.name === 'Resultado');
        expect(resultField.value).toContain('1');
        expect(resultField.value).toContain('2');
        expect(resultField.value).toContain('3');
    });
});

describe('eval command execute() – error handling', () => {
    test('catches a runtime error and replies with an error embed', async () => {
        const interaction = makeInteraction('undefinedVar.property');
        await evalCommand.execute(interaction);
        expect(interaction.editReply).toHaveBeenCalledTimes(1);
        const [arg] = interaction.editReply.mock.calls[0];
        expect(arg).toHaveProperty('embeds');
        const embed = arg.embeds[0];
        expect(embed.data.title).toMatch(/Error/);
    });

    test('identifies SyntaxError and labels it correctly', async () => {
        const interaction = makeInteraction('{{{');
        await evalCommand.execute(interaction);
        const embed = interaction.editReply.mock.calls[0][0].embeds[0];
        expect(embed.data.title).toContain('Error de Sintaxis');
    });

    test('error embed contains the original code', async () => {
        const interaction = makeInteraction('undefinedVar.property');
        await evalCommand.execute(interaction);
        const embed = interaction.editReply.mock.calls[0][0].embeds[0];
        const codeField = embed.data.fields.find((f) => f.name === 'Código');
        expect(codeField.value).toContain('undefinedVar.property');
    });

    test('error embed contains the error type', async () => {
        const interaction = makeInteraction('null.property');
        await evalCommand.execute(interaction);
        const embed = interaction.editReply.mock.calls[0][0].embeds[0];
        const typeField = embed.data.fields.find((f) => f.name === 'Tipo de Error');
        expect(typeField).toBeDefined();
        expect(typeField.value).toContain('TypeError');
    });
});

describe('eval command execute() – long code truncation', () => {
    test('truncates code longer than 1000 characters in the embed', async () => {
        const longCode = '"' + 'a'.repeat(1100) + '"';
        const interaction = makeInteraction(longCode);
        await evalCommand.execute(interaction);
        const embed = interaction.editReply.mock.calls[0][0].embeds[0];
        const codeField = embed.data.fields.find((f) => f.name === 'Código');
        // The field value wraps in code block, but the truncated text ends with "..."
        expect(codeField.value).toContain('...');
    });
});
