import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { toConfirmItems, type ConfirmFood } from '../../ai/confirm';
import { resolveItems } from '../../ai/resolve';
import { buildMatchIndex } from '../../core/match';
import { DEFAULT_SLOTS } from '../../core/slots';
import { ALL_FOODS } from '../../data/foods';
import { ConfirmList } from '../ConfirmList';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const index = buildMatchIndex(ALL_FOODS.map((f) => ({ id: f.id, name: f.name, aliases: f.aliases })));
const units = new Map(ALL_FOODS.map((f) => [f.id, { unit: f.unit }]));
const foods = new Map<string, ConfirmFood>(ALL_FOODS.map((f) => [f.id, {
  id: f.id, name: f.name, unit: f.unit, gramsPerUnit: f.gramsPerUnit, kcalPer100g: f.kcalPer100g, proteinPer100g: f.proteinPer100g,
}]));

const mounted: ReactTestRenderer[] = [];
afterEach(async () => {
  await act(async () => mounted.splice(0).forEach((r) => r.unmount()));
});

const texts = (r: ReactTestRenderer) =>
  r.root.findAll((n) => (n.type as unknown as string) === 'Text')
    .map((n) => [n.props.children].flat(5).filter((c: unknown) => typeof c === 'string' || typeof c === 'number').join(''))
    .join(' | ');
const press = (r: ReactTestRenderer, role: string, label: string) =>
  r.root.findAll((n) => n.props.accessibilityRole === role && texts({ root: n } as unknown as ReactTestRenderer) === label)[0];

async function render(raw: { name: string; qty?: number | string; unit?: string; slot?: string }[], handlers: Partial<Parameters<typeof ConfirmList>[0]> = {}) {
  const items = toConfirmItems(
    resolveItems(raw.map((i) => ({ name: i.name, qty: i.qty ?? null, unit: i.unit ?? '', slot: i.slot ?? '' })), index, units),
    'lunch', DEFAULT_SLOTS.map((s) => s.id),
  );
  let r!: ReactTestRenderer;
  await act(async () => {
    r = create(
      <ConfirmList items={items} foods={foods} slots={DEFAULT_SLOTS} onChange={() => {}} onRemove={() => {}} onPickFood={() => {}} onSwitchFood={() => {}} {...handlers} />,
    );
  });
  mounted.push(r);
  return r;
}

describe('ConfirmList', () => {
  it('shows the matched food, what was said, the amount and numbers from the food table', async () => {
    const r = await render([{ name: 'samosa', qty: 2 }]);
    const t = texts(r);
    expect(t).toContain('samosa');
    expect(t).toContain('You said “samosa”');
    expect(t).toContain('419 kcal · 7.5 g protein (160 g)'); // 2 x 80 g at 262 kcal and 4.7 g protein per 100 g
  });

  it('highlights a typo match so the user checks it (panner -> paneer)', async () => {
    const r = await render([{ name: 'panner paratha', qty: 2 }]);
    expect(texts(r)).toContain('Check this match');
    expect(texts(r)).toContain('paneer paratha');
  });

  it('does not highlight exact matches', async () => {
    expect(texts(await render([{ name: 'dahi' }]))).not.toContain('Check this match');
  });

  it('shows Not found with a Pick food button, and the food search opens for that item', async () => {
    const picked: string[] = [];
    const r = await render([{ name: 'xylophone steak' }], { onPickFood: (k) => picked.push(k) });
    const t = texts(r);
    expect(t).toContain('Not found');
    expect(t).toContain("won't be logged until");
    await act(async () => press(r, 'button', 'Pick food').props.onPress());
    expect(picked).toEqual(['item-0']);
    expect(t).not.toContain('How much?');
  });

  it('lets the user change the amount, unit and meal, and remove an item', async () => {
    const calls: string[] = [];
    const r = await render([{ name: 'samosa', qty: 2 }], {
      onChange: (k, p) => calls.push(`${k} ${JSON.stringify(p)}`),
      onRemove: (k) => calls.push(`remove ${k}`),
    });
    const qty = r.root.findAll((n) => n.props.accessibilityLabel === 'Quantity of samosa')[0];
    await act(async () => qty.props.onChangeText('1'));
    await act(async () => press(r, 'radio', 'g').props.onPress());
    await act(async () => press(r, 'radio', 'Dinner').props.onPress());
    await act(async () => press(r, 'button', 'Remove samosa').props.onPress());
    expect(calls).toEqual(['item-0 {"qtyText":"1"}', 'item-0 {"unit":"g"}', 'item-0 {"slot":"dinner"}', 'remove item-0']);
  });

  it('offers other foods the name could mean, and switches to one', async () => {
    const switched: string[] = [];
    const r = await render([{ name: 'dal' }], { onSwitchFood: (k, id) => switched.push(`${k} ${id}`) });
    expect(texts(r)).toContain('Or did you mean');
    await act(async () => press(r, 'radio', 'dal makhani').props.onPress());
    expect(switched).toEqual(['item-0 in-dal-makhani']);
  });

  it('shows why an amount cannot be saved', async () => {
    const items = toConfirmItems(resolveItems([{ name: 'roti', qty: 2, unit: '', slot: '' }], index, units), 'lunch', ['lunch']);
    let r!: ReactTestRenderer;
    await act(async () => {
      r = create(<ConfirmList items={[{ ...items[0], qtyText: '0' }]} foods={foods} slots={DEFAULT_SLOTS} onChange={() => {}} onRemove={() => {}} onPickFood={() => {}} onSwitchFood={() => {}} />);
    });
    mounted.push(r);
    expect(texts(r)).toContain('Enter a quantity above zero.');
    expect(texts(r)).toContain('—');
  });

  it('says when a unit was not recognised and the food\'s own unit is used', async () => {
    const r = await render([{ name: 'samosa', qty: 2, unit: 'plate' }]);
    expect(texts(r)).toContain('“plate” isn\'t a unit for this food, so piece is used.');
  });

  it('marks the item\'s chosen meal and uses the slot named in the text', async () => {
    const r = await render([{ name: 'egg', qty: 2, slot: 'breakfast' }]);
    const selected = r.root.findAll((n) => n.props.accessibilityRole === 'radio' && n.props.accessibilityState?.selected === true);
    const labels = selected.map((n) => texts({ root: n } as unknown as ReactTestRenderer));
    expect(labels.some((l) => l === 'Breakfast')).toBe(true); // the meal named in the text
    expect(labels.some((l) => l.startsWith('piece'))).toBe(true); // the food's own unit
    expect(labels.some((l) => l === 'Lunch')).toBe(false);
  });
});
