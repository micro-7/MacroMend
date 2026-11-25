import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import type { FoodFormParsed } from '../../../lookup/foodForm';
import { fromEstimate } from '../../../lookup/foodForm';
import { FoodForm } from '../FoodForm';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mounted: ReactTestRenderer[] = [];
afterEach(async () => {
  await act(async () => mounted.splice(0).forEach((r) => r.unmount()));
});

const texts = (r: ReactTestRenderer) =>
  r.root.findAll((n) => (n.type as unknown as string) === 'Text')
    .map((n) => [n.props.children].flat(5).filter((c: unknown) => typeof c === 'string' || typeof c === 'number').join(''))
    .join(' | ');
const field = (r: ReactTestRenderer, label: string) => r.root.findAll((n) => (n.type as unknown as string) === 'TextInput' && n.props.accessibilityLabel === label)[0];
const button = (r: ReactTestRenderer, label: string) => r.root.findAll((n) => n.props.accessibilityRole === 'button' && texts({ root: n } as unknown as ReactTestRenderer) === label)[0];

const estimate = fromEstimate({ name: 'Dhaba butter chicken', kcalPer100g: 170, proteinPer100g: 12, unit: 'plate', gramsPerUnit: 300, category: 'non-veg' });

async function render(props: Partial<Parameters<typeof FoodForm>[0]> = {}) {
  const submitted: { food: FoodFormParsed; checked: boolean }[] = [];
  let r!: ReactTestRenderer;
  await act(async () => {
    r = create(<FoodForm initial={estimate} submitLabel="Save" onSubmit={(food, checked) => submitted.push({ food, checked })} {...props} />);
  });
  mounted.push(r);
  return { r, submitted };
}

describe('FoodForm', () => {
  it('shows the banner and the starting values, and submits them parsed', async () => {
    const { r, submitted } = await render({ banner: 'Estimated by AI — check before saving' });
    expect(texts(r)).toContain('Estimated by AI — check before saving');
    expect(field(r, 'Weight of one unit').props.value).toBe('300');
    await act(async () => button(r, 'Save').props.onPress());
    expect(submitted).toEqual([{ checked: false, food: { name: 'Dhaba butter chicken', category: 'non-veg', unit: 'plate', gramsPerUnit: 300, kcalPer100g: 170, proteinPer100g: 12 } }]);
  });

  it('shows what is wrong and does not submit', async () => {
    const { r, submitted } = await render();
    await act(async () => field(r, 'Calories per 100 g').props.onChangeText('50'));
    await act(async () => field(r, 'Protein per 100 g').props.onChangeText('40'));
    await act(async () => button(r, 'Save').props.onPress());
    expect(texts(r)).toMatch(/doesn't fit/);
    expect(submitted).toEqual([]);
  });

  it('hides the weight box for grams and shows it for other units', async () => {
    const { r } = await render();
    await act(async () => field(r, 'Unit').props.onChangeText('g'));
    expect(field(r, 'Weight of one unit')).toBeUndefined();
    await act(async () => field(r, 'Unit').props.onChangeText('katori'));
    expect(field(r, 'Weight of one unit')).toBeDefined();
  });

  it('has a "Values checked" switch only when asked, and passes it on', async () => {
    const without = await render();
    expect(texts(without.r)).not.toContain('Values checked');
    const { r, submitted } = await render({ showChecked: true });
    expect(texts(r)).toContain('Values checked');
    const sw = r.root.findAll((n) => n.props.accessibilityLabel === 'Values checked' && typeof n.props.onValueChange === 'function')[0];
    await act(async () => sw.props.onValueChange(true));
    await act(async () => button(r, 'Save').props.onPress());
    expect(submitted[0].checked).toBe(true);
  });

  it('shows Cancel and Delete only when given, and a save error from outside', async () => {
    const calls: string[] = [];
    const { r } = await render({ onCancel: () => calls.push('cancel'), onDelete: () => calls.push('delete'), error: 'Something went wrong' });
    expect(texts(r)).toContain('Something went wrong');
    await act(async () => button(r, 'Cancel').props.onPress());
    await act(async () => button(r, 'Delete this food').props.onPress());
    expect(calls).toEqual(['cancel', 'delete']);
    const plain = await render();
    expect(texts(plain.r)).not.toContain('Delete this food');
    expect(texts(plain.r)).not.toContain('Cancel');
  });
});
