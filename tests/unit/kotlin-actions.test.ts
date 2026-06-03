import { describe, it, expect } from 'vitest';
import { parseActionKt, rolesFromRules } from '../../src/services/parsers/kotlin-actions';

const SAMPLE_ACTION_KT = `
sealed interface Employee : Action {
    enum class Global(override vararg val defaultRules: UnscopedActionRule) : UnscopedAction {
        APPLICATIONS_PAGE(HasGlobalRole(ADMIN, SERVICE_WORKER, SPECIAL_EDUCATION_TEACHER)),
        FINANCE_PAGE(HasGlobalRole(ADMIN, FINANCE_ADMIN, FINANCE_STAFF)),
        PIN_CODE_PAGE(),
    }
    enum class Child(override vararg val defaultRules: ScopedActionRule<in ChildId>) :
        ScopedAction<ChildId> {
        READ_ASSISTANCE(
            HasGlobalRole(ADMIN, SERVICE_WORKER),
            HasUnitRole(UNIT_SUPERVISOR, STAFF, EARLY_CHILDHOOD_EDUCATION_SECRETARY, SPECIAL_EDUCATION_TEACHER)
                .inPlacementUnitOfChild(),
        ),
        UPDATE_ADDITIONAL_INFO(
            HasGlobalRole(ADMIN, SERVICE_WORKER),
            HasUnitRole(UNIT_SUPERVISOR).inPlacementUnitOfChild(),
        ),
    }
}

sealed interface Citizen : Action {
    enum class Application(override vararg val defaultRules: ScopedActionRule<in ApplicationId>) :
        ScopedAction<ApplicationId> {
        READ(IsCitizen(allowWeakLogin = true).guardianOfApplication()),
    }
}
`;

describe('parseActionKt', () => {
  it('extracts employee actions from Global and Child enums', () => {
    const actions = parseActionKt(SAMPLE_ACTION_KT);
    const names = actions.map((a) => a.name).sort();
    expect(names).toEqual([
      'Action.Child.READ_ASSISTANCE',
      'Action.Child.UPDATE_ADDITIONAL_INFO',
      'Action.Global.APPLICATIONS_PAGE',
      'Action.Global.FINANCE_PAGE',
      'Action.Global.PIN_CODE_PAGE',
    ]);
  });

  it('skips Citizen subinterface', () => {
    const actions = parseActionKt(SAMPLE_ACTION_KT);
    expect(actions.find((a) => a.category === 'Application')).toBeUndefined();
  });

  it('captures defaultRoles for Has*Role rules', () => {
    const actions = parseActionKt(SAMPLE_ACTION_KT);
    const readAssistance = actions.find((a) => a.shortName === 'READ_ASSISTANCE');
    expect(readAssistance?.defaultRoles).toEqual([
      'ADMIN',
      'EARLY_CHILDHOOD_EDUCATION_SECRETARY',
      'SERVICE_WORKER',
      'SPECIAL_EDUCATION_TEACHER',
      'STAFF',
      'UNIT_SUPERVISOR',
    ]);
  });

  it('returns empty roles list when action has no rules', () => {
    const actions = parseActionKt(SAMPLE_ACTION_KT);
    const pinCode = actions.find((a) => a.shortName === 'PIN_CODE_PAGE');
    expect(pinCode?.defaultRoles).toEqual([]);
  });
});

describe('rolesFromRules', () => {
  it('extracts roles from HasGlobalRole', () => {
    expect(rolesFromRules('HasGlobalRole(ADMIN, SERVICE_WORKER)')).toEqual([
      'ADMIN',
      'SERVICE_WORKER',
    ]);
  });

  it('extracts roles from HasUnitRole with chained calls', () => {
    expect(
      rolesFromRules('HasUnitRole(UNIT_SUPERVISOR, STAFF).inPlacementUnitOfChild()')
    ).toEqual(['STAFF', 'UNIT_SUPERVISOR']);
  });

  it('falls back to bare role tokens when HasGlobalRole spans newlines', () => {
    const multiline = `HasGlobalRole(
      ADMIN,
      DIRECTOR,
    )`;
    expect(rolesFromRules(multiline)).toEqual(['ADMIN', 'DIRECTOR']);
  });

  it('returns empty list when no roles present', () => {
    expect(rolesFromRules('')).toEqual([]);
    expect(rolesFromRules('IsCitizen(allowWeakLogin = true).guardianOfChild()')).toEqual([]);
  });
});
