import { useState } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { DEFAULT_SLOTS, type Slot } from '../../../core/slots';
import { EMPTY_TARGETS_DRAFT, resolveTargets, type TargetsDraft } from '../../../core/targetsDraft';
import { DbProvider } from '../../../db/DbContext';
import { seedCatalog } from '../../../db/foods';
import { migrate } from '../../../db/migrations';
import { createTestDb } from '../../../db/testDb';
import type { StapleDraft } from '../../../onboarding/buildProfile';
import { SlotsEditor } from '../SlotsEditor';
import { StaplesPicker } from '../StaplesPicker';
import { TargetsForm } from '../TargetsForm';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const texts = (r: ReactTestRenderer): string =>
  r.root
    .findAll((n) => (n.type as unknown as string) === 'Text')
    .map((n) => [n.props.children].flat(5).filter((c: unknown) => typeof c === 'string' || typeof c === 'number').join(''))
    .join(' | ');

const inputs = (r: ReactTestRenderer): ReactTestInstance[] =>
  r.root.findAll((n) => (n.type as unknown as string) === 'TextInput');

const mounted: ReactTestRenderer[] = [];

async function render(el: React.ReactElement): Promise<ReactTestRenderer> {
  let r!: ReactTestRenderer;
  await act(async () => {
    r = create(el);
  });
  mounted.push(r);
  return r;
}

afterEach(async () => {
  // Unmount so list timers do not keep running after the test ends.
  await act(async () => {
    mounted.splice(0).forEach((r) => r.unmount());
  });
});

describe('SlotsEditor', () => {
  function Harness({ onSlots }: { onSlots: (s: Slot[]) => void }) {
    const [slots, setSlots] = useState(DEFAULT_SLOTS);
    return (
      <SlotsEditor
        slots={slots}
        onChange={(s) => {
          setSlots(s);
          onSlots(s);
        }}
      />
    );
  }

  it('refuses renaming Snack to "lunch" and shows why', async () => {
    const seen: Slot[][] = [];
    const r = await render(<Harness onSlots={(s) => seen.push(s)} />);
    const snack = inputs(r).find((i) => i.props.value === 'Snack')!;
    await act(async () => {
      snack.props.onChangeText('lunch');
    });
    await act(async () => {
      inputs(r).find((i) => i.props.value === 'lunch' && i.props.accessibilityLabel === 'Meal 3 name')!.props.onEndEditing();
    });
    expect(texts(r)).toMatch(/already used/);
    expect(seen).toHaveLength(0);
    expect(inputs(r).some((i) => i.props.value === 'Snack')).toBe(true);
  });

  it('adds a Pre-workout meal', async () => {
    const seen: Slot[][] = [];
    const r = await render(<Harness onSlots={(s) => seen.push(s)} />);
    const addBox = inputs(r).find((i) => i.props.placeholder === 'e.g. Pre-workout')!;
    await act(async () => {
      addBox.props.onChangeText('Pre-workout');
    });
    const add = r.root.findAll((n) => n.props.accessibilityRole === 'button').find((n) => texts({ root: n } as unknown as ReactTestRenderer).includes('Add meal'))!;
    await act(async () => {
      add.props.onPress();
    });
    expect(seen.at(-1)?.map((s) => s.name)).toEqual(['Breakfast', 'Lunch', 'Snack', 'Dinner', 'Pre-workout']);
  });
});

describe('TargetsForm', () => {
  it('shows the suggested numbers for the spec example', async () => {
    const draft: TargetsDraft = { ...EMPTY_TARGETS_DRAFT, weightKg: '75', heightCm: '175', age: '30', sex: 'male', activity: 'moderate' };
    const r = await render(
      <TargetsForm goal="cut" value={draft} onChange={() => {}} result={resolveTargets(draft, 'cut')} showErrors={false} />,
    );
    expect(texts(r)).toContain('2110 kcal · 150 g protein');
  });

  it('shows range errors only after the user tried to continue', async () => {
    const draft: TargetsDraft = { ...EMPTY_TARGETS_DRAFT, mode: 'type', kcal: '500', protein: '120' };
    const result = resolveTargets(draft, 'cut');
    const before = await render(<TargetsForm goal="cut" value={draft} onChange={() => {}} result={result} showErrors={false} />);
    expect(texts(before)).not.toMatch(/between 800/);
    const after = await render(<TargetsForm goal="cut" value={draft} onChange={() => {}} result={result} showErrors />);
    expect(texts(after)).toMatch(/between 800 and 6000/);
  });
});

describe('StaplesPicker', () => {
  async function setup(dietType: 'veg' | 'non-veg') {
    const db = createTestDb();
    await migrate(db);
    await seedCatalog(db);
    const changes: StapleDraft[][] = [];
    function Harness() {
      const [selected, setSelected] = useState<StapleDraft[]>([]);
      return (
        <DbProvider value={db}>
          <StaplesPicker
            dietType={dietType}
            selected={selected}
            onChange={(s) => {
              setSelected(s);
              changes.push(s);
            }}
          />
        </DbProvider>
      );
    }
    const r = await render(<Harness />);
    return { r, changes };
  }

  it('shows quick picks and a warning when nothing is ticked', async () => {
    const { r } = await setup('veg');
    const t = texts(r);
    expect(t).toContain('paneer');
    expect(t).toContain('whey protein');
    expect(t).toMatch(/needs at least one protein food/);
  });

  it('finds curd for "dahi", hides chicken for a vegetarian, and ticks foods with usual quantities', async () => {
    const { r, changes } = await setup('veg');
    const search = inputs(r).find((i) => i.props.accessibilityLabel === 'Search foods')!;
    await act(async () => {
      search.props.onChangeText('dahi');
    });
    expect(texts(r)).toContain('curd');
    await act(async () => {
      search.props.onChangeText('chicken');
    });
    expect(texts(r)).not.toContain('chicken breast');
    expect(texts(r)).toContain('No foods found');

    // Tick roti and paneer from quick picks; roti starts at 1 piece, paneer at 100 g.
    const tick = async (name: string) => {
      const chip = r.root.findAll((n) => n.props.accessibilityRole === 'checkbox' && texts({ root: n } as unknown as ReactTestRenderer).trim() === name)[0];
      await act(async () => {
        chip.props.onPress();
      });
    };
    await tick('roti');
    await tick('paneer');
    expect(changes.at(-1)?.map((s) => [s.food.name, s.qty])).toEqual([['roti', '1'], ['paneer', '100']]);

    // Setting roti to 3 updates the draft.
    const roti = inputs(r).find((i) => i.props.accessibilityLabel === 'Usual quantity of roti')!;
    await act(async () => {
      roti.props.onChangeText('3');
    });
    expect(changes.at(-1)?.find((s) => s.food.name === 'roti')?.qty).toBe('3');
  });

  it('lists chicken once "Show all foods" is on', async () => {
    const { r } = await setup('veg');
    const search = inputs(r).find((i) => i.props.accessibilityLabel === 'Search foods')!;
    await act(async () => {
      search.props.onChangeText('chicken');
    });
    const sw = r.root.findAll((n) => (n.type as unknown as { displayName?: string }).displayName === 'Switch' || typeof n.props.onValueChange === 'function')[0];
    await act(async () => {
      sw.props.onValueChange(true);
    });
    expect(texts(r)).toContain('chicken breast');
  });
});
