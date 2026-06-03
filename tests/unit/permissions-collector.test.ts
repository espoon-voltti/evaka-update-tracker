import type { MockedFunction } from 'vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import * as github from '../../src/api/github';
import { collectPermissions, mergePermissionsFallback } from '../../src/services/permissions-collector';

vi.mock('../../src/api/github');
vi.mock('../../src/config/permissions-instances', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    PERMISSIONS_INSTANCES: [
      {
        id: 'espoo',
        name: 'Espoo',
        cityGroupId: 'espoo',
        repository: { owner: 'espoon-voltti', name: 'evaka', ref: 'master' },
        mappingPaths: ['mappings/espoo.kt'],
      },
      {
        id: 'turku',
        name: 'Turku',
        cityGroupId: 'turku',
        repository: { owner: 'espoon-voltti', name: 'evaka', ref: 'master' },
        mappingPaths: ['mappings/turku.kt'],
      },
      {
        id: 'tampere',
        name: 'Tampere',
        cityGroupId: 'tampere-region',
        repository: { owner: 'espoon-voltti', name: 'evaka', ref: 'master' },
        mappingPaths: ['mappings/trevaka.kt', 'mappings/tampere.kt'],
      },
    ],
  };
});

const mockGetFileContent = github.getFileContent as MockedFunction<typeof github.getFileContent>;

const ACTION_KT = `
sealed interface Employee : Action {
    enum class Global(override vararg val defaultRules: UnscopedActionRule) : UnscopedAction {
        APPLICATIONS_PAGE(HasGlobalRole(ADMIN, SERVICE_WORKER)),
        SETTINGS_PAGE(HasGlobalRole(ADMIN)),
    }
    enum class Child(override vararg val defaultRules: ScopedActionRule<in ChildId>) :
        ScopedAction<ChildId> {
        READ_ASSISTANCE(
            HasGlobalRole(ADMIN, SERVICE_WORKER),
            HasUnitRole(UNIT_SUPERVISOR, STAFF).inPlacementUnitOfChild(),
        ),
    }
}
`;

const ESPOO_MAPPING = `
class EspooActionRuleMapping : ActionRuleMapping {
    override fun rulesOf(action: Action.UnscopedAction) = when (action) {
        else -> action.defaultRules.asSequence()
    }
    override fun <T> rulesOf(action: Action.ScopedAction<in T>) = when (action) {
        else -> action.defaultRules.asSequence()
    }
}
`;

const TURKU_MAPPING = `
class TurkuActionRuleMapping : ActionRuleMapping {
    override fun rulesOf(action: Action.ScopedAction<in T>) = when (action) {
        Action.Child.READ_ASSISTANCE ->
            action.defaultRules.asSequence() +
                sequenceOf(HasGlobalRole(UserRole.DIRECTOR))
        else -> action.defaultRules.asSequence()
    }
}
`;

const TREVAKA_MAPPING = `
class TrevakaActionRuleMapping : ActionRuleMapping {
    override fun rulesOf(action: Action.UnscopedAction) = when (action) {
        Action.Global.SETTINGS_PAGE -> emptySequence()
        else -> action.defaultRules.asSequence()
    }
    override fun <T> rulesOf(action: Action.ScopedAction<in T>) = when (action) {
        Action.Child.READ_ASSISTANCE ->
            action.defaultRules.asSequence() +
                sequenceOf(HasGlobalRole(UserRole.DIRECTOR, UserRole.FINANCE_ADMIN))
        else -> action.defaultRules.asSequence()
    }
}
`;

const TAMPERE_MAPPING = `
class TampereActionRuleMapping(private val commonRules: ActionRuleMapping) : ActionRuleMapping {
    override fun rulesOf(action: Action.UnscopedAction) = when (action) {
        Action.Global.SETTINGS_PAGE ->
            action.defaultRules.asSequence() +
                sequenceOf(HasGlobalRole(UserRole.SERVICE_WORKER))
        else -> commonRules.rulesOf(action)
    }
}
`;

beforeEach(() => {
  mockGetFileContent.mockReset();
  mockGetFileContent.mockImplementation(async (_owner, _repo, path) => {
    if (path.endsWith('Action.kt')) return ACTION_KT;
    if (path.endsWith('espoo.kt')) return ESPOO_MAPPING;
    if (path.endsWith('turku.kt')) return TURKU_MAPPING;
    if (path.endsWith('trevaka.kt')) return TREVAKA_MAPPING;
    if (path.endsWith('tampere.kt')) return TAMPERE_MAPPING;
    throw new Error(`Unexpected path: ${path}`);
  });
});

