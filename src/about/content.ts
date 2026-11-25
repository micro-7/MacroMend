/**
 * What the About screen says. docs/play-store-listing.md (data safety) and docs/privacy-policy.md must say the
 * same things, so change them together.
 */
export const PRIVACY_POLICY_URL = 'https://micro-7.github.io/MacroMend/privacy-policy';

export const PRIVACY_POINTS: string[] = [
  'Everything you enter (profile, targets, meals, usual foods, saved foods) is stored only on this phone. There is no account and no MacroMend server.',
  'Text you type to log food is sent only to the AI providers you added, using your own key. It is not sent anywhere when "Always use phone model" is on.',
  'When you search for a food online, only the food name is sent, to USDA FoodData Central and Open Food Facts. You can turn this off in Food lookup.',
  'Your API keys are kept in the phone’s secure storage and are only sent to the provider they belong to.',
  'Nothing else leaves the phone: no analytics, no ads and no crash reporting.',
];

export interface DataSource {
  name: string;
  detail: string;
}

export const DATA_SOURCES: DataSource[] = [
  {
    name: 'USDA FoodData Central',
    detail: 'Foundation Foods rows bundled in the food table, and online search. Public domain (CC0 1.0).',
  },
  {
    name: 'Open Food Facts',
    detail: 'Packaged-food search online. Data is available under the Open Database Licence (ODbL); contributors are credited at openfoodfacts.org.',
  },
  {
    name: 'Indian food table',
    detail: 'Typical home-style values for Indian foods, compiled for MacroMend and checked against USDA FoodData Central reference values (no IFCT numbers are used). Dish values vary a lot between recipes.',
  },
];
