# Spec Delta

## Purpose

Lets the user plug in their own free AI keys, choose the order they are tried in, and keep logging when one runs out, while knowing what each provider does with their text.

## ADDED Requirements

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
