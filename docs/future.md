# Future work

Things that are deliberately **not** part of the current build. Nothing here is started. Each item can become its own OpenSpec change (`/opsx:propose`) when the owner decides.

## GitHub Release (chosen next step, signed with the owner's own key)

Publish the APK on GitHub Releases before any Play Store work. Plan and steps are in `docs/status.md` (Open follow-ups). The Play Store release below stays a later step.

## Play Store release

Everything needed is already prepared; only the owner's steps remain. Do this when ready to publish.

- Steps: `docs/release.md` (upload key, four GitHub secrets, tag `v1.0.0`, Play Console).
- Listing text and data-safety answers: `docs/play-store-listing.md`.
- Privacy policy (live): https://micro-7.github.io/MacroMend/privacy-policy
- Needs: the one-time $25 Google Play developer fee, and for a new personal account a closed test with at least 12 testers for 14 days before production.
- Still to produce by hand: screenshots (list in the listing doc) and the 1024 x 500 feature graphic.

## Open Food Facts backup search

Open Food Facts limits anonymous requests, so on some days its search fails ("could not be searched right now") and packaged brands such as MuscleBlaze do not appear. USDA works reliably with the owner's own key.

- Idea: try Open Food Facts' newer search service (search-a-licious) as a second endpoint when the current one is blocked, and show a plain message when both fail.
- Needs testing on the owner's phone, because the cloud environment cannot reach Open Food Facts.

## Phone model: load ahead of time

The first reading after the phone model has been idle takes about a minute because the model is loading; later readings are quick.

- Idea: show "Loading the phone model, the first reading can take about a minute" while it loads, and a "Load now" button in Settings → Phone model.
- Idea: try the Vulkan (graphics chip) version of the model if the normal one is too slow on some phones.

## Light theme or "follow the phone's setting"

The refresh made the app dark only. Colours are one table of named roles (`src/ui/theme.ts`), so a light set with the same names plus a switch (or following Android's dark/light setting) is a small change. Not started.

## Mascot on the Today hero card

The reference design has a small friendly illustration on the green "Not sure what to eat next?" card. We kept the card clean. Could add one small bundled illustration (a smiling bowl or roti). Not started; the owner never decided.
