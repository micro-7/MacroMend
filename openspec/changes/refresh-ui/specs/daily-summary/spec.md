# Spec Delta

## ADDED Requirements

### Requirement: Greeting
The top of the Today screen SHALL greet the user for the time of day ("Good morning" before 12:00, "Good afternoon" before 17:00, "Good evening" otherwise), followed by the user's name when one is set.

#### Scenario: Greeting with and without a name
- **GIVEN** the time is 19:30
- **WHEN** Today is shown with the name "Mihir" set, and again with no name
- **THEN** it greets "Good evening, Mihir", and then "Good evening"

### Requirement: Hero card with Fix my day
Below the greeting, Today SHALL show a hero card asking "Not sure what to eat next?" with a Fix my day button that opens the Fix my day screen.

#### Scenario: Hero card opens Fix my day
- **WHEN** the user taps Fix my day on the hero card
- **THEN** the Fix my day screen opens

### Requirement: Meals logged ring
Next to the calorie and protein rings, Today SHALL show a ring for meals logged: the number of meal slots with at least one entry today out of all meal slots.

#### Scenario: Two of five meals
- **GIVEN** five meal slots and entries in Breakfast and Lunch
- **WHEN** Today is shown
- **THEN** the meals ring shows 2 of 5

## MODIFIED Requirements

### Requirement: What's left card
The Today screen SHALL show progress rings for calories left and protein left, each with remaining amount, eaten and target values for today (target minus everything logged today), updated immediately after every log, edit or delete.

#### Scenario: After a log
- **GIVEN** targets of 1800 kcal and 120 g protein and nothing logged
- **WHEN** the user logs 2 roti (240 kcal, 7.2 g protein)
- **THEN** Today shows 1560 kcal and 112.8 g protein left

### Requirement: Over-target warnings
When today's kcal exceeds the kcal target, Today SHALL show a warning with how much it is over and the calorie ring SHALL change to a warning colour. When today's protein reaches the protein target, Today SHALL show that the protein target is met, with remaining protein shown as 0 and the protein ring full.

#### Scenario: Over calories
- **WHEN** today's logged kcal is 1950 with a 1800 target
- **THEN** Today shows a warning "150 kcal over target", 0 kcal left and the calorie ring in the warning colour

#### Scenario: Protein met
- **WHEN** today's logged protein is 125 g with a 120 g target
- **THEN** Today shows protein target met and a full protein ring

### Requirement: Today's entries by slot
Below the rings, the Today screen SHALL show one card per meal slot in the user's order, each with the slot's icon, name and totals, and its entries with food, quantity, unit, kcal and protein. Entries whose slot no longer exists SHALL appear under "Other". Tapping an entry SHALL open it for editing.

#### Scenario: Grouped list
- **GIVEN** entries logged to Breakfast and Dinner
- **WHEN** the Today screen is shown
- **THEN** entries appear on the Breakfast and Dinner cards, and the Lunch and Snack cards show they are empty
