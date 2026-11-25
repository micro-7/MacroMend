/**
 * Test sentences in English, Hinglish and mixed text. `reply` is what a good model answers (used to test the
 * whole pipeline without a network); `expected` is the final result after matching and quantity words.
 * Units in `expected` are the ones the app will use (the food's own unit when none was written).
 */
export interface ReplyItem {
  name: string;
  qty: number | string;
  unit: string;
  slot: string;
}

export interface ExpectedItem {
  /** Food id in the bundled food table. */
  food: string;
  qty: number;
  unit: string;
  /** Only checked when given. */
  slot?: string;
}

export interface Sentence {
  text: string;
  language: 'english' | 'hinglish' | 'mixed';
  reply: ReplyItem[];
  expected: ExpectedItem[];
}

const r = (name: string, qty: number | string, unit = '', slot = ''): ReplyItem => ({ name, qty, unit, slot });

export const SENTENCES: Sentence[] = [
  { text: 'had 2 roti and dal', language: 'english', reply: [r('roti', 2), r('dal', 1)],
    expected: [{ food: 'in-roti', qty: 2, unit: 'piece' }, { food: 'in-dal', qty: 1, unit: 'katori' }] },
  { text: 'office mein 2 samosa kha liye', language: 'hinglish', reply: [r('samosa', 2)],
    expected: [{ food: 'in-samosa', qty: 2, unit: 'piece' }] },
  { text: 'breakfast mein do anda aur ek katori dahi', language: 'hinglish', reply: [r('egg', 'do', '', 'breakfast'), r('curd', 'ek', 'katori', 'breakfast')],
    expected: [{ food: 'usda-egg', qty: 2, unit: 'piece', slot: 'breakfast' }, { food: 'in-curd', qty: 1, unit: 'katori', slot: 'breakfast' }] },
  { text: '1 scoop whey after gym', language: 'english', reply: [r('whey protein', 1, 'scoop')],
    expected: [{ food: 'in-whey', qty: 1, unit: 'scoop' }] },
  { text: 'dedh katori rajma chawal ke saath', language: 'hinglish', reply: [r('rajma', 'dedh', 'katori'), r('rice', 1)],
    expected: [{ food: 'in-rajma', qty: 1.5, unit: 'katori' }, { food: 'in-rice', qty: 1, unit: 'katori' }] },
  { text: 'dinner: 150 g paneer bhurji aur 2 chapati', language: 'mixed', reply: [r('paneer bhurji', 150, 'g', 'dinner'), r('roti', 2, '', 'dinner')],
    expected: [{ food: 'in-paneer-bhurji', qty: 150, unit: 'g', slot: 'dinner' }, { food: 'in-roti', qty: 2, unit: 'piece', slot: 'dinner' }] },
  { text: 'ate a banana', language: 'english', reply: [r('banana', 1)],
    expected: [{ food: 'usda-banana', qty: 1, unit: 'piece' }] },
  { text: '2 idli with sambar', language: 'english', reply: [r('idli', 2), r('sambar', 1)],
    expected: [{ food: 'in-idli', qty: 2, unit: 'piece' }, { food: 'in-sambar', qty: 1, unit: 'katori' }] },
  { text: 'ek glass chaas pi li', language: 'hinglish', reply: [r('buttermilk', 'ek', 'glass')],
    expected: [{ food: 'in-chaas', qty: 1, unit: 'glass' }] },
  { text: 'teen roti aur ek katori sabzi', language: 'hinglish', reply: [r('roti', 'teen'), r('mixed vegetable curry', 'ek', 'katori')],
    expected: [{ food: 'in-roti', qty: 3, unit: 'piece' }, { food: 'in-mix-veg', qty: 1, unit: 'katori' }] },
  { text: 'lunch mein aadha katori dal aur do roti', language: 'hinglish', reply: [r('dal', 'aadha', 'katori', 'lunch'), r('roti', 'do', '', 'lunch')],
    expected: [{ food: 'in-dal', qty: 0.5, unit: 'katori', slot: 'lunch' }, { food: 'in-roti', qty: 2, unit: 'piece', slot: 'lunch' }] },
  { text: 'two eggs and a glass of milk for breakfast', language: 'english', reply: [r('egg', 2, '', 'breakfast'), r('milk', 1, 'glass', 'breakfast')],
    expected: [{ food: 'usda-egg', qty: 2, unit: 'piece', slot: 'breakfast' }, { food: 'in-milk-toned', qty: 1, unit: 'glass', slot: 'breakfast' }] },
  { text: '50 g oats with 1 banana', language: 'english', reply: [r('oats', 50, 'g'), r('banana', 1)],
    expected: [{ food: 'usda-oats', qty: 50, unit: 'g' }, { food: 'usda-banana', qty: 1, unit: 'piece' }] },
  { text: 'ek plate pav bhaji khayi', language: 'hinglish', reply: [r('pav bhaji', 'ek', 'plate')],
    expected: [{ food: 'in-pav-bhaji', qty: 1, unit: 'plate' }] },
  { text: 'chicken breast 200 g and rice', language: 'english', reply: [r('chicken breast', 200, 'g'), r('rice', 1)],
    expected: [{ food: 'usda-chicken-breast', qty: 200, unit: 'g' }, { food: 'in-rice', qty: 1, unit: 'katori' }] },
  { text: '2 paratha aur dahi', language: 'hinglish', reply: [r('paratha', 2), r('curd', 1)],
    expected: [{ food: 'in-paratha', qty: 2, unit: 'piece' }, { food: 'in-curd', qty: 1, unit: 'katori' }] },
  { text: 'paneer tikka 100 gm', language: 'mixed', reply: [r('paneer tikka', 100, 'gm')],
    expected: [{ food: 'in-paneer-tikka', qty: 100, unit: 'g' }] },
  { text: 'evening snack mein 1 apple aur 10 badam', language: 'hinglish', reply: [r('apple', 1, '', 'snack'), r('almonds', 10, '', 'snack')],
    expected: [{ food: 'usda-apple', qty: 1, unit: 'piece', slot: 'snack' }, { food: 'usda-almonds', qty: 10, unit: 'piece', slot: 'snack' }] },
  { text: 'had a cup of chai with 2 parle-g', language: 'mixed', reply: [r('chai', 1, 'cup'), r('parle-g', 2)],
    expected: [{ food: 'in-chai', qty: 1, unit: 'cup' }, { food: 'in-biscuit-marie', qty: 2, unit: 'piece' }] },
  { text: '1 bowl poha', language: 'english', reply: [r('poha', 1, 'bowl')],
    expected: [{ food: 'in-poha', qty: 1, unit: 'bowl' }] },
  { text: '2 slice bread aur 1 tsp butter', language: 'mixed', reply: [r('bread', 2, 'slice'), r('butter', 1, 'tsp')],
    expected: [{ food: 'usda-bread-white', qty: 2, unit: 'slice' }, { food: 'in-butter', qty: 1, unit: 'tsp' }] },
  { text: 'mutton biryani ek plate', language: 'hinglish', reply: [r('mutton biryani', 'ek', 'plate')],
    expected: [{ food: 'in-biryani-mutton', qty: 1, unit: 'plate' }] },
  { text: 'half bowl curd rice', language: 'english', reply: [r('curd rice', 'half', 'bowl')],
    expected: [{ food: 'in-curd-rice', qty: 0.5, unit: 'bowl' }] },
  { text: 'dal makhani aur 2 naan', language: 'hinglish', reply: [r('dal makhani', 1), r('naan', 2)],
    expected: [{ food: 'in-dal-makhani', qty: 1, unit: 'katori' }, { food: 'in-naan', qty: 2, unit: 'piece' }] },
  { text: '100 g tofu', language: 'english', reply: [r('tofu', 100, 'g')],
    expected: [{ food: 'g-tofu', qty: 100, unit: 'g' }] },
  { text: '2 tbsp peanut butter', language: 'english', reply: [r('peanut butter', 2, 'tbsp')],
    expected: [{ food: 'usda-peanut-butter', qty: 2, unit: 'tbsp' }] },
  { text: 'sawa katori rice', language: 'hinglish', reply: [r('rice', 'sawa', 'katori')],
    expected: [{ food: 'in-rice', qty: 1.25, unit: 'katori' }] },
  { text: 'doodh ka ek glass aur 2 rusk', language: 'hinglish', reply: [r('milk', 'ek', 'glass'), r('rusk', 2)],
    expected: [{ food: 'in-milk-toned', qty: 1, unit: 'glass' }, { food: 'in-rusk', qty: 2, unit: 'piece' }] },
  { text: 'protein shake after workout', language: 'english', reply: [r('protein shake', 1)],
    expected: [{ food: 'in-protein-shake', qty: 1, unit: 'glass' }] },
  { text: '1 plain dosa aur sambar', language: 'mixed', reply: [r('plain dosa', 1), r('sambar', 1)],
    expected: [{ food: 'in-dosa', qty: 1, unit: 'piece' }, { food: 'in-sambar', qty: 1, unit: 'katori' }] },
];
