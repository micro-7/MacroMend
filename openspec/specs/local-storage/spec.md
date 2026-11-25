# local-storage Specification

## Purpose

Keeps all of the user's MacroMend data (profile, foods, staples and logs) on the phone, so the app works offline and nothing depends on a backend.

## Requirements

### Requirement: Local database with MVP tables
The app SHALL store its data in an on-phone database containing a profile, foods, staples and logs table, created automatically on first launch.

#### Scenario: First launch creates storage
- **WHEN** the app starts with no existing database
- **THEN** a database is created containing the profile, foods, staples and logs tables

### Requirement: Data persists across restarts
Data written to the local database SHALL remain available after the app is closed, killed or the phone is restarted.

#### Scenario: Restart keeps data
- **GIVEN** data has been saved by the app
- **WHEN** the app is force-closed and opened again
- **THEN** the same data is still present

### Requirement: Schema upgrades keep existing data
When a newer app version changes the database schema, the app SHALL upgrade the existing database in place and keep all existing rows.

#### Scenario: Upgrade from an older schema
- **GIVEN** a database created by an older app version
- **WHEN** a newer app version with a later schema starts
- **THEN** the schema is upgraded and all previously stored rows are still present

#### Scenario: Upgrade is not repeated
- **GIVEN** the database is already at the latest schema version
- **WHEN** the app starts
- **THEN** no upgrade step runs again

### Requirement: No data leaves the phone
The storage layer SHALL NOT send stored data to any server.

#### Scenario: Offline storage only
- **WHEN** the app saves or reads any stored data
- **THEN** no network request is made as part of that operation
