# ai-providers Specification

## Purpose

Lets the user plug in their own free AI keys, choose the order they are tried in, and keep logging when one runs out, while knowing what each provider does with their text.

## Requirements

### Requirement: Provider presets and custom providers
The user SHALL be able to add providers from presets for Google Gemini, Groq and OpenRouter, each with a default model name, or add a custom OpenAI-compatible provider with a base URL and model name. Model names SHALL be editable for every provider.

#### Scenario: Adding Groq
- **WHEN** the user adds the Groq preset and pastes a key
- **THEN** a Groq provider is saved with its default base URL and an editable model name

#### Scenario: Custom provider
- **WHEN** the user adds a custom provider with a base URL, model name and key
- **THEN** it is saved and tried like any preset

### Requirement: Keys stored securely on the phone
API keys SHALL be stored in the phone's secure storage, SHALL be shown only masked after saving, and SHALL be sent only to the provider they belong to.

#### Scenario: Masked key
- **WHEN** the user reopens a saved provider
- **THEN** the key is shown masked except for its last 4 characters

### Requirement: Test connection
The user SHALL be able to test a provider; the app SHALL report success or the reason for failure (invalid key, rate limited, model not found, network or timeout).

#### Scenario: Invalid key
- **WHEN** the user tests a provider with a wrong key
- **THEN** the app reports that the key was rejected

### Requirement: Ordered fallback between providers
The app SHALL try enabled providers in the user's order and move to the next one on a rate-limit, quota, authentication, model, invalid-reply or network error, or when no reply arrives within 8 seconds.

#### Scenario: First provider rate limited
- **GIVEN** providers Gemini then Groq
- **WHEN** Gemini replies with a rate-limit error
- **THEN** the same text is sent to Groq and its reply is used

#### Scenario: Timeout
- **WHEN** the first provider has not replied after 8 seconds
- **THEN** the request is abandoned and the next provider is tried

### Requirement: Exhausted providers are skipped
A provider that reports its daily quota is used up SHALL be skipped until the next local day; a provider that is only rate limited SHALL be skipped for 60 seconds or the time it asks for; a provider whose key is rejected SHALL be skipped until the user edits it, and Settings SHALL show these states.

#### Scenario: Quota used up
- **WHEN** Groq replies that its daily quota is exhausted
- **THEN** Groq is skipped for the rest of the local day and Settings shows it as "out of quota today"

### Requirement: Reorder, disable and delete
The user SHALL be able to reorder providers, disable or enable them, and delete them; deleting a provider SHALL remove its key from the phone.

#### Scenario: Reorder
- **WHEN** the user drags Groq above Gemini
- **THEN** the next text log tries Groq first

### Requirement: Privacy notes
Each provider SHALL show what is sent (only the typed text and slot names) and its known data use, including that Google Gemini's free tier uses prompts to improve Google products and that some OpenRouter free models may train on prompts.

#### Scenario: Gemini note
- **WHEN** the user adds or views the Gemini provider
- **THEN** a note says free-tier prompts may be used by Google to improve its products

### Requirement: Phone model as fallback
When a downloaded phone model is available, the parsing chain SHALL use it after cloud providers: when no cloud provider is set up or enabled, when every cloud provider fails or is skipped, when the phone is offline, or when cloud attempts time out.

#### Scenario: Offline with phone model
- **GIVEN** a Groq key and a downloaded phone model
- **WHEN** the user logs text in airplane mode
- **THEN** the phone model parses it without trying Groq

#### Scenario: No phone model
- **GIVEN** no phone model and every cloud provider fails
- **WHEN** the user logs text
- **THEN** the app falls back to manual pick

### Requirement: Daily switch to phone model
When every enabled cloud provider is out of quota for the day, the app SHALL use the phone model for the rest of the local day without trying cloud providers, and SHALL try cloud providers again on the next local day.

#### Scenario: All keys exhausted
- **GIVEN** both cloud providers report daily quota exhausted
- **WHEN** the user logs more text that day
- **THEN** the phone model is used directly and Settings shows "Using phone model until tomorrow"

### Requirement: Always use phone model
Settings SHALL offer "Always use phone model"; while it is on, no text SHALL be sent to cloud providers for parsing or estimates, and if the model is not downloaded the app SHALL use manual pick and say so.

#### Scenario: Privacy switch on
- **GIVEN** "Always use phone model" is on and cloud keys exist
- **WHEN** the user logs text while online
- **THEN** only the phone model is used and no request goes to any cloud provider

### Requirement: Show which model was used
The confirm list SHALL show which provider or the phone model understood the text.

#### Scenario: Label
- **WHEN** the phone model parsed the text
- **THEN** the confirm list shows "Understood by: Phone model"
