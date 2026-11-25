# Spec Delta

## Purpose
Gives every MacroMend screen one consistent, modern dark look with clear feedback when the user taps or logs, while staying readable and fully usable offline.

## ADDED Requirements

### Requirement: Dark theme on every screen
Every screen SHALL use the app's dark style: a charcoal background, slightly lighter rounded cards for grouped content, brand green for main actions and hero cards, and coral as the highlight colour for active and progress elements. No screen SHALL keep the old white style.

#### Scenario: Opening any screen
- **WHEN** the user opens Today, Log, Fix my day, the confirm screen, any Settings screen or any onboarding step
- **THEN** the screen has the dark background with content on rounded cards, and its main action button is green

### Requirement: Readable text and numbers
Body text, food names and all numbers SHALL use a clean sans-serif font, and text SHALL keep a contrast ratio of at least 4.5:1 against its background (3:1 for large headings). Screen titles and hero headlines SHALL use a serif display font, and MAY set single emphasis words in italic.

#### Scenario: Reading the Today numbers
- **WHEN** the user looks at calories and protein on Today
- **THEN** the numbers are in the sans-serif font and clearly readable on the dark background

### Requirement: Works offline with bundled assets
Fonts and icons SHALL be part of the installed app, so every screen looks the same with no internet connection, including on first launch.

#### Scenario: First launch offline
- **WHEN** the app is installed and opened for the first time in airplane mode
- **THEN** headings use the serif font and icons are shown, with no missing glyphs or fallback boxes

### Requirement: Floating tab bar
The Today, Log and Settings tabs SHALL be shown in a floating, rounded tab bar with a line icon and label for each tab; the active tab SHALL be marked with a coral circle behind its icon.

#### Scenario: Switching tabs
- **WHEN** the user taps Log
- **THEN** the coral circle moves to the Log icon and the Log screen is shown

### Requirement: Feedback on taps and logging
Buttons and tappable cards SHALL visibly react while pressed. Logging food (from the log screen, the confirm screen or Fix my day) SHALL give a short vibration, unless the phone has vibration turned off.

#### Scenario: Logging food
- **WHEN** the user taps Log it and the entry is saved
- **THEN** the phone gives one short vibration and the entry appears on Today

### Requirement: Friendly empty and loading states
Empty lists SHALL show a short friendly message with what to do next instead of a blank area, and long waits (AI reading text, phone model loading, online search, downloads) SHALL show a progress indicator with a short description.

#### Scenario: Empty meal
- **WHEN** a meal slot has nothing logged today
- **THEN** its card shows a short message such as "Nothing yet" with a way to add food

#### Scenario: Phone model download
- **WHEN** the phone model is downloading
- **THEN** a progress bar fills with the percentage shown next to it
