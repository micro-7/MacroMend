# Spec Delta

## Purpose

Records the foods a user normally eats and how much, so MacroMend's suggestions come from the user's own food rather than generic meal plans.

## ADDED Requirements

### Requirement: Staples picker
The user SHALL be able to tick usual foods from the food table, searching by name or alias, during onboarding and later in Settings.

#### Scenario: Ticking staples
- **WHEN** the user searches "dahi", ticks curd, and ticks paneer, roti and whey
- **THEN** those four foods are saved as staples

### Requirement: Picker filtered by diet type by default
The staples picker SHALL show only foods allowed by the user's diet type by default, with a "Show all foods" switch that lists every food.

#### Scenario: Vegetarian default list
- **GIVEN** the user's diet type is vegetarian
- **WHEN** the staples picker opens
- **THEN** chicken and eggs are not listed until "Show all foods" is turned on

### Requirement: Suggested common staples
The picker SHALL show a short list of popular staples for the user's diet type at the top (for example paneer, dal, roti, curd, whey for vegetarians) so most users can finish by tapping.

#### Scenario: Quick picks
- **WHEN** a vegetarian user opens the picker
- **THEN** a quick-pick row including paneer, dal, roti, curd and whey is shown

### Requirement: Usual quantity
Each staple SHALL have a usual quantity in the food's default unit, defaulting to one unit (for example 1 roti, 1 scoop whey, 100 g paneer), editable by the user.

#### Scenario: Editing usual quantity
- **WHEN** the user sets roti's usual quantity to 3
- **THEN** the staple is saved as 3 roti

### Requirement: Staples optional but warned
The user SHALL be able to finish onboarding with no staples, and the app SHALL warn that "Fix my day" needs at least one protein food and one carb food among staples.

#### Scenario: Skipping staples
- **WHEN** the user finishes the staples step with nothing ticked
- **THEN** onboarding completes with a note that suggestions need staples, which can be added in Settings
