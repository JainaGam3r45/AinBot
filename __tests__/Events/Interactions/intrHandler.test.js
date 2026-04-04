const intrHandler = require('../../../Events/Interactions/intrHandler');

describe('intrHandler event definition', () => {
    test('has name "interactionCreate"', () => {
        expect(intrHandler.name).toBe('interactionCreate');
    });

    test('exports an execute function', () => {
        expect(typeof intrHandler.execute).toBe('function');
    });

    test('is not a once event', () => {
        expect(intrHandler.once).toBeFalsy();
    });
});

describe('intrHandler execute() – slash commands', () => {
    const originalDevIds = process.env.DEVELOPERS_IDS;

    beforeEach(() => {
        process.env.DEVELOPERS_IDS = '["dev001","dev002"]';
    });

    afterEach(() => {
        process.env.DEVELOPERS_IDS = originalDevIds;
    });

    function makeInteraction(overrides = {}) {
        return {
            isChatInputCommand: jest.fn().mockReturnValue(true),
            isButton: jest.fn().mockReturnValue(false),
            commandName: 'ping',
            user: { id: 'user001' },
            reply: jest.fn().mockResolvedValue(undefined),
            ...overrides,
        };
    }

    function makeClient(commandOverrides = {}) {
        return {
            commands: {
                get: jest.fn().mockReturnValue({
                    developer: false,
                    execute: jest.fn().mockResolvedValue(undefined),
                    ...commandOverrides,
                }),
            },
            buttons: { get: jest.fn() },
        };
    }

    test('executes the matching command', async () => {
        const mockExecute = jest.fn().mockResolvedValue(undefined);
        const client = makeClient({ execute: mockExecute });
        const interaction = makeInteraction();
        await intrHandler.execute(interaction, client);
        expect(client.commands.get).toHaveBeenCalledWith('ping');
        expect(mockExecute).toHaveBeenCalledWith(interaction, client);
    });

    test('replies with "outdated command" when command is not found', async () => {
        const client = {
            commands: { get: jest.fn().mockReturnValue(undefined) },
            buttons: { get: jest.fn() },
        };
        const interaction = makeInteraction();
        await intrHandler.execute(interaction, client);
        expect(interaction.reply).toHaveBeenCalledWith({
            content: 'Comando desactualizado o ya no está disponible.',
            ephemeral: true,
        });
    });

    test('blocks non-developer users from developer commands', async () => {
        const client = makeClient({ developer: true });
        const interaction = makeInteraction({ user: { id: 'regularUser' } });
        await intrHandler.execute(interaction, client);
        expect(interaction.reply).toHaveBeenCalledWith({
            content: '¡Ups! Has descubierto un comando de desarrollador.',
            ephemeral: true,
        });
    });

    test('allows listed developer users to use developer commands', async () => {
        const mockExecute = jest.fn().mockResolvedValue(undefined);
        const client = makeClient({ developer: true, execute: mockExecute });
        const interaction = makeInteraction({ user: { id: 'dev001' } });
        await intrHandler.execute(interaction, client);
        expect(mockExecute).toHaveBeenCalled();
    });

    test('does nothing for unrecognised interaction types', async () => {
        const client = makeClient();
        const interaction = {
            isChatInputCommand: jest.fn().mockReturnValue(false),
            isButton: jest.fn().mockReturnValue(false),
            reply: jest.fn(),
        };
        await intrHandler.execute(interaction, client);
        expect(interaction.reply).not.toHaveBeenCalled();
    });
});

describe('intrHandler execute() – button interactions', () => {
    function makeButtonInteraction(customId, overrides = {}) {
        return {
            isChatInputCommand: jest.fn().mockReturnValue(false),
            isButton: jest.fn().mockReturnValue(true),
            customId,
            reply: jest.fn().mockResolvedValue(undefined),
            ...overrides,
        };
    }

    test('executes the matching button handler', async () => {
        const mockButtonExecute = jest.fn().mockResolvedValue(undefined);
        const client = {
            commands: { get: jest.fn() },
            buttons: { get: jest.fn().mockReturnValue({ execute: mockButtonExecute }) },
        };
        const interaction = makeButtonInteraction('confirm_12345');
        await intrHandler.execute(interaction, client);
        expect(client.buttons.get).toHaveBeenCalledWith('confirm');
        expect(mockButtonExecute).toHaveBeenCalledWith(interaction, client, ['12345']);
    });

    test('does nothing if button handler is not registered', async () => {
        const client = {
            commands: { get: jest.fn() },
            buttons: { get: jest.fn().mockReturnValue(undefined) },
        };
        const interaction = makeButtonInteraction('unknown_button');
        await intrHandler.execute(interaction, client);
        expect(interaction.reply).not.toHaveBeenCalled();
    });

    test('passes all extra id segments to the button handler', async () => {
        const mockButtonExecute = jest.fn().mockResolvedValue(undefined);
        const client = {
            commands: { get: jest.fn() },
            buttons: { get: jest.fn().mockReturnValue({ execute: mockButtonExecute }) },
        };
        const interaction = makeButtonInteraction('action_user_42_confirm');
        await intrHandler.execute(interaction, client);
        expect(mockButtonExecute).toHaveBeenCalledWith(interaction, client, ['user', '42', 'confirm']);
    });
});
