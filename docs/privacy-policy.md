---
title: MacroMend privacy policy
permalink: /privacy-policy
---

# MacroMend privacy policy

Last updated: 25 November 2026

MacroMend is a diet-tracking app for Android. It has no account, no login and no MacroMend server. This page says what the app stores and what leaves your phone.

## What stays on your phone

Everything you enter: your profile and targets (weight, height, age, goal, diet type), your meals and daily logs, your usual foods, foods you saved or created, your meal slots and your settings. It is stored in the app's private database on your phone. The developer cannot see it.

If you download the optional phone model (Gemma 4 E2B), the model files are stored on your phone too and run entirely on it.

## What can leave your phone, and when

1. **Text you type to log food, sent to AI providers you add.** If you add a provider (Google Gemini, Groq, OpenRouter or another service you configure) and type a meal such as "2 roti and dal", that text is sent to that provider with your own API key so it can be turned into a list of foods. It is not sent if you have not added a provider, when the phone model is used instead, or when "Always use phone model" is on. The provider's own privacy policy applies to what it receives. The AI only reads your text; calories and protein come from the app's food table.
2. **Food names, sent to food databases.** When you search for a food online, only the food name you searched for is sent to USDA FoodData Central and Open Food Facts (and, for AI estimates of foods found nowhere, to your AI provider). You can switch online food lookup off in Settings → Food lookup.
3. **Downloading the phone model.** If you choose to download it, the app downloads the model files from the model's public host. No personal data is sent with that request.

Nothing else leaves your phone. MacroMend contains no analytics, no advertising and no crash-reporting service.

## Your API keys

API keys you enter are kept in your phone's secure storage and are only sent to the provider they belong to. They are not stored in the database and not written to logs.

## Deleting your data

Settings → About → "Delete all my data" removes your profile, logs, usual foods, saved foods, AI providers, stored keys and the downloaded phone model from your phone. Uninstalling the app also removes everything it stored. Because the developer holds no copy of your data, there is nothing to request from the developer.

## Children

MacroMend is not directed at children under 13 and does not knowingly collect any data from anyone.

## Changes

If this policy changes, the new version will be published at this address with a new date.

## Contact

Questions: open an issue at https://github.com/micro-7/MacroMend/issues.

