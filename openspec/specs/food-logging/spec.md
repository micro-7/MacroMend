# food-logging Specification

## Purpose

Lets the user record what they ate by picking foods from the food table, with numbers that always come from that table, even with no AI and no network.

## Requirements

### Requirement: Search foods by name or alias
The Log screen SHALL let the user search the food table by any part of a food's name or alias, ignoring case, and show matching foods as they type. Search SHALL list all foods regardless of diet type.

#### Scenario: Hinglish alias search
- **WHEN** the user types "dah"
- **THEN** curd (alias dahi) and dal (alias daal) are among the results

#### Scenario: No results
- **WHEN** the user types a name that matches nothing
- **THEN** the screen shows "No foods found" and no error

### Requirement: Log a picked food
After picking a food, the user SHALL choose a quantity, a unit and a meal slot, SHALL see the resulting kcal and protein before saving, and SHALL be able to save the entry to today's log.

#### Scenario: Logging two roti
- **WHEN** the user picks roti, sets quantity 2, unit piece, slot Lunch and taps Save
- **THEN** an entry for 2 roti is saved under today's Lunch with kcal and protein computed from the food table

### Requirement: Default slot by time of day
The slot picker SHALL preselect a slot based on the current local time for the default slot names (Breakfast before 11:00, Lunch 11:00–15:59, Snack 16:00–18:59, Dinner from 19:00), and the first slot otherwise; the user can change it.

#### Scenario: Afternoon default
- **GIVEN** the user has the default slots and it is 13:30
- **WHEN** the user picks a food
- **THEN** Lunch is preselected

### Requirement: Numbers come from the food table
Each saved entry SHALL store its grams, kcal and protein computed from the food table at the time of saving, so later changes to a food do not change past entries.

#### Scenario: Food edited later
- **GIVEN** an entry for 100 g paneer was saved
- **WHEN** paneer's values in the food table change later
- **THEN** the saved entry keeps its original kcal and protein

### Requirement: Edit and delete entries
The user SHALL be able to change the quantity, unit or slot of a logged entry, or delete it; totals SHALL update immediately.

#### Scenario: Deleting an entry
- **WHEN** the user deletes the 2 roti entry from Lunch
- **THEN** the entry disappears and the what's-left card increases by its kcal and protein

### Requirement: Logging works offline
Searching and logging from the food table SHALL work with no network connection.

#### Scenario: Airplane mode logging
- **WHEN** the user logs a food in airplane mode
- **THEN** the entry is saved and shown without any network error
