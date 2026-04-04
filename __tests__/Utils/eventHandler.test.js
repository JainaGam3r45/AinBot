const path = require('path');

jest.mock('../../Functions/fileLoader', () => ({
    loadFiles: jest.fn(),
}));

jest.mock('../../Utils/CustomLogger', () =>
    jest.fn().mockImplementation(() => ({ log: jest.fn() }))
);

const { loadFiles } = require('../../Functions/fileLoader');
const { loadEvents } = require('../../Utils/eventHandler');

function makeClient() {
    return {
        events: { clear: jest.fn(), set: jest.fn() },
        on: jest.fn(),
        once: jest.fn(),
        rest: { on: jest.fn(), once: jest.fn() },
    };
}

describe('loadEvents', () => {
    let client;

    beforeEach(() => {
        loadFiles.mockReset();
        client = makeClient();
    });

    test('clears events collection before loading', async () => {
        loadFiles.mockResolvedValue([]);
        await loadEvents(client);
        expect(client.events.clear).toHaveBeenCalled();
    });

    test('calls loadFiles with "Events" directory', async () => {
        loadFiles.mockResolvedValue([]);
        await loadEvents(client);
        expect(loadFiles).toHaveBeenCalledWith('Events');
    });

    test('registers a once event with client.once()', async () => {
        const readyPath = path.resolve(__dirname, '../../Events/Client/ready.js');
        loadFiles.mockResolvedValue([readyPath]);
        await loadEvents(client);
        expect(client.once).toHaveBeenCalledWith('ready', expect.any(Function));
        expect(client.on).not.toHaveBeenCalledWith('ready', expect.any(Function));
    });

    test('registers a regular (non-once) event with client.on()', async () => {
        const intrPath = path.resolve(__dirname, '../../Events/Interactions/intrHandler.js');
        loadFiles.mockResolvedValue([intrPath]);
        await loadEvents(client);
        expect(client.on).toHaveBeenCalledWith('interactionCreate', expect.any(Function));
        expect(client.once).not.toHaveBeenCalledWith('interactionCreate', expect.any(Function));
    });

    test('stores each event in the client.events collection', async () => {
        const readyPath = path.resolve(__dirname, '../../Events/Client/ready.js');
        loadFiles.mockResolvedValue([readyPath]);
        await loadEvents(client);
        expect(client.events.set).toHaveBeenCalledWith('ready', expect.any(Function));
    });

    test('the registered execute wrapper forwards arguments and appends client', async () => {
        const intrPath = path.resolve(__dirname, '../../Events/Interactions/intrHandler.js');
        loadFiles.mockResolvedValue([intrPath]);
        await loadEvents(client);

        const [[, wrappedExecute]] = client.events.set.mock.calls;

        const eventModule = require('../../Events/Interactions/intrHandler.js');
        const spy = jest.spyOn(eventModule, 'execute').mockResolvedValue(undefined);

        const fakeInteraction = { isChatInputCommand: () => false, isButton: () => false };
        await wrappedExecute(fakeInteraction);

        expect(spy).toHaveBeenCalledWith(fakeInteraction, client);
        spy.mockRestore();
    });

    test('registers a REST once event on client.rest', async () => {
        const fixturePath = path.resolve(__dirname, '../fixtures/restOnceEvent.js');
        loadFiles.mockResolvedValue([fixturePath]);
        await loadEvents(client);
        expect(client.rest.once).toHaveBeenCalledWith('rateLimited', expect.any(Function));
    });

    test('registers a REST on event on client.rest', async () => {
        const fixturePath = path.resolve(__dirname, '../fixtures/restOnEvent.js');
        loadFiles.mockResolvedValue([fixturePath]);
        await loadEvents(client);
        expect(client.rest.on).toHaveBeenCalledWith('restRequest', expect.any(Function));
    });

    test('continues loading remaining events if one event file errors', async () => {
        const badPath = path.resolve(__dirname, '../fixtures/badEvent.js');
        const intrPath = path.resolve(__dirname, '../../Events/Interactions/intrHandler.js');
        loadFiles.mockResolvedValue([badPath, intrPath]);
        await expect(loadEvents(client)).resolves.not.toThrow();
        expect(client.on).toHaveBeenCalledWith('interactionCreate', expect.any(Function));
    });
});
