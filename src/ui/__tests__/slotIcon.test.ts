import { DEFAULT_SLOTS } from '../../core/slots';
import { slotIcon } from '../slotIcon';

describe('slotIcon', () => {
  it.each([
    ['Breakfast', 'coffee'],
    ['Lunch', 'sun'],
    ['Dinner', 'moon'],
    ['Snack', 'shopping-bag'],
    ['Pre workout', 'zap'],
    ['Midnight stuff', 'moon'],
    ['Something else', 'clock'],
  ])('%s gets %s', (name, icon) => {
    expect(slotIcon(name)).toBe(icon);
  });

  it('gives every default slot an icon', () => {
    for (const s of DEFAULT_SLOTS) expect(slotIcon(s.name)).toBeTruthy();
  });
});
