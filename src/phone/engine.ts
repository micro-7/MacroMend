import { Platform } from 'react-native';
import type { PhoneEngine, PhoneSession } from '../ai/phoneModel';
import type { Downloader } from './downloadState';

// This is the only file that talks to react-native-executorch and react-native-blob-util. The library is loaded
// lazily, the first time the phone model is really used, so the app starts as fast as before and unit tests
// never touch native code.

type Executorch = typeof import('react-native-executorch');
type BlobUtil = typeof import('react-native-blob-util').default;

// eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded only when the phone model is first used
const loadExecutorch = (): Executorch => require('react-native-executorch');
// eslint-disable-next-line @typescript-eslint/no-require-imports -- same: keeps native code out of app start-up and tests
const loadBlobUtil = (): BlobUtil => require('react-native-blob-util').default;

/** Gemma 4 E2B, the XNNPACK export (it runs on every Android phone; the Vulkan one is an option if this is too slow). */
export const getModelConfig = (lib: Executorch = loadExecutorch()) => lib.models.llm.GEMMA4_E2B.XNNPACK_8DA4W;

/** Where react-native-executorch keeps downloaded models: one folder per app, in one of two places. */
export function modelFolders(blob: BlobUtil = loadBlobUtil()): string[] {
  const dirs = blob.fs.dirs;
  const bases = Platform.OS === 'android' ? [dirs.SDCardDir, dirs.DocumentDir] : [dirs.DocumentDir];
  return [...new Set(bases.filter((b): b is string => !!b).map((b) => `${b}/react-native-executorch`))];
}

export function createRealDownloader(): Downloader {
  return {
    async download(onProgress, signal) {
      const lib = loadExecutorch();
      const local = await lib.download(getModelConfig(lib), { onProgress, signal });
      return [local.modelPath, local.tokenizerPath, local.tokenizerConfigPath];
    },

    async deleteFiles() {
      const blob = loadBlobUtil();
      for (const dir of modelFolders(blob)) {
        if (await blob.fs.exists(dir)) await blob.fs.unlink(dir);
      }
    },

    async verify(files) {
      const blob = loadBlobUtil();
      if (files.length === 0) return false;
      for (const f of files) {
        try {
          if (!(await blob.fs.exists(f))) return false;
          if (Number((await blob.fs.stat(f)).size) <= 0) return false;
        } catch {
          return false;
        }
      }
      return true;
    },
  };
}

/** The text of a chat message, whether it is a string or a list of parts. */
export function messageText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((p) => (typeof p === 'string' ? p : '')).join('');
  return '';
}

/** Max words the model may write for one reply. A list of 20 foods in JSON stays well under this. */
export const MAX_NEW_TOKENS = 512;

export function createRealEngine(getFiles: () => string[] | null): PhoneEngine {
  return {
    async openSession(systemPrompt): Promise<PhoneSession> {
      const files = getFiles();
      if (!files || files.length < 3) throw new Error('The phone model is not downloaded.');
      const [modelPath, tokenizerPath, tokenizerConfigPath] = files;
      const lib = loadExecutorch();
      const chat = await lib.createLLMChatSession(
        { modelPath, tokenizerPath, tokenizerConfigPath },
        {
          // The instructions and examples are processed once, here, and stay in the model's memory.
          initialMessages: [{ role: 'system', content: systemPrompt }],
          // Greedy decoding: the same text gives the same answer, which is what a parser wants.
          generationConfig: { temperature: 0, maxNewTokens: MAX_NEW_TOKENS, enableThinking: false },
        },
      );
      return {
        async send(userText) {
          const turn = await chat.sendMessage(userText);
          const reply = [...turn.messages].reverse().find((m) => m.role === 'assistant');
          return messageText(reply?.content);
        },
        stop: () => chat.stop(),
        usageRatio: () => chat.getKVCacheState().usageRatio,
        dispose: () => chat.dispose(),
      };
    },
  };
}
