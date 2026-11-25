# Spec Delta

## MODIFIED Requirements

### Requirement: Onboarding steps and order
Onboarding SHALL ask, in order, for goal (with an optional "What should we call you?" name field on the same step), daily targets, diet type, meal slots and usual foods, with Back available on every step after the first. Leaving the name empty SHALL NOT block continuing.

#### Scenario: Going back keeps answers
- **GIVEN** the user has entered a name, chosen a goal and moved to the targets step
- **WHEN** the user taps Back
- **THEN** the goal step is shown with the earlier name and choice still there

#### Scenario: Skipping the name
- **WHEN** the user leaves the name empty, picks a goal and taps Next
- **THEN** the targets step is shown
