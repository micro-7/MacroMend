# text-logging Specification

## Purpose

Lets the user log a meal by typing it the way they would say it, in English, Hinglish or a mix, and confirm what the app understood before anything is saved.

## Requirements

### Requirement: Free-text input
The Log tab SHALL offer a text box where the user can type what they ate in English, Hinglish or a mix of both, for any cuisine and diet type.

#### Scenario: Hinglish input
- **WHEN** the user types "office mein 2 samosa kha liye" and submits
- **THEN** the app shows a confirm list containing 2 samosa

#### Scenario: English input with two foods
- **WHEN** the user types "had 2 roti and dal" and submits
- **THEN** the confirm list contains 2 roti and 1 serving of dal

### Requirement: Parsed output contract
Every provider's reply SHALL be accepted only if it matches `{"items":[{"name","qty","unit","slot"}]}` with 1 to 20 items, a non-empty English food name, a positive quantity (or a number word), a unit string and a slot that is one of the user's slots or empty. Replies that do not match SHALL be treated as a failed attempt.

#### Scenario: Invalid reply
- **WHEN** a provider replies with text that is not valid JSON in this shape
- **THEN** the reply is discarded and the next provider is tried

### Requirement: AI never supplies nutrition
The app SHALL ignore any calorie, protein or other nutrition values in a provider's reply; kcal and protein for matched foods SHALL come only from the food table.

#### Scenario: Reply includes calories
- **WHEN** a reply contains an extra "kcal" field for an item
- **THEN** the field is ignored and the shown kcal is computed from the food table

### Requirement: Confirm before saving
The app SHALL show each understood item with its matched food, quantity, unit, slot, kcal and protein, let the user edit or remove any item, and save nothing until the user confirms.

#### Scenario: Fixing a quantity
- **WHEN** the confirm list shows 2 samosa and the user changes it to 1 and taps Log
- **THEN** one entry for 1 samosa is saved with the typed text kept as its raw text

#### Scenario: Cancel
- **WHEN** the user taps Cancel on the confirm list
- **THEN** nothing is logged

### Requirement: Slot assignment
Each item SHALL be logged to the slot the provider chose when it is one of the user's slots; otherwise to the default slot for the current time.

#### Scenario: Slot from text
- **WHEN** the user types "breakfast mein 2 anda"
- **THEN** the eggs are placed in Breakfast

#### Scenario: No slot given
- **WHEN** the user types "1 scoop whey" at 17:00 with default slots
- **THEN** the item is placed in Snack

### Requirement: Unmatched items
Items that match no food in the table SHALL be shown as "Not found" with a search to pick the right food manually, and SHALL NOT be logged until a food is picked or the item is removed.

#### Scenario: Unknown food
- **WHEN** the reply includes an item that matches nothing in the table
- **THEN** it is shown as Not found with a pick-food button and the Log button ignores it until resolved

### Requirement: Fallback to manual pick
When no provider is set up, all providers fail, or the phone is offline, the app SHALL say why and open manual search with the typed text kept.

#### Scenario: No keys
- **GIVEN** no AI provider is set up
- **WHEN** the user submits text
- **THEN** the app says no AI is set up, offers to add one in Settings, and shows manual search
