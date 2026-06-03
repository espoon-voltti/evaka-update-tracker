import { describe, it, expect } from 'vitest';
import {
  ACTION_LABELS,
  CATEGORY_LABELS,
  actionLabel,
  categoryLabel,
} from '../../src/config/permissions-labels';

describe('actionLabel', () => {
  it('palauttaa tunnistetun käännöksen', () => {
    expect(actionLabel('Action.Child.READ_ASSISTANCE', 'READ_ASSISTANCE')).toBe(
      'Lapsi: lue tuki'
    );
  });

  it('palauttaa shortName-fallbackin tunnistamattomalle actionille', () => {
    expect(actionLabel('Action.Unknown.FROBNICATE_WIDGET', 'FROBNICATE_WIDGET')).toBe(
      'FROBNICATE_WIDGET'
    );
  });

  it('palauttaa shortName-fallbackin kun käännöstaulukkoa ei ole päivitetty', () => {
    // Simuloi: koodikantaan lisätty action, mutta käännöstä ei vielä
    expect(actionLabel('Action.Child.NEW_FEATURE_NOT_TRANSLATED', 'NEW_FEATURE_NOT_TRANSLATED')).toBe(
      'NEW_FEATURE_NOT_TRANSLATED'
    );
  });
});

describe('categoryLabel', () => {
  it('palauttaa tunnetun kategorian suomenkielisen otsikon', () => {
    expect(categoryLabel('Child')).toBe('Lapsi');
    expect(categoryLabel('AssistanceFactor')).toBe('Tuen tarpeen kerroin');
  });

  it('palauttaa tunnistamattomalle kategorialle id:n fallbackina', () => {
    expect(categoryLabel('UnknownCategory')).toBe('UnknownCategory');
  });
});

describe('ACTION_LABELS-konsistenssi', () => {
  it('jokainen avain on Action.X.Y -muotoinen', () => {
    for (const key of Object.keys(ACTION_LABELS)) {
      expect(key).toMatch(/^Action\.[A-Z][A-Za-z]+\.[A-Z_][A-Z0-9_]*$/);
    }
  });

  it('jokainen kategoria avaimissa on CATEGORY_LABELS-taulukossa', () => {
    const missing: string[] = [];
    for (const key of Object.keys(ACTION_LABELS)) {
      const category = key.split('.')[1];
      if (!(category in CATEGORY_LABELS)) missing.push(category);
    }
    expect(missing).toEqual([]);
  });
});
