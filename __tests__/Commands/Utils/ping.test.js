const pingCommand = require('../../../Commands/Utils/ping');

describe('ping command definition', () => {
    test('exports a data property with name "ping"', () => {
        expect(pingCommand.data.name).toBe('ping');
    });

    test('exports an execute function', () => {
        expect(typeof pingCommand.execute).toBe('function');
    });

    test('is not marked as a developer-only command', () => {
        expect(pingCommand.developer).toBeFalsy();
    });
});

describe('ping command execute()', () => {
    let mockInteraction;

    beforeEach(() => {
        mockInteraction = {
            channel: { sendTyping: jest.fn().mockResolvedValue(undefined) },
            createdTimestamp: Date.now() - 150,
            client: { ws: { ping: 42 } },
            user: {
                username: 'TestUser',
                displayAvatarURL: jest.fn().mockReturnValue('https://example.com/avatar.png'),
            },
            reply: jest.fn().mockResolvedValue(undefined),
        };
    });

    test('calls sendTyping before replying', async () => {
        await pingCommand.execute(mockInteraction);
        expect(mockInteraction.channel.sendTyping).toHaveBeenCalledTimes(1);
    });

    test('replies with an embed', async () => {
        await pingCommand.execute(mockInteraction);
        expect(mockInteraction.reply).toHaveBeenCalledTimes(1);
        const [replyArg] = mockInteraction.reply.mock.calls[0];
        expect(replyArg).toHaveProperty('embeds');
        expect(Array.isArray(replyArg.embeds)).toBe(true);
        expect(replyArg.embeds.length).toBe(1);
    });

    test('embed contains bot ping and API ping fields', async () => {
        await pingCommand.execute(mockInteraction);
        const embed = mockInteraction.reply.mock.calls[0][0].embeds[0];
        const data = embed.data;
        const fieldNames = data.fields.map((f) => f.name);
        expect(fieldNames).toContain('Ping del Bot');
        expect(fieldNames).toContain('Ping de la API');
    });

    test('API ping value matches client.ws.ping rounded', async () => {
        mockInteraction.client.ws.ping = 99.7;
        await pingCommand.execute(mockInteraction);
        const embed = mockInteraction.reply.mock.calls[0][0].embeds[0];
        const apiField = embed.data.fields.find((f) => f.name === 'Ping de la API');
        expect(apiField.value).toBe('100ms');
    });

    test('bot ping is a non-negative number in milliseconds', async () => {
        await pingCommand.execute(mockInteraction);
        const embed = mockInteraction.reply.mock.calls[0][0].embeds[0];
        const botField = embed.data.fields.find((f) => f.name === 'Ping del Bot');
        const pingMs = parseInt(botField.value, 10);
        expect(pingMs).toBeGreaterThanOrEqual(0);
    });

    test('footer includes the requesting user username', async () => {
        await pingCommand.execute(mockInteraction);
        const embed = mockInteraction.reply.mock.calls[0][0].embeds[0];
        expect(embed.data.footer.text).toContain('TestUser');
    });
});
