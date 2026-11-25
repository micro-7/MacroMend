import { maskKey, memoryKeyStore } from '../keyStore';

describe('maskKey', () => {
  it('shows only the last 4 characters', () => {
    expect(maskKey('AIzaSyABCDEFGHIJKLMNOP1234')).toBe('••••••••••••1234');
    expect(maskKey('abcdefgh')).toBe('••••efgh');
    expect(maskKey('abc')).toBe('•••');
    expect(maskKey('')).toBe('');
  });

  it('never contains the start of the key', () => {
    expect(maskKey('SECRETKEY123456789')).not.toContain('SECRET');
  });
});

describe('memory key store', () => {
  it('stores, reads and deletes keys per provider', async () => {
    const s = memoryKeyStore();
    await s.set('a', 'k1');
    await s.set('b', 'k2');
    expect(await s.get('a')).toBe('k1');
    await s.delete('a');
    expect(await s.get('a')).toBeNull();
    expect(await s.get('b')).toBe('k2');
  });
});
