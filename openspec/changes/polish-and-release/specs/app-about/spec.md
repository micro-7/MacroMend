# Spec Delta

## Purpose

Tells users plainly what MacroMend does with their data and where its food numbers come from, and lets them wipe everything the app has stored.

## ADDED Requirements

### Requirement: About screen
Settings SHALL include an About screen showing the app name, version and build number, and a link to the privacy policy.

#### Scenario: Opening About
- **WHEN** the user opens Settings → About
- **THEN** the app name, version, build number and a privacy policy link are shown

### Requirement: Privacy summary
The About screen SHALL state that all data is stored only on the phone, that typed text is sent only to the cloud AI providers the user added (and not when "Always use phone model" is on), and that only food names are sent for online food lookups.

#### Scenario: Privacy text
- **WHEN** the user reads the About screen
- **THEN** it lists exactly what leaves the phone: typed text to the user's AI providers, food names to USDA and Open Food Facts, and nothing else

### Requirement: Data source attribution
The About screen SHALL credit USDA FoodData Central, Open Food Facts (with the ODbL licence) and the sources of the built-in Indian food table, and SHALL list open-source licences of bundled libraries.

#### Scenario: Attribution shown
- **WHEN** the user opens Data sources on the About screen
- **THEN** USDA FoodData Central, Open Food Facts (ODbL) and the Indian table sources are listed

### Requirement: Delete all my data
Settings SHALL offer "Delete all my data", which after a confirmation SHALL delete the profile, logs, staples, saved foods, settings, stored API keys and any downloaded phone model, keep the built-in food table, and return the app to onboarding.

#### Scenario: Wiping data
- **WHEN** the user taps "Delete all my data" and confirms
- **THEN** all personal data and keys are removed and onboarding starts

#### Scenario: Cancelling
- **WHEN** the user taps "Delete all my data" and then Cancel
- **THEN** nothing is deleted
