jest.mock('glob', () => ({
    glob: jest.fn(),
}));

const path = require('path');
const { glob: mockGlob } = require('glob');

describe('loadFiles', () => {
    let loadFiles;

    beforeEach(() => {
        jest.resetModules();
        jest.mock('glob', () => ({ glob: mockGlob }));
        ({ loadFiles } = require('../../Functions/fileLoader'));
        mockGlob.mockReset();
    });

    test('returns an empty array when glob finds no files', async () => {
        mockGlob.mockImplementation((_pattern, cb) => cb(null, []));
        const result = await loadFiles('Commands');
        expect(result).toEqual([]);
    });

    test('returns the file paths found by glob', async () => {
        const pingPath = path.resolve(__dirname, '../../Commands/Utils/ping.js');
        mockGlob.mockImplementation((_pattern, cb) => cb(null, [pingPath]));
        const result = await loadFiles('Commands');
        expect(result).toEqual([pingPath]);
    });

    test('passes the correct glob pattern for the given directory', async () => {
        mockGlob.mockImplementation((_pattern, cb) => cb(null, []));
        await loadFiles('Events');
        expect(mockGlob).toHaveBeenCalledWith(
            expect.stringMatching(/Events\/\*\*\/\*\.js$/),
            expect.any(Function)
        );
    });

    test('passes the correct glob pattern using the process cwd as root', async () => {
        mockGlob.mockImplementation((_pattern, cb) => cb(null, []));
        await loadFiles('Utils');
        const calledPattern = mockGlob.mock.calls[0][0];
        expect(calledPattern.startsWith(process.cwd().replace(/\\/g, '/'))).toBe(true);
    });

    test('rejects when glob reports an error', async () => {
        const error = new Error('glob failure');
        mockGlob.mockImplementation((_pattern, cb) => cb(error, null));
        await expect(loadFiles('Commands')).rejects.toThrow('glob failure');
    });

    test('returns multiple file paths', async () => {
        const pingPath = path.resolve(__dirname, '../../Commands/Utils/ping.js');
        const evalPath = path.resolve(__dirname, '../../Commands/Dev/eval.js');
        mockGlob.mockImplementation((_pattern, cb) => cb(null, [pingPath, evalPath]));
        const result = await loadFiles('Commands');
        expect(result).toHaveLength(2);
        expect(result).toContain(pingPath);
        expect(result).toContain(evalPath);
    });
});
