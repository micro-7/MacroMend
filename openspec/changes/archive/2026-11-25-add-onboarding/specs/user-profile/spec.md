# Spec Delta

## Purpose

Holds the user's goal, diet type and body details on the phone, so targets and suggestions can be personalised and changed at any time.

## ADDED Requirements

### Requirement: Goal choice
The user SHALL choose exactly one goal: cut, maintain or bulk.

#### Scenario: Choosing a goal
- **WHEN** the user selects "Cut" on the goal step
- **THEN** the profile's goal is saved as cut

### Requirement: Diet type choice
The user SHALL choose exactly one diet type: vegetarian, eggetarian, non-veg or vegan. The diet type SHALL only limit which foods the app suggests and pre-filters; it SHALL NOT stop the user from logging or ticking any food.

#### Scenario: Diet type saved
- **WHEN** the user selects "Eggetarian"
- **THEN** the profile's diet type is saved as eggetarian

#### Scenario: Diet type does not block foods
- **GIVEN** the user's diet type is vegetarian
- **WHEN** the user searches the staples picker with "Show all foods" turned on
- **THEN** non-veg foods such as chicken are listed and can be ticked

### Requirement: Diet type allows food categories
Each diet type SHALL allow these food categories: vegan → vegan; vegetarian → vegan and veg; eggetarian → vegan, veg and egg; non-veg → all categories.

#### Scenario: Eggetarian allowed foods
- **WHEN** allowed categories are checked for an eggetarian user
- **THEN** paneer and eggs are allowed and chicken is not

### Requirement: Profile editable in Settings
The user SHALL be able to change goal, diet type and body details from Settings at any time, and changes SHALL be saved on the phone immediately.

#### Scenario: Changing diet type later
- **GIVEN** the user is onboarded as vegetarian
- **WHEN** the user changes diet type to non-veg in Settings
- **THEN** the profile shows non-veg after restarting the app
