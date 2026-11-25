import { searchTermsFor } from '../searchTerms';

describe('searchTermsFor', () => {
  it.each([
    ['1 scoop muscleblaze whey', 'muscleblaze whey'],
    ['2 katori quinoa salad', 'quinoa salad'],
    ['do roti', 'roti'],
    ['250 g greek yogurt', 'greek yogurt'],
    ['250g greek yogurt', 'greek yogurt'],
    ['quinoa salad', 'quinoa salad'],
    ['1 scoop', '1 scoop'],
  ])('%s -> %s', (input, expected) => {
    expect(searchTermsFor(input)).toBe(expected);
  });
});
