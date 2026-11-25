import { greeting } from '../greeting';

const at = (h: number, m = 0) => new Date(2026, 10, 25, h, m);

describe('greeting', () => {
  it.each([
    [0, 'Good morning'],
    [9, 'Good morning'],
    [11, 'Good morning'],
    [12, 'Good afternoon'],
    [13, 'Good afternoon'],
    [16, 'Good afternoon'],
    [17, 'Good evening'],
    [19, 'Good evening'],
    [23, 'Good evening'],
  ])('at %s:00 it says %s', (hour, expected) => {
    expect(greeting(at(hour))).toBe(expected);
  });

  it('adds the name when there is one', () => {
    expect(greeting(at(19, 30), 'Mihir')).toBe('Good evening, Mihir');
    expect(greeting(at(9), 'Mihir T')).toBe('Good morning, Mihir T');
  });

  it('ignores an empty or blank name', () => {
    expect(greeting(at(19, 30), null)).toBe('Good evening');
    expect(greeting(at(19, 30), '   ')).toBe('Good evening');
    expect(greeting(at(19, 30), '')).toBe('Good evening');
  });
});
