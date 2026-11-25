# Spec Delta

## Purpose

Sets the daily calorie and protein targets that MacroMend measures every log against, either typed by the user or worked out from their body details and goal.

## ADDED Requirements

### Requirement: Typed targets
The user SHALL be able to type a daily kcal target and a daily protein target in grams directly.

#### Scenario: Typing targets
- **WHEN** the user enters 1800 kcal and 120 g protein and continues
- **THEN** the profile's targets are saved as 1800 kcal and 120 g protein

#### Scenario: Out-of-range values
- **WHEN** the user enters a kcal target below 800 or above 6000, or a protein target below 20 g or above 400 g
- **THEN** the app shows a message and does not let the user continue until the value is in range

### Requirement: Calculated targets
The app SHALL calculate targets from weight (kg), height (cm), age, sex (male or female) and activity level (sedentary, light, moderate, very active, athlete) using the Mifflin-St Jeor equation, an activity factor and the goal, and SHALL show the result for the user to accept or edit.

#### Scenario: Example calculation
- **GIVEN** a 30-year-old male, 75 kg, 175 cm, moderately active, goal maintain
- **WHEN** the app calculates targets
- **THEN** it suggests 2630 kcal (BMR 1698.75 × 1.55 = 2633, rounded to the nearest 10) and 120 g protein (1.6 g/kg, rounded to the nearest 5 g)

#### Scenario: Goal adjustment
- **WHEN** the same person picks cut or bulk instead
- **THEN** kcal is 20% lower for cut (2633 × 0.8 → 2110) or 10% higher for bulk (2633 × 1.1 → 2900), and protein is 2.0 g/kg for cut (150 g) or 1.8 g/kg for bulk (135 g)

### Requirement: Minimum calorie floor
A calculated kcal target SHALL NOT be lower than 1200 kcal; when the calculation falls below that, the app SHALL use 1200 and say so.

#### Scenario: Small person cutting
- **WHEN** the calculation gives less than 1200 kcal
- **THEN** the suggested target is 1200 kcal with a note that it was raised to a safe minimum

### Requirement: Targets editable in Settings
The user SHALL be able to change targets later in Settings, either by typing or by recalculating from updated body details.

#### Scenario: Recalculate after weight change
- **GIVEN** the user calculated targets at 80 kg
- **WHEN** the user updates weight to 76 kg in Settings and taps Recalculate
- **THEN** new targets are shown and saved when accepted
