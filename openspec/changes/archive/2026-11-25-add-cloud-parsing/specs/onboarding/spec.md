# Spec Delta

## ADDED Requirements

### Requirement: Optional AI setup step
Onboarding SHALL end with an optional AI setup step where the user can add one or more cloud provider keys and test them, or skip to log manually; skipping SHALL still complete onboarding.

#### Scenario: Skipping AI setup
- **WHEN** the user taps "Skip, I'll log manually" on the AI setup step
- **THEN** onboarding completes and the Today tab is shown

#### Scenario: Adding a key during onboarding
- **WHEN** the user adds a Gemini key on the AI setup step and finishes
- **THEN** the provider appears in Settings → AI providers
