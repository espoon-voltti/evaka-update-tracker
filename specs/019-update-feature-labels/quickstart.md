# Quickstart: Update Finnish Feature Labels

## What This Feature Does

Updates 8 Finnish label strings in `src/config/feature-labels.ts` to match the terminology actually used in evaka's UI and documentation.

## How to Implement

1. Open `src/config/feature-labels.ts`
2. Apply the 8 value changes listed in [data-model.md](data-model.md)
3. Run `npm test && npm run lint` to verify nothing breaks

## Key Decisions

- **"kuntalainen" not "kansalainen"**: evaka uses "kuntalainen" (municipal resident) for citizen-facing features
- **"varhaiskasvatus" not "päivähoito"**: evaka uses the modern official term
- **"asiakirjapohja" not "asiakirjamalli"**: matches evaka's document template terminology
- **"varhaiskasvatuspaikkatakuu"**: evaka's actual term for placement guarantee

## Verification

```bash
npm test && npm run lint
```

No new tests needed — this is a data-only change to existing string constants.
