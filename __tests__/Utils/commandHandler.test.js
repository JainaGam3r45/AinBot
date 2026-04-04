const path = require('path');

jest.mock('../../Functions/fileLoader', () => ({
    loadFiles: jest.fn(),
}));

jest.mock('../../Utils/CustomLogger', () =>
    jest.fn().mockImplementation(() => ({ log: jest.fn() }))
);

const { loadFiles } = require('../../Functions/fileLoader');
const CustomLogger = require('../../Utils/CustomLogger');
const { loadCommands } = require('../../Utils/commandHandler');

function makeClient() {
    return {
        application: {
            commands: {
                cache: { clear: jest.fn() },
                set: jest.fn(),
            },
        },
        commands: {
            clear: jest.fn(),
            set: jest.fn(),
            has: jest.fn(),
            get: jest.fn(),
        },
    };
}

describe('loadCommands', () => {
    let client;

    beforeEach(() => {
        loadFiles.mockReset();
        client = makeClient();
    });

    test('clears previous commands from the client and Discord API cache', async () => {
        loadFiles.mockResolvedValue([]);
        await loadCommands(client);
        expect(client.application.commands.cache.clear).toHaveBeenCalled();
        expect(client.commands.clear).toHaveBeenCalled();
    });

    test('calls loadFiles with "Commands" directory', async () => {
        loadFiles.mockResolvedValue([]);
        await loadCommands(client);
        expect(loadFiles).toHaveBeenCalledWith('Commands');
    });

    test('registers discovered commands on the client', async () => {
        const pingPath = path.resolve(__dirname, '../../Commands/Utils/ping.js');
        loadFiles.mockResolvedValue([pingPath]);
        await loadCommands(client);
        expect(client.commands.set).toHaveBeenCalledWith('ping', expect.any(Object));
    });

    test('pushes all commands to the Discord API', async () => {
        const pingPath = path.resolve(__dirname, '../../Commands/Utils/ping.js');
        loadFiles.mockResolvedValue([pingPath]);
        await loadCommands(client);
        expect(client.application.commands.set).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({ name: 'ping' })])
        );
    });

    test('registers multiple commands when multiple files are returned', async () => {
        const pingPath = path.resolve(__dirname, '../../Commands/Utils/ping.js');
        const evalPath = path.resolve(__dirname, '../../Commands/Dev/eval.js');
        loadFiles.mockResolvedValue([pingPath, evalPath]);
        await loadCommands(client);
        expect(client.commands.set).toHaveBeenCalledTimes(2);
        const pushedCommands = client.application.commands.set.mock.calls[0][0];
        expect(pushedCommands).toHaveLength(2);
    });

    test('registers no commands when no files are found', async () => {
        loadFiles.mockResolvedValue([]);
        await loadCommands(client);
        expect(client.commands.set).not.toHaveBeenCalled();
        expect(client.application.commands.set).toHaveBeenCalledWith([]);
    });

    test('logs an error when the success log throws inside the try/catch', async () => {
        const pingPath = path.resolve(__dirname, '../../Commands/Utils/ping.js');
        loadFiles.mockResolvedValue([pingPath]);
        const mockLog = jest
            .fn()
            .mockImplementationOnce(() => { throw new Error('log failed'); });
        CustomLogger.mockImplementationOnce(() => ({ log: mockLog }));
        await loadCommands(client);
        // The catch block should have been entered: 1 throw + 1 error log + 1 completion log
        expect(mockLog).toHaveBeenCalledTimes(3);
        const errorCall = mockLog.mock.calls[1][0];
        expect(errorCall).toContain('❌');
    });
});
