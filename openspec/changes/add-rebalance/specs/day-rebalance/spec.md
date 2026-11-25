# Spec Delta

## Purpose

Rebuilds the rest of the user's day from their own usual foods after any log, so they can still hit protein and stay within calories without planning meals themselves.

## ADDED Requirements

### Requirement: Fix my day fills open slots
Tapping "Fix my day" SHALL suggest foods for every open slot, where an open slot is a meal slot with no entries logged today.

#### Scenario: Lunch already logged
- **GIVEN** slots Breakfast, Lunch, Snack, Dinner and entries only in Breakfast and Lunch
- **WHEN** the user taps "Fix my day"
- **THEN** suggestions are shown for Snack and Dinner only

### Requirement: Suggestions come only from allowed staples
Suggestions SHALL use only the user's staples whose food category is allowed by the user's diet type.

#### Scenario: Vegetarian with chicken ticked
- **GIVEN** a vegetarian user whose staples include paneer, roti and chicken
- **WHEN** suggestions are made
- **THEN** chicken is never suggested

### Requirement: Protein first, then calories
For each open slot the engine SHALL aim for an equal share of remaining protein using protein staples first, then add carb staples to use that slot's share of remaining kcal, without letting the plan's total kcal exceed remaining kcal.

#### Scenario: Protein-first plan
- **GIVEN** 900 kcal and 70 g protein left, two open slots, staples paneer, whey, roti and rice
- **WHEN** suggestions are made
- **THEN** each slot contains at least one protein staple, the plan's total kcal is at most 900, and total protein is as close to 70 g as whole portions allow

#### Scenario: Calories too tight for full protein
- **GIVEN** 200 kcal and 60 g protein left
- **WHEN** suggestions are made
- **THEN** the plan stays at or under 200 kcal, picks the most protein-dense staples first, and shows how much protein will still be missing

### Requirement: Real portions
Suggested amounts SHALL be whole numbers of the food's unit for piece, scoop and slice foods (minimum 1), multiples of 25 g for gram foods (minimum 50 g), and SHALL NOT exceed twice the staple's usual quantity.

#### Scenario: Whole roti
- **WHEN** a suggestion includes roti
- **THEN** it is a whole number of roti, such as 2, never 1.6

#### Scenario: Paneer in 25 g steps
- **WHEN** a suggestion includes paneer measured in grams
- **THEN** the amount is 50 g, 75 g, 100 g or another multiple of 25 g up to twice the usual quantity

### Requirement: Swap and shuffle
The user SHALL be able to swap any suggested food for another allowed staple of the same kind (protein or carb), with the portion recalculated, and SHALL be able to shuffle to get a different plan.

#### Scenario: Swap paneer for whey
- **WHEN** the user taps swap on a paneer suggestion
- **THEN** it is replaced by another allowed protein staple such as whey with a recalculated portion and updated slot totals

#### Scenario: Shuffle
- **GIVEN** the user has at least two protein staples
- **WHEN** the user taps Shuffle
- **THEN** a different arrangement of staples across slots is shown

### Requirement: Log a suggestion
The user SHALL be able to log a whole suggested slot or a single suggested item in one tap; logged items SHALL be saved exactly like manual logs, and the what's-left card and remaining suggestions SHALL update.

#### Scenario: Log the Snack suggestion
- **WHEN** the user taps "Log" on the Snack suggestion
- **THEN** its items are saved to today's Snack, Snack is no longer open, and the card shows the new remaining values

### Requirement: Nothing to fix
The app SHALL explain instead of suggesting when there is nothing to fill: when today's kcal target is already reached, when no slots are open, or when no allowed protein staple exists.

#### Scenario: Already over calories
- **GIVEN** today's kcal is at or above target
- **WHEN** the user taps "Fix my day"
- **THEN** no foods are suggested and the app says the kcal target is already reached

#### Scenario: No protein staple
- **GIVEN** none of the user's allowed staples is a protein food
- **WHEN** the user taps "Fix my day"
- **THEN** the app asks the user to add a protein food to their usual foods and links to that Settings screen

### Requirement: No AI and works offline
Suggestions SHALL be calculated on the phone from the food table, staples and today's log without any AI model or network.

#### Scenario: Airplane mode
- **WHEN** the user taps "Fix my day" in airplane mode
- **THEN** suggestions appear as normal
