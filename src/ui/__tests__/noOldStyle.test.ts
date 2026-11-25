import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/** Every source file of the app (not tests), so a screen cannot quietly keep the old white style. */
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === '__tests__' || name === 'data' ? [] : sources(p);
    return /\.tsx?$/.test(name) ? [p] : [];
  });
}

const FILES = sources(join(__dirname, '..', '..'));
const read = (p: string) => readFileSync(p, 'utf8');

describe('dark style everywhere', () => {
  it('finds the app source', () => {
    expect(FILES.length).toBeGreaterThan(50);
  });

  it('no file uses the old colour names', () => {
    const offenders = FILES.filter((f) => /\bcolors\./.test(read(f)));
    expect(offenders).toEqual([]);
  });

  it('no screen sets a white or light background by hand', () => {
    const light = /backgroundColor:\s*['"]#(?:fff|ffffff|f[0-9a-f]{5}|e[0-9a-f]{5})['"]/i;
    // The white pill button on the green hero card is the one deliberate exception.
    const offenders = FILES.filter((f) => !f.endsWith('ui/kit.tsx') && light.test(read(f)));
    expect(offenders).toEqual([]);
  });

  it('every text style goes through the shared Text and TextInput components', () => {
    const offenders = FILES.filter((f) => {
      if (/ui\/(Text|TextInput|Title)\.tsx$/.test(f)) return false;
      const m = /import \{([^}]*)\} from 'react-native';/.exec(read(f));
      return !!m && m[1].split(',').map((n) => n.trim()).some((n) => n === 'Text' || n === 'TextInput');
    });
    expect(offenders).toEqual([]);
  });
});
