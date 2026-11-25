import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { DEFAULT_SLOTS } from '../../core/slots';
import { summarize } from '../../core/summary';
import { ProgressRing } from '../components';
import { WhatsLeftCard } from '../WhatsLeftCard';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const targets = { kcal: 1800, proteinG: 120 };

async function textOf(eaten: { kcal: number; proteinG: number }[]): Promise<string> {
  const logs = eaten.map((e) => ({ slot: 'lunch', ...e }));
  let r!: ReactTestRenderer;
  await act(async () => {
    r = create(<WhatsLeftCard summary={summarize(logs, targets, DEFAULT_SLOTS)} targets={targets} />);
  });
  const out = r.root
    .findAll((n) => (n.type as unknown as string) === 'Text')
    .map((n) => [n.props.children].flat(5).filter((c: unknown) => typeof c === 'string' || typeof c === 'number').join(''))
    .join(' | ');
  r.unmount();
  return out;
}

describe('WhatsLeftCard', () => {
  it('shows the full targets before anything is logged', async () => {
    const t = await textOf([]);
    expect(t).toContain('1800 | kcal left');
    expect(t).toContain('120.0 | g protein left');
    expect(t).not.toMatch(/over target|target met/);
  });

  it('shows what is left after a log', async () => {
    const t = await textOf([{ kcal: 240, proteinG: 7.2 }]);
    expect(t).toContain('1560 | kcal left');
    expect(t).toContain('112.8 | g protein left');
    expect(t).toContain('Eaten 240 of 1800 kcal · 7.2 of 120 g protein');
  });

  it('warns when calories are over target and shows 0 left', async () => {
    const t = await textOf([{ kcal: 1950, proteinG: 60 }]);
    expect(t).toContain('150 kcal over target');
    expect(t).toContain('0 | kcal left');
  });

  it('shows protein target met', async () => {
    const t = await textOf([{ kcal: 800, proteinG: 125 }]);
    expect(t).toContain('Protein target met');
    expect(t).toContain('0.0 | g protein left');
  });

  it('shows how many meals have something logged', async () => {
    const t = await textOf([{ kcal: 300, proteinG: 10 }]);
    expect(t).toContain('1 of 4 | meals logged');
  });

  it('draws the calorie ring in the warning colour when over target, and full', async () => {
    let r!: ReactTestRenderer;
    await act(async () => {
      r = create(<WhatsLeftCard summary={summarize([{ slot: 'lunch', kcal: 1950, proteinG: 60 }], targets, DEFAULT_SLOTS)} targets={targets} />);
    });
    const calories = r.root.findAllByType(ProgressRing).find((n) => n.props.label === 'Calories eaten')!;
    expect(calories.props.value).toBeGreaterThan(1);
    expect(calories.props.color).toBe('#F0A64A');
    r.unmount();
  });
});
