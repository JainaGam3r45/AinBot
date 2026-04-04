jest.mock('../../../Utils/commandHandler', () => ({
    loadCommands: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../Utils/CustomLogger', () =>
    jest.fn().mockImplementation(() => ({ log: jest.fn() }))
);

const { loadCommands } = require('../../../Utils/commandHandler');
const readyEvent = require('../../../Events/Client/ready');

describe('ready event definition', () => {
    test('has name "ready"', () => {
        expect(readyEvent.name).toBe('ready');
    });

    test('is a once event', () => {
        expect(readyEvent.once).toBe(true);
    });

    test('exports an execute function', () => {
        expect(typeof readyEvent.execute).toBe('function');
    });
});

describe('ready event execute()', () => {
    let mockClient;

    beforeEach(() => {
        loadCommands.mockClear();
        mockClient = {
            user: {
                tag: 'AinBot#0000',
                id: '123456789',
                setPresence: jest.fn(),
            },
        };
    });

    test('calls loadCommands with the client', async () => {
        await readyEvent.execute(mockClient);
        expect(loadCommands).toHaveBeenCalledWith(mockClient);
    });

    test('sets bot presence', async () => {
        await readyEvent.execute(mockClient);
        expect(mockClient.user.setPresence).toHaveBeenCalledTimes(1);
    });

    test('sets presence with "Ainbot" activity', async () => {
        await readyEvent.execute(mockClient);
        const [presenceArg] = mockClient.user.setPresence.mock.calls[0];
        expect(presenceArg.activities[0].name).toBe('Ainbot');
    });

    test('sets status to Idle', async () => {
        await readyEvent.execute(mockClient);
        const [presenceArg] = mockClient.user.setPresence.mock.calls[0];
        // PresenceUpdateStatus.Idle = 'idle'
        expect(presenceArg.status).toBe('idle');
    });
});
