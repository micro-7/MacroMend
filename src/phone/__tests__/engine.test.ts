const mockDownload = jest.fn();
const mockCreateSession = jest.fn();
const MODEL = { modelPath: 'https://hf/gemma_4_e2b_xnnpack_8da4w.pte', tokenizerPath: 'https://hf/tokenizer.json', tokenizerConfigPath: 'https://hf/tokenizer_config.json' };

jest.mock('react-native-executorch', () => ({
  models: { llm: { GEMMA4_E2B: { XNNPACK_8DA4W: MODEL, VULKAN_8DA4W: { modelPath: 'vulkan' }, DEFAULT: { modelPath: 'default' } } } },
  download: (...a: unknown[]) => mockDownload(...a),
  createLLMChatSession: (...a: unknown[]) => mockCreateSession(...a),
}));

const mockFiles = new Map<string, number>();
const mockUnlinked: string[] = [];
jest.mock('react-native-blob-util', () => ({
  __esModule: true,
  default: {
    fs: {
      dirs: { SDCardDir: '/sdcard/Android/data/app/files', DocumentDir: '/data/app/files' },
      exists: async (p: string) => mockFiles.has(p),
      stat: async (p: string) => ({ size: mockFiles.get(p) ?? 0 }),
      unlink: async (p: string) => {
        mockUnlinked.push(p);
        mockFiles.delete(p);
      },
    },
  },
}));

import { Platform } from 'react-native';
import { createRealDownloader, createRealEngine, getModelConfig, messageText, modelFolders, MAX_NEW_TOKENS } from '../engine';

beforeAll(() => {
  jest.replaceProperty(Platform, 'OS', 'android');
});

beforeEach(() => {
  mockDownload.mockReset();
  mockCreateSession.mockReset();
  mockFiles.clear();
  mockUnlinked.length = 0;
});

describe('model choice', () => {
  it('uses Gemma 4 E2B, the XNNPACK export', () => {
    expect(getModelConfig()).toBe(MODEL);
    expect(MODEL.modelPath).toMatch(/gemma_4_e2b/);
  });
});

describe('downloader', () => {
  it('downloads the model with progress and abort, and returns the three local files', async () => {
    const local = { modelPath: '/m/model.pte', tokenizerPath: '/m/tok.json', tokenizerConfigPath: '/m/tokcfg.json' };
    mockDownload.mockResolvedValue(local);
    const onProgress = jest.fn();
    const signal = new AbortController().signal;
    const out = await createRealDownloader().download(onProgress, signal);
    expect(out).toEqual(['/m/model.pte', '/m/tok.json', '/m/tokcfg.json']);
    expect(mockDownload).toHaveBeenCalledWith(MODEL, { onProgress, signal });
  });

  it('passes a failed or aborted download on', async () => {
    mockDownload.mockRejectedValue(new Error('Network request failed'));
    await expect(createRealDownloader().download(() => {}, new AbortController().signal)).rejects.toThrow('Network request failed');
  });

  it('verifies that every file is there and not empty', async () => {
    const d = createRealDownloader();
    mockFiles.set('/a', 100);
    mockFiles.set('/b', 5);
    expect(await d.verify(['/a', '/b'])).toBe(true);
    mockFiles.set('/b', 0);
    expect(await d.verify(['/a', '/b'])).toBe(false);
    mockFiles.delete('/a');
    expect(await d.verify(['/a'])).toBe(false);
    expect(await d.verify([])).toBe(false);
  });

  it('deletes the model folder, wherever the library put it', async () => {
    mockFiles.set('/data/app/files/react-native-executorch', 1);
    mockFiles.set('/sdcard/Android/data/app/files/react-native-executorch', 1);
    await createRealDownloader().deleteFiles();
    expect(mockUnlinked.sort()).toEqual(['/data/app/files/react-native-executorch', '/sdcard/Android/data/app/files/react-native-executorch']);
  });

  it('does nothing when there is nothing to delete', async () => {
    await createRealDownloader().deleteFiles();
    expect(mockUnlinked).toEqual([]);
    expect(modelFolders()).toHaveLength(2);
  });
});

describe('engine', () => {
  const fakeChat = (reply: unknown, usage = 0.1) => ({
    sendMessage: jest.fn().mockResolvedValue({ messages: [{ role: 'user', content: 'Input: x' }, { role: 'assistant', content: reply }], finishReason: 'stop' }),
    stop: jest.fn(),
    dispose: jest.fn(),
    getKVCacheState: jest.fn().mockReturnValue({ usageRatio: usage }),
  });
  const FILES = ['/m/model.pte', '/m/tok.json', '/m/tokcfg.json'];

  it('opens a session from the downloaded files with the instructions loaded once and greedy decoding', async () => {
    const chat = fakeChat('{"items":[]}');
    mockCreateSession.mockResolvedValue(chat);
    await createRealEngine(() => FILES).openSession('SYSTEM PROMPT');
    expect(mockCreateSession).toHaveBeenCalledWith(
      { modelPath: '/m/model.pte', tokenizerPath: '/m/tok.json', tokenizerConfigPath: '/m/tokcfg.json' },
      {
        initialMessages: [{ role: 'system', content: 'SYSTEM PROMPT' }],
        generationConfig: { temperature: 0, maxNewTokens: MAX_NEW_TOKENS, enableThinking: false },
      },
    );
  });

  it('sends a line and returns the assistant\'s text; reports memory use; stops and frees on request', async () => {
    const chat = fakeChat('{"items":[{"name":"roti"}]}', 0.42);
    mockCreateSession.mockResolvedValue(chat);
    const s = await createRealEngine(() => FILES).openSession('p');
    expect(await s.send('Input: 2 roti')).toBe('{"items":[{"name":"roti"}]}');
    expect(chat.sendMessage).toHaveBeenCalledWith('Input: 2 roti');
    expect(s.usageRatio()).toBe(0.42);
    s.stop();
    s.dispose();
    expect(chat.stop).toHaveBeenCalled();
    expect(chat.dispose).toHaveBeenCalled();
  });

  it('reads a reply given as a list of parts', async () => {
    mockCreateSession.mockResolvedValue(fakeChat(['{"items":', '[]}']));
    const s = await createRealEngine(() => FILES).openSession('p');
    expect(await s.send('x')).toBe('{"items":[]}');
    expect(messageText(undefined)).toBe('');
  });

  it('refuses to load when the model is not downloaded, without touching the library', async () => {
    await expect(createRealEngine(() => null).openSession('p')).rejects.toThrow(/not downloaded/);
    await expect(createRealEngine(() => ['/only-one']).openSession('p')).rejects.toThrow(/not downloaded/);
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  it('passes a load failure on (out of memory, bad file)', async () => {
    mockCreateSession.mockRejectedValue(new Error('Failed to load model'));
    await expect(createRealEngine(() => FILES).openSession('p')).rejects.toThrow('Failed to load model');
  });
});
