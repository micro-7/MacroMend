# Spec Delta

## ADDED Requirements

### Requirement: Number words in code
Quantities written as words SHALL be converted to numbers by the app, not the AI: English (one to ten, half, one and a half) and Hindi/Hinglish (ek 1, do 2, teen 3, char 4, paanch 5, chhe 6, saat 7, aath 8, nau 9, das 10, aadha 0.5, dedh 1.5, dhai 2.5, sawa adds 0.25, saadhe adds 0.5).

#### Scenario: Hinglish number
- **WHEN** a parsed item has quantity "do"
- **THEN** the quantity is 2

#### Scenario: Fraction word
- **WHEN** a parsed item has quantity "dedh"
- **THEN** the quantity is 1.5

### Requirement: Unit spellings and portion words
Unit strings SHALL be normalized to known units: "pc", "pcs", "piece(s)", "nos" → the food's piece unit; "g", "gm", "gms", "gram(s)" → g; "katori", "katoris", "bowl(s)", "cup(s)", "glass(es)", "scoop(s)", "tbsp", "tsp", "slice(s)". An unknown or empty unit SHALL become the food's default unit.

#### Scenario: Ek katori
- **WHEN** a parsed item is quantity "ek" and unit "katori" for dal
- **THEN** it converts to 1 katori, which is 150 g

#### Scenario: Unknown unit
- **WHEN** a parsed item for samosa has unit "plate"
- **THEN** the samosa's default unit is used
