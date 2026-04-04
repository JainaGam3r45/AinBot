const mockSend = jest.fn();

jest.mock('colorful-logify', () => ({
    ColorLogger: jest.fn().mockImplementation(() => ({
        send: mockSend,
    })),
}));

const CustomLogger = require('../../Utils/CustomLogger');

describe('CustomLogger', () => {
    let logger;

    beforeEach(() => {
        mockSend.mockClear();
        logger = new CustomLogger();
    });

    test('creates a CustomLogger instance successfully', () => {
        expect(logger).toBeInstanceOf(CustomLogger);
    });

    test('log() delegates to the underlying ColorLogger.send()', () => {
        logger.log('hello world');
        expect(mockSend).toHaveBeenCalledTimes(1);
        expect(mockSend).toHaveBeenCalledWith('hello world');
    });

    test('log() passes color-coded messages unchanged', () => {
        const message = '&b[INFO] &fBot is &arunning ✅';
        logger.log(message);
        expect(mockSend).toHaveBeenCalledWith(message);
    });

    test('log() can be called multiple times', () => {
        logger.log('first');
        logger.log('second');
        logger.log('third');
        expect(mockSend).toHaveBeenCalledTimes(3);
    });

    test('each CustomLogger instance has its own ColorLogger', () => {
        const { ColorLogger } = require('colorful-logify');
        const instanceCount = ColorLogger.mock.instances.length;
        const logger2 = new CustomLogger();
        expect(ColorLogger.mock.instances.length).toBe(instanceCount + 1);
        expect(logger2).toBeInstanceOf(CustomLogger);
    });
});
