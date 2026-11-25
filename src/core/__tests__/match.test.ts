import { ALL_FOODS } from '../../data/foods';
import { buildMatchIndex, editDistance, fuzzyLimit, matchFood, variantsOf } from '../match';

const index = buildMatchIndex(ALL_FOODS.map((f) => ({ id: f.id, name: f.name, aliases: f.aliases })));
const m = (name: string) => matchFood(name, index);

describe('matchFood: exact names and aliases', () => {
  it('maps Hindi and regional names (dahi -> curd, chapati -> roti, anda -> egg)', () => {
    expect(m('dahi')).toMatchObject({ foodName: 'curd', kind: 'exact' });
    expect(m('chapati')).toMatchObject({ foodName: 'roti', kind: 'exact' });
    expect(m('anda')).toMatchObject({ foodName: 'egg', kind: 'exact' });
  });

  it('ignores case, spaces and punctuation', () => {
    expect(m('  Paneer ')).toMatchObject({ foodName: 'paneer', kind: 'exact' });
    expect(m('DAL-MAKHANI')).toMatchObject({ foodName: 'dal makhani', kind: 'exact' });
  });

  it('prefers the shortest food and offers other dals as alternatives (dal vs dal makhani)', () => {
    const r = m('dal')!;
    expect(r).toMatchObject({ foodName: 'dal', kind: 'exact' });
    expect(r.alternatives.map((a) => a.foodName)).toEqual(expect.arrayContaining(['dal makhani', 'moong dal']));
    expect(r.alternatives.map((a) => a.foodName)).not.toContain('dal');
    const ordered = r.alternatives.map((a) => a.foodName.length);
    expect([...ordered].sort((a, b) => a - b)).toEqual(ordered);
  });

  it('prefers a food name over another food\'s alias', () => {
    // "curd" is the name of curd; make sure no alias elsewhere steals it
    expect(m('curd')).toMatchObject({ foodName: 'curd', kind: 'exact' });
  });
});

describe('matchFood: plurals and spellings', () => {
  it('matches plurals (rotis -> roti, samosas -> samosa)', () => {
    expect(m('rotis')).toMatchObject({ foodName: 'roti', kind: 'variant' });
    expect(m('samosas')).toMatchObject({ foodName: 'samosa', kind: 'variant' });
    expect(m('aloo parathas')).toMatchObject({ foodName: 'aloo paratha', kind: 'variant' });
  });

  it('matches doubled vowels and Hinglish spellings (daal, chaawal, panir)', () => {
    expect(m('daal')).toMatchObject({ foodName: 'dal' });
    expect(m('chaawal')).toMatchObject({ foodName: 'white rice' });
    expect(m('panir')).toMatchObject({ foodName: 'paneer' });
    expect(m('dahee')?.foodName).toBe('curd');
  });
});

describe('matchFood: typos', () => {
  it('matches panner -> paneer as fuzzy', () => {
    expect(m('panner')).toMatchObject({ foodName: 'paneer', kind: 'fuzzy' });
  });

  it('matches a typo inside a longer name (panner paratha -> paneer paratha)', () => {
    expect(m('panner paratha')).toMatchObject({ foodName: 'paneer paratha', kind: 'fuzzy' });
  });

  it('allows one edit for 4-5 letter names and two for longer ones', () => {
    expect(fuzzyLimit(3)).toBe(0);
    expect(fuzzyLimit(4)).toBe(1);
    expect(fuzzyLimit(5)).toBe(1);
    expect(fuzzyLimit(6)).toBe(2);
    expect(m('mnago')).toMatchObject({ foodName: 'mango', kind: 'fuzzy' }); // swapped letters = 1 edit
  });

  it('does not guess for very different or very short names', () => {
    expect(m('xylophone')).toBeNull();
    expect(m('zzz')).toBeNull();
    expect(m('')).toBeNull();
    expect(m('   ')).toBeNull();
  });

  it('returns null for pizza when the table has no pizza food', () => {
    const noPizza = buildMatchIndex([
      { id: 'a', name: 'paneer', aliases: ['panir'] },
      { id: 'b', name: 'roti', aliases: [] },
    ]);
    expect(matchFood('pizza', noPizza)).toBeNull();
  });
});

describe('helpers', () => {
  it('measures edit distance with swaps counted once', () => {
    expect(editDistance('paneer', 'panner')).toBe(1);
    expect(editDistance('mango', 'mnago')).toBe(1);
    expect(editDistance('abc', 'xyz')).toBe(3);
    expect(editDistance('abc', 'abcdef', 2)).toBeGreaterThan(2);
  });

  it('lists other spellings to try', () => {
    expect(variantsOf('rotis')).toContain('roti');
    expect(variantsOf('daal')).toContain('dal');
    expect(variantsOf('roti')).not.toContain('roti');
  });
});
