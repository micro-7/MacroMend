# daily-summary Specification

## Purpose

Shows at a glance how much of today's calories and protein is left, so the user always knows where their day stands after each log.

## Requirements

### Requirement: What's left card
The Today screen SHALL show one card with remaining kcal and remaining protein for today (target minus everything logged today), plus eaten and target values, updated immediately after every log, edit or delete.

#### Scenario: After a log
- **GIVEN** targets of 1800 kcal and 120 g protein and nothing logged
- **WHEN** the user logs 2 roti (240 kcal, 7.2 g protein)
- **THEN** the card shows 1560 kcal and 112.8 g protein left

### Requirement: Over-target warnings
When today's kcal exceeds the kcal target, the card SHALL show a warning with how much it is over. When today's protein reaches the protein target, the card SHALL show that the protein target is met, with remaining protein shown as 0.

#### Scenario: Over calories
- **WHEN** today's logged kcal is 1950 with a 1800 target
- **THEN** the card shows a warning "150 kcal over target" and 0 kcal left

#### Scenario: Protein met
- **WHEN** today's logged protein is 125 g with a 120 g target
- **THEN** the card shows protein target met

### Requirement: Today's entries by slot
Below the card, the Today screen SHALL list today's entries grouped under the user's meal slots in their order, showing each entry's food, quantity, unit, kcal and protein, and each slot's totals. Entries whose slot no longer exists SHALL appear under "Other".

#### Scenario: Grouped list
- **GIVEN** entries logged to Breakfast and Dinner
- **WHEN** the Today screen is shown
- **THEN** entries appear under Breakfast and Dinner, and Lunch and Snack show as empty

### Requirement: Day starts at local midnight
Today's totals SHALL include only entries dated with the phone's current local date, so the card resets after local midnight.

#### Scenario: Next morning
- **GIVEN** entries were logged yesterday
- **WHEN** the user opens the app after midnight
- **THEN** the card shows the full targets left and yesterday's entries are not listed
