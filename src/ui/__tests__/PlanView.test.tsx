import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import type { Plan, PlanReason } from '../../core/rebalance';
import { PlanView } from '../PlanView';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const item = (name: string, role: 'protein' | 'carb', qty: number, unit: string, kcal: number, proteinG: number) => ({
  foodId: `id-${name}`, name, role, qty, unit, grams: 0, kcal, proteinG,
});

const plan = (over: Partial<Plan> = {}): Plan => ({
  slots: [
    { slotId: 'snack', items: [item('whey protein', 'protein', 2, 'scoop', 240, 48), item('roti', 'carb', 1, 'piece', 119, 3.9)], kcal: 359, proteinG: 51.9 },
    { slotId: 'dinner', items: [item('paneer', 'protein', 150, 'g', 398, 27.4)], kcal: 398, proteinG: 27.4 },
  ],
  totalKcal: 757, totalProteinG: 79.3, proteinShortByG: 0, reason: null, ...over,
});

const noop = () => {};
const names = { snack: 'Snack', dinner: 'Dinner' };

async function render(p: Plan, handlers: Partial<Parameters<typeof PlanView>[0]> = {}) {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = create(
      <PlanView
        plan={p} slotNames={names} remaining={{ kcal: 900, proteinG: 70 }}
        onSwap={noop} onLogItem={noop} onLogSlot={noop} onShuffle={noop} onOpenStaples={noop}
        {...handlers}
      />,
    );
  });
  return r;
}

const texts = (r: ReactTestRenderer) =>
  r.root.findAll((n) => (n.type as unknown as string) === 'Text')
    .map((n) => [n.props.children].flat(5).filter((c: unknown) => typeof c === 'string' || typeof c === 'number').join(''))
    .join(' | ');

const button = (r: ReactTestRenderer, label: string): ReactTestInstance =>
  r.root.findAll((n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function')[0];

describe('PlanView', () => {
  it('lists each meal with portions, calories and protein, and the plan total', async () => {
    const t = texts(await render(plan()));
    expect(t).toContain('Snack');
    expect(t).toContain('2 scoop whey protein');
    expect(t).toContain('240 kcal · 48.0 g protein');
    expect(t).toContain('150 g paneer');
    expect(t).toContain('Plan: 757 kcal · 79.3 g protein');
    expect(t).toContain('Left today: 900 kcal · 70.0 g protein');
  });

  it('shows how much protein is still short', async () => {
    expect(texts(await render(plan({ proteinShortByG: 12.4 })))).toContain('Protein still short by 12.4 g');
    expect(texts(await render(plan({ proteinShortByG: 0.2 })))).not.toContain('still short');
  });

  it('calls the right handler for swap, log item, log meal and shuffle', async () => {
    const calls: string[] = [];
    const r = await render(plan(), {
      onSwap: (s, i) => calls.push(`swap ${s} ${i}`),
      onLogItem: (s, it) => calls.push(`item ${s} ${it.name}`),
      onLogSlot: (s) => calls.push(`slot ${s}`),
      onShuffle: () => calls.push('shuffle'),
    });
    await act(async () => button(r, 'Swap roti').props.onPress());
    await act(async () => button(r, 'Log paneer').props.onPress());
    await act(async () => button(r, 'Log Snack').props.onPress());
    await act(async () => r.root.findAll((n) => n.props.accessibilityRole === 'button' && texts({ root: n } as unknown as ReactTestRenderer) === 'Shuffle')[0].props.onPress());
    expect(calls).toEqual(['swap snack 1', 'item dinner paneer', 'slot snack', 'shuffle']);
  });

  it.each<[PlanReason, RegExp]>([
    ['kcal_reached', /reached today's calorie target/],
    ['no_open_slots', /Every meal already has something logged/],
    ['no_protein_staple', /Add a protein food/],
    ['too_few_kcal', /enough calories left/],
  ])('explains "%s" instead of suggesting foods', async (reason, pattern) => {
    const r = await render(plan({ slots: [], reason, totalKcal: 0, totalProteinG: 0 }));
    expect(texts(r)).toMatch(pattern);
    expect(texts(r)).not.toContain('Plan:');
  });

  it('links to usual foods when there is no protein staple, and only then', async () => {
    let opened = 0;
    const r = await render(plan({ slots: [], reason: 'no_protein_staple' }), { onOpenStaples: () => opened++ });
    const go = r.root.findAll((n) => n.props.accessibilityRole === 'button' && texts({ root: n } as unknown as ReactTestRenderer) === 'Go to usual foods')[0];
    await act(async () => go.props.onPress());
    expect(opened).toBe(1);
    const other = await render(plan({ slots: [], reason: 'kcal_reached' }));
    expect(texts(other)).not.toContain('Go to usual foods');
  });
});
