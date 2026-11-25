# Spec Delta

## Purpose

Connects the food names a person or AI writes to the right foods in MacroMend's table, across English, Hindi/Hinglish names, plurals and typos.

## ADDED Requirements

### Requirement: Exact name and alias match first
A parsed food name SHALL first be matched exactly (ignoring case and extra spaces) against food names and aliases.

#### Scenario: Alias match
- **WHEN** the parsed name is "dahi"
- **THEN** it matches curd

### Requirement: Plural and spelling variants
If there is no exact match, the matcher SHALL try simple variants: English plurals ("rotis", "eggs", "samosas"), doubled vowels and common Hinglish spellings ("daal"/"dal", "chaawal"/"chawal", "paneer"/"panir").

#### Scenario: Plural
- **WHEN** the parsed name is "rotis"
- **THEN** it matches roti

### Requirement: Fuzzy match for typos
If no exact or variant match exists, the matcher SHALL pick the closest food name or alias within a small edit distance (1 for names of 4–5 letters, 2 for longer names) and mark the match as fuzzy so the confirm list highlights it.

#### Scenario: Typo
- **WHEN** the parsed name is "panner"
- **THEN** it matches paneer and is highlighted for the user to check

#### Scenario: Too different
- **WHEN** the parsed name is "pizza" and no pizza food exists
- **THEN** no food is matched and the item is shown as Not found

### Requirement: Ambiguous matches
When two or more foods match equally well, the matcher SHALL pick the one with the shortest name and offer the others as alternatives on the confirm list.

#### Scenario: Two dal foods
- **GIVEN** foods "dal" and "dal makhani" exist
- **WHEN** the parsed name is "dal"
- **THEN** "dal" is chosen and the user can switch to another dal on the confirm list
