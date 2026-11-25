# Spec Delta

## Purpose

Defines the meals a user's day is split into, so logs land in the right meal and remaining targets can be spread across the meals still to come.

## ADDED Requirements

### Requirement: Default slots
A new profile SHALL start with four meal slots in this order: Breakfast, Lunch, Snack, Dinner.

#### Scenario: Defaults shown
- **WHEN** the user reaches the meal-slots step for the first time
- **THEN** Breakfast, Lunch, Snack and Dinner are listed in that order

### Requirement: Editing slots
The user SHALL be able to rename, add, remove and reorder slots, during onboarding and later in Settings. Slot names SHALL be unique (ignoring case) and non-empty, and there SHALL be between 1 and 8 slots.

#### Scenario: Adding a pre-workout slot
- **WHEN** the user adds a slot named "Pre-workout" and moves it above Dinner
- **THEN** the slot list is Breakfast, Lunch, Snack, Pre-workout, Dinner

#### Scenario: Duplicate name rejected
- **WHEN** the user renames Snack to "lunch"
- **THEN** the app shows that the name is already used and keeps "Snack"

#### Scenario: Last slot cannot be removed
- **GIVEN** only one slot is left
- **WHEN** the user tries to remove it
- **THEN** the app does not remove it and explains that at least one slot is needed

### Requirement: Slot identity survives renaming
Renaming a slot SHALL keep it the same slot, so entries already logged to it stay attached to it under the new name.

#### Scenario: Rename keeps identity
- **GIVEN** a slot called "Snack"
- **WHEN** the user renames it to "Evening snack"
- **THEN** the slot keeps its internal identity and only its displayed name changes
