# Spec Delta

## ADDED Requirements

### Requirement: Phone model offer in AI setup
On supported phones, the onboarding AI setup step SHALL offer to download the phone model, either now on Wi-Fi or later from Settings, without blocking completion of onboarding.

#### Scenario: Start download and finish onboarding
- **WHEN** the user taps "Download phone model" on Wi-Fi and then Finish
- **THEN** onboarding completes and the download continues with progress shown in Settings → Phone model

#### Scenario: Unsupported phone
- **GIVEN** a phone below the RAM threshold
- **WHEN** the AI setup step is shown
- **THEN** no phone model option appears
