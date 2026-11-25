# Spec Delta

## ADDED Requirements

### Requirement: Optional display name
The profile SHALL hold an optional display name of up to 30 characters, stored only on the phone and never sent anywhere. An empty or whitespace-only name SHALL be saved as no name.

#### Scenario: Name kept on the phone
- **WHEN** the user saves the name "Mihir"
- **THEN** Today greets "Mihir" after the app is restarted, and no network request is made

#### Scenario: Blank name
- **WHEN** the user clears the name and saves
- **THEN** the profile has no name and Today greets without one

## MODIFIED Requirements

### Requirement: Profile editable in Settings
The user SHALL be able to change name, goal, diet type and body details from Settings at any time, and changes SHALL be saved on the phone immediately.

#### Scenario: Changing diet type later
- **GIVEN** the user is onboarded as vegetarian
- **WHEN** the user changes diet type to non-veg in Settings
- **THEN** the profile shows non-veg after restarting the app

#### Scenario: Changing the name later
- **WHEN** the user changes the name to "Mihir T" in Settings → Profile & targets and saves
- **THEN** Today greets "Mihir T"
