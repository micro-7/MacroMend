# onboarding Specification

## Purpose

Gets a new user from install to a ready-to-use day in about a minute, collecting only what MacroMend needs and asking for no account.

## Requirements

### Requirement: Onboarding on first launch
The app SHALL show onboarding on launch until the user completes it, and SHALL NOT show it again after completion.

#### Scenario: First launch
- **WHEN** the app is opened with no completed profile
- **THEN** the onboarding flow is shown instead of the tabs

#### Scenario: After completion
- **GIVEN** the user has finished onboarding
- **WHEN** the app is opened again
- **THEN** the Today tab is shown directly

### Requirement: Onboarding steps and order
Onboarding SHALL ask, in order, for goal, daily targets, diet type, meal slots and usual foods, with Back available on every step after the first.

#### Scenario: Going back keeps answers
- **GIVEN** the user has chosen a goal and moved to the targets step
- **WHEN** the user taps Back
- **THEN** the goal step is shown with the earlier choice still selected

### Requirement: No account or network needed
Onboarding SHALL complete without sign-in and without a network connection.

#### Scenario: Offline onboarding
- **WHEN** the user completes onboarding in airplane mode
- **THEN** every step works and the profile is saved

### Requirement: Interrupted onboarding resumes
If the app is closed during onboarding, the app SHALL resume onboarding from the first step on next launch and SHALL NOT treat the user as onboarded.

#### Scenario: Closed mid-way
- **GIVEN** the user closed the app on the meal-slots step
- **WHEN** the app is opened again
- **THEN** onboarding is shown again and the Today tab is not reachable until it is completed

### Requirement: Optional AI setup step
Onboarding SHALL end with an optional AI setup step where the user can add one or more cloud provider keys and test them, or skip to log manually; skipping SHALL still complete onboarding.

#### Scenario: Skipping AI setup
- **WHEN** the user taps "Skip, I'll log manually" on the AI setup step
- **THEN** onboarding completes and the Today tab is shown

#### Scenario: Adding a key during onboarding
- **WHEN** the user adds a Gemini key on the AI setup step and finishes
- **THEN** the provider appears in Settings → AI providers

### Requirement: Phone model offer in AI setup
On supported phones, the onboarding AI setup step SHALL offer to download the phone model, either now on Wi-Fi or later from Settings, without blocking completion of onboarding.

#### Scenario: Start download and finish onboarding
- **WHEN** the user taps "Download phone model" on Wi-Fi and then Finish
- **THEN** onboarding completes and the download continues with progress shown in Settings → Phone model

#### Scenario: Unsupported phone
- **GIVEN** a phone below the RAM threshold
- **WHEN** the AI setup step is shown
- **THEN** no phone model option appears
