# app-shell Specification

## Purpose

Gives MacroMend an installable Android app that opens straight to the user's day, offline and without an account, with navigation between its main screens.

## Requirements

### Requirement: App opens without login or network
The app SHALL open to its main screen on every launch without asking the user to sign in and without needing an internet connection.

#### Scenario: First launch in airplane mode
- **WHEN** the user installs the app and opens it for the first time with no network connection
- **THEN** the app opens past any splash screen to a usable screen with no sign-in prompt and no network error

#### Scenario: Later launch
- **WHEN** the user opens the app again after closing it
- **THEN** the app opens without asking for any account or credentials

### Requirement: Tab navigation
The app SHALL provide three tabs, Today, Log and Settings, and SHALL open on Today by default.

#### Scenario: Switching tabs
- **WHEN** the user taps the Log tab and then the Settings tab
- **THEN** each tab's screen is shown and the selected tab is highlighted

#### Scenario: Default tab
- **WHEN** the app is opened from a cold start
- **THEN** the Today tab is shown

### Requirement: App info in Settings
The Settings screen SHALL show the app version and the number of foods currently available in the food table.

#### Scenario: Checking a fresh install
- **WHEN** the user opens Settings on a fresh install
- **THEN** the screen shows the installed app version and a food count of at least 300

### Requirement: Startup failure is reported
If the on-phone database cannot be opened or upgraded, the app SHALL show an error screen explaining that local data could not be loaded instead of crashing or showing empty data.

#### Scenario: Database cannot open
- **GIVEN** opening or migrating the database fails at startup
- **WHEN** the app launches
- **THEN** an error screen is shown with a short message and a retry action
