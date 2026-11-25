# food-catalog Specification

## Purpose

Provides the trusted food table that supplies every calorie and protein number in MacroMend, with Indian vegetarian staples as the best-covered core and common global foods alongside.

## Requirements

### Requirement: Bundled food table available offline
The app SHALL ship with a built-in food table of at least 150 Indian staples and at least 150 common global foods, available on first launch without a network connection.

#### Scenario: Staples present offline
- **WHEN** the app is opened for the first time with no network
- **THEN** foods such as paneer, dal, roti, curd, rice, whey protein, eggs, chicken breast and oats are present in the food table

### Requirement: Food record fields
Every food SHALL have a name, zero or more aliases, a diet category (veg, egg, non-veg or vegan), a default unit with its weight in grams, kcal per 100 g, protein grams per 100 g, and a source (built-in, usda, openfoodfacts, user or ai-estimated).

#### Scenario: A complete record
- **WHEN** any food in the table is read
- **THEN** it has all the fields above, with kcal and protein values that are zero or positive

#### Scenario: Category values
- **WHEN** foods are read
- **THEN** paneer and curd are veg, eggs are egg, chicken is non-veg, and tofu is vegan

### Requirement: Aliases in English and Hindi/Hinglish
Foods SHALL carry common English and Hindi/Hinglish names as aliases so either name finds the same food.

#### Scenario: Hindi alias
- **WHEN** the food table is searched for the exact name "dahi"
- **THEN** the curd entry is returned

#### Scenario: Regional English alias
- **WHEN** the food table is searched for the exact name "chapati"
- **THEN** the roti entry is returned

### Requirement: Exact name lookup ignores case and spacing
Looking up a food by name or alias SHALL ignore letter case and leading, trailing or repeated spaces.

#### Scenario: Mixed case
- **WHEN** the food table is searched for " Paneer  "
- **THEN** the paneer entry is returned

### Requirement: Catalog updates keep user foods
When a newer app version ships an updated built-in table, the app SHALL update built-in and bundled USDA rows and SHALL NOT change or delete foods whose source is user, openfoodfacts or ai-estimated.

#### Scenario: Update with a user food present
- **GIVEN** the user has a food saved with source user
- **WHEN** an app version with a newer built-in table starts
- **THEN** built-in foods reflect the new values and the user's food is unchanged
