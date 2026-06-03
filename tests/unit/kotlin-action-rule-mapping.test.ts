import { describe, it, expect } from 'vitest';
import { parseActionRuleMapping } from '../../src/services/parsers/kotlin-action-rule-mapping';

const TURKU_STYLE = `
class TurkuActionRuleMapping : ActionRuleMapping {
    override fun rulesOf(action: Action.UnscopedAction): Sequence<UnscopedActionRule> =
        when (action) {
            Action.Global.READ_TAMPERE_REGIONAL_SURVEY_REPORT -> sequenceOf()

            Action.Global.APPLICATIONS_PAGE ->
                action.defaultRules.asSequence() +
                    sequenceOf(HasGlobalRole(UserRole.DIRECTOR))

            else -> action.defaultRules.asSequence()
        }

    override fun <T> rulesOf(action: Action.ScopedAction<in T>): Sequence<ScopedActionRule<in T>> =
        when (action) {
            Action.Child.READ_ASSISTANCE,
            Action.Child.READ_ASSISTANCE_FACTORS -> {
                @Suppress("UNCHECKED_CAST")
                action.defaultRules.asSequence() +
                    sequenceOf(
                        HasGlobalRole(UserRole.DIRECTOR, UserRole.FINANCE_ADMIN)
                            as ScopedActionRule<in T>
                    )
            }

            else -> action.defaultRules.asSequence()
        }
}
`;

describe('parseActionRuleMapping', () => {
  it('extracts replace overrides for empty sequenceOf()', () => {
    const { overrides } = parseActionRuleMapping(TURKU_STYLE);
    const o = overrides.find((x) => x.shortName === 'READ_TAMPERE_REGIONAL_SURVEY_REPORT');
    expect(o).toBeDefined();
    expect(o?.mode).toBe('replace');
    expect(o?.isEmpty).toBe(true);
    expect(o?.added).toEqual([]);
  });

  it('extracts extend_default overrides with added roles', () => {
    const { overrides } = parseActionRuleMapping(TURKU_STYLE);
    const o = overrides.find((x) => x.shortName === 'APPLICATIONS_PAGE');
    expect(o?.mode).toBe('extend_default');
    expect(o?.added).toEqual(['DIRECTOR']);
  });

  it('emits an override per action in a multi-condition branch', () => {
    const { overrides } = parseActionRuleMapping(TURKU_STYLE);
    const readAssistance = overrides.find((x) => x.shortName === 'READ_ASSISTANCE');
    const readFactors = overrides.find((x) => x.shortName === 'READ_ASSISTANCE_FACTORS');
    expect(readAssistance?.added).toEqual(['DIRECTOR', 'FINANCE_ADMIN']);
    expect(readFactors?.added).toEqual(['DIRECTOR', 'FINANCE_ADMIN']);
  });

  it('skips else branches', () => {
    const { overrides } = parseActionRuleMapping(TURKU_STYLE);
    expect(overrides.find((o) => o.action.includes('else'))).toBeUndefined();
  });

  it('captures contextNotes from chained extensions', () => {
    const source = `
      override fun rulesOf(action: Action.ScopedAction<in T>) =
        when (action) {
          Action.Child.READ -> {
            action.defaultRules.asSequence() +
              sequenceOf(HasUnitRole(UserRole.STAFF).inPlacementUnitOfChild())
          }
        }
    `;
    const { overrides } = parseActionRuleMapping(source);
    const o = overrides.find((x) => x.shortName === 'READ');
    expect(o?.contextNotes).toContain('inPlacementUnitOfChild');
  });

  it('handles IsEmployee.any() as all roles', () => {
    const source = `
      when (action) {
        Action.Global.PIN_CODE_PAGE -> sequenceOf(IsEmployee.any())
      }
    `;
    const { overrides } = parseActionRuleMapping(source);
    const o = overrides.find((x) => x.shortName === 'PIN_CODE_PAGE');
    expect(o?.mode).toBe('replace');
    expect(o?.added).toContain('ADMIN');
    expect(o?.added).toContain('STAFF');
  });
});
