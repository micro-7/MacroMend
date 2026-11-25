# Spec Delta

## Purpose

Turns the portions people actually use, such as pieces, scoops, katoris and grams, into grams and then into calories and protein from the food table.

## ADDED Requirements

### Requirement: Units available for a food
For each food the user SHALL be able to choose its own default unit (for example piece, scoop, slice), grams, and the household measures katori, bowl, cup, glass, tbsp and tsp.

#### Scenario: Units for roti
- **WHEN** the user opens the unit picker for roti
- **THEN** piece, g, katori, bowl, cup, glass, tbsp and tsp are offered, with piece selected

### Requirement: Convert to grams
The app SHALL convert quantity and unit to grams: default unit × the food's grams per unit; g and ml × 1; katori 150 g; bowl 250 g; cup 240 g; glass 250 g; tbsp 15 g; tsp 5 g.

#### Scenario: Two roti
- **GIVEN** roti weighs 40 g per piece
- **WHEN** 2 piece is converted
- **THEN** the result is 80 g

#### Scenario: One katori dal
- **WHEN** 1 katori of dal is converted
- **THEN** the result is 150 g

### Requirement: Grams to kcal and protein
The app SHALL compute kcal as grams × kcal per 100 g ÷ 100 and protein as grams × protein per 100 g ÷ 100, displaying kcal rounded to whole numbers and protein to one decimal place.

#### Scenario: 150 g paneer
- **GIVEN** paneer has 265 kcal and 18.3 g protein per 100 g
- **WHEN** 150 g is converted
- **THEN** the result shows 398 kcal and 27.5 g protein

### Requirement: Valid quantities
Quantities SHALL be greater than 0, allow fractions such as 0.5 and 1.5, and SHALL NOT exceed 50 units or 5000 g; invalid values SHALL block saving with a message.

#### Scenario: Zero quantity
- **WHEN** the user enters 0
- **THEN** Save is disabled and a message asks for a quantity above zero

#### Scenario: Half portion
- **WHEN** the user enters 0.5 scoop of whey
- **THEN** half the scoop's grams, kcal and protein are shown
