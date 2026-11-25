# Spec Delta

## ADDED Requirements

### Requirement: Phone model as fallback
When a downloaded phone model is available, the parsing chain SHALL use it after cloud providers: when no cloud provider is set up or enabled, when every cloud provider fails or is skipped, when the phone is offline, or when cloud attempts time out.

#### Scenario: Offline with phone model
- **GIVEN** a Groq key and a downloaded phone model
- **WHEN** the user logs text in airplane mode
- **THEN** the phone model parses it without trying Groq

#### Scenario: No phone model
- **GIVEN** no phone model and every cloud provider fails
- **WHEN** the user logs text
- **THEN** the app falls back to manual pick

### Requirement: Daily switch to phone model
When every enabled cloud provider is out of quota for the day, the app SHALL use the phone model for the rest of the local day without trying cloud providers, and SHALL try cloud providers again on the next local day.

#### Scenario: All keys exhausted
- **GIVEN** both cloud providers report daily quota exhausted
- **WHEN** the user logs more text that day
- **THEN** the phone model is used directly and Settings shows "Using phone model until tomorrow"

### Requirement: Always use phone model
Settings SHALL offer "Always use phone model"; while it is on, no text SHALL be sent to cloud providers for parsing or estimates, and if the model is not downloaded the app SHALL use manual pick and say so.

#### Scenario: Privacy switch on
- **GIVEN** "Always use phone model" is on and cloud keys exist
- **WHEN** the user logs text while online
- **THEN** only the phone model is used and no request goes to any cloud provider

### Requirement: Show which model was used
The confirm list SHALL show which provider or the phone model understood the text.

#### Scenario: Label
- **WHEN** the phone model parsed the text
- **THEN** the confirm list shows "Understood by: Phone model"
