# online-food-lookup Specification

## Purpose

Finds foods that are not in MacroMend's built-in table, from public food databases first and an AI estimate last, and keeps them on the phone so they work offline next time.

## Requirements

### Requirement: Online search for missing foods
When a food is not found in the local table, the app SHALL search USDA FoodData Central and Open Food Facts by name and show up to 10 combined results with name, brand (if any), kcal and protein per 100 g and their source.

#### Scenario: Branded product from text log
- **GIVEN** the confirm list shows "MuscleBlaze whey" as Not found
- **WHEN** the user taps "Search online"
- **THEN** matching Open Food Facts products are listed with kcal and protein per 100 g

#### Scenario: Manual search fallback
- **WHEN** a manual search on the Log tab returns no local foods
- **THEN** a "Search online" button is shown and runs the same search

### Requirement: Saving an online result
Picking an online result SHALL save it to the local food table with its source, external id, kcal and protein per 100 g, a unit (its serving size when known, otherwise grams), the searched name as an alias, and a diet category the user confirms; it SHALL then be used for the log.

#### Scenario: Category confirmation
- **WHEN** the user picks an Open Food Facts product
- **THEN** the app asks the user to confirm its category (veg, egg, non-veg or vegan), prefilled from the product's labels when available

#### Scenario: Found offline next time
- **GIVEN** the user saved an online result for "yoga bar"
- **WHEN** the user later logs "yoga bar" in airplane mode
- **THEN** the saved food is matched from the local table

### Requirement: AI estimate as last resort
When online search finds nothing or the user taps "None of these", the app SHALL ask the user's AI providers for kcal per 100 g, protein per 100 g, a typical unit with its grams and a category, and SHALL show the estimate for the user to review and edit before saving it with source ai-estimated.

#### Scenario: Dhaba dish
- **WHEN** "dhaba butter chicken" is not found online and the user requests an estimate
- **THEN** an estimate is shown labelled "Estimated by AI — check before saving" with editable kcal and protein

### Requirement: Estimates are validated
An AI estimate SHALL be rejected if kcal per 100 g is outside 0–900, protein per 100 g is outside 0–100, or protein × 4 exceeds kcal by more than 5%; the user SHALL then be asked to enter values manually.

#### Scenario: Impossible estimate
- **WHEN** a provider returns 50 kcal and 40 g protein per 100 g
- **THEN** the estimate is rejected and manual entry is offered

### Requirement: Estimated entries are marked
Log entries made from ai-estimated foods SHALL be saved as estimated and shown with an "est." mark on Today.

#### Scenario: Est. badge
- **WHEN** the user logs a saved AI-estimated food
- **THEN** the entry on Today shows "est."

### Requirement: Manage saved foods
Settings → My foods SHALL list foods with source user, usda, openfoodfacts or ai-estimated, and let the user edit their values, category, unit and aliases or delete them; past log entries SHALL keep their saved numbers.

#### Scenario: Editing an estimate
- **WHEN** the user changes an ai-estimated food's kcal and marks it as checked
- **THEN** the food's source becomes user and future logs are not marked estimated

### Requirement: Lookup controls and privacy
Online lookup SHALL send only the food name, SHALL be skipped when offline or when the user turns off "Online food lookup" in Settings, and SHALL show attribution for Open Food Facts (ODbL) and USDA FoodData Central next to their results.

#### Scenario: Lookup turned off
- **GIVEN** "Online food lookup" is off
- **WHEN** a food is not found locally
- **THEN** no online search runs and the user can pick a food manually or request an AI estimate

#### Scenario: Offline
- **WHEN** the phone is offline and a food is not found
- **THEN** the app says online search needs internet and offers manual pick or manual entry