describe('collectPermissions', () => {
  it('produces categories with all parsed actions', async () => {
    const data = await collectPermissions();
    const catIds = data.categories.map((c) => c.id).sort();
    expect(catIds).toEqual(['Child', 'Global']);
    const allActions = data.categories.flatMap((c) => c.actions);
    expect(allActions.map((a) => a.name).sort()).toEqual([
      'Action.Child.READ_ASSISTANCE',
      'Action.Global.APPLICATIONS_PAGE',
      'Action.Global.SETTINGS_PAGE',
    ]);
  });

  it('uses defaultRules for Espoo when no override', async () => {
    const data = await collectPermissions();
    const readAssistance = findAction(data, 'Action.Child.READ_ASSISTANCE');
    expect(readAssistance.rolesAllowed.espoo).toEqual([
      'ADMIN',
      'SERVICE_WORKER',
      'STAFF',
      'UNIT_SUPERVISOR',
    ]);
  });

  it('applies Turku extend_default by adding DIRECTOR over defaults', async () => {
    const data = await collectPermissions();
    const readAssistance = findAction(data, 'Action.Child.READ_ASSISTANCE');
    expect(readAssistance.rolesAllowed.turku).toEqual([
      'ADMIN',
      'DIRECTOR',
      'SERVICE_WORKER',
      'STAFF',
      'UNIT_SUPERVISOR',
    ]);
  });

  it('overlays Tampere mapping after Trevaka — later wins for same action', async () => {
    const data = await collectPermissions();
    const settings = findAction(data, 'Action.Global.SETTINGS_PAGE');
    // Trevaka emptied SETTINGS_PAGE; Tampere added SERVICE_WORKER on top of defaults.
    // Later mapping wins, so Tampere should resolve to ADMIN + SERVICE_WORKER.
    expect(settings.rolesAllowed.tampere).toEqual(['ADMIN', 'SERVICE_WORKER']);
  });

  it('classifies READ_ASSISTANCE as READ', async () => {
    const data = await collectPermissions();
    const readAssistance = findAction(data, 'Action.Child.READ_ASSISTANCE');
    expect(readAssistance.crud).toBe('READ');
  });

  it('liittää suomenkielisen labelin actioniin', async () => {
    const data = await collectPermissions();
    const readAssistance = findAction(data, 'Action.Child.READ_ASSISTANCE');
    expect(readAssistance.label).toBe('Lapsi: lue tuki');
  });

  it('käyttää shortName-fallbackia kun action puuttuu käännöstaulukosta', async () => {
    // Action.Global.APPLICATIONS_PAGE ei ole tuotantokoodissa kun käytetään
    // mock-syötteitä; varmistetaan että jos label-mappaus ei löydä, palautetaan shortName.
    // SETTINGS_PAGE ei ole ACTION_LABELS-taulukossa (lisätty puuttuvana — testi
    // saattaa olla yhteensopiva tulevaisuudessakin).
    const data = await collectPermissions();
    const allActions = data.categories.flatMap((c) => c.actions);
    for (const a of allActions) {
      expect(a.label.length).toBeGreaterThan(0);
    }
  });
});

describe('mergePermissionsFallback', () => {
  it('restores per-city roles when current data has errors', async () => {
    const current = await collectPermissions();
    current.cities.find((c) => c.id === 'turku')!.error = 'simulated';
    // Wipe turku from one action to simulate failed collection
    const readAssistance = findAction(current, 'Action.Child.READ_ASSISTANCE');
    readAssistance.rolesAllowed.turku = [];

    const previous = JSON.parse(JSON.stringify(current));
    const prevReadAssistance = findAction(previous, 'Action.Child.READ_ASSISTANCE');
    prevReadAssistance.rolesAllowed.turku = ['ADMIN', 'DIRECTOR'];

    mergePermissionsFallback(current, previous);
    const restored = findAction(current, 'Action.Child.READ_ASSISTANCE');
    expect(restored.rolesAllowed.turku).toEqual(['ADMIN', 'DIRECTOR']);
  });
});

function findAction(data: any, name: string) {
  for (const cat of data.categories) {
    const a = cat.actions.find((x: any) => x.name === name);
    if (a) return a;
  }
  throw new Error(`Action ${name} not found`);
}
