# Spec Delta

## Purpose

Runs a small AI model on the phone itself so text logging works without internet or cloud keys, on phones powerful enough to run it.

## ADDED Requirements

### Requirement: Device support check
The app SHALL offer the phone model only when the phone reports about 8 GB of RAM or more (at least 7 GiB total memory); otherwise it SHALL show "Phone model not supported on this phone" and keep cloud and manual logging available.

#### Scenario: 6 GB phone
- **GIVEN** a phone with 6 GB RAM
- **WHEN** the user opens Settings → Phone model
- **THEN** the screen says the phone model is not supported and no download button is shown

### Requirement: Optional download over Wi-Fi
On supported phones the user SHALL be able to download Gemma 4 E2B in the app; the download SHALL require Wi-Fi, check that free storage is at least the model size plus 1 GB, show progress, and allow cancelling.

#### Scenario: Not enough storage
- **GIVEN** the phone has 2 GB free
- **WHEN** the user taps Download
- **THEN** the app says how much space is needed and does not start the download

#### Scenario: On mobile data
- **WHEN** the user taps Download while not on Wi-Fi
- **THEN** the app asks the user to connect to Wi-Fi and does not start

#### Scenario: Progress and cancel
- **WHEN** a download is running
- **THEN** progress is shown as a percentage and size, and Cancel stops it and removes partial files

### Requirement: Interrupted downloads
If a download is interrupted (app closed, Wi-Fi lost), the app SHALL show it as incomplete and let the user resume or restart it; an incomplete model SHALL never be used.

#### Scenario: Wi-Fi lost
- **WHEN** Wi-Fi drops during the download
- **THEN** the download pauses as incomplete with a Resume option and the phone model stays unavailable

### Requirement: Delete the model
The user SHALL be able to delete the downloaded model, freeing its storage; the app SHALL then stop using the phone model.

#### Scenario: Deleting
- **WHEN** the user taps Delete and confirms
- **THEN** the model files are removed and Settings shows the freed space

### Requirement: Same output contract
The phone model SHALL return the same `{"items":[...]}` result as cloud providers, validated the same way, with prompt examples in English and Hinglish; it SHALL NOT supply nutrition values for foods in the table.

#### Scenario: Offline Hinglish log
- **GIVEN** the model is downloaded and the phone is offline
- **WHEN** the user types "do roti aur ek katori dal"
- **THEN** the confirm list shows 2 roti and 1 katori dal with numbers from the food table

### Requirement: Phone model self-test
Settings SHALL provide "Test phone model", which runs a built-in set of 25–30 English, Hinglish and mixed sentences through the phone model and shows how many were parsed correctly and which failed.

#### Scenario: Running the test
- **WHEN** the user runs the self-test
- **THEN** the screen shows a score such as "24 / 28 correct" and lists each failed sentence with expected and actual items
