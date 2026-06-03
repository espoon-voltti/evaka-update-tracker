/**
 * Permissions collector: rakentaa data/permissions.json -tiedoston
 * suoraan eVakan lähdekoodista.
 *
 * Lähde:
 *   1. Action.kt — tunnistaa kaikki työntekijä-puolen actionit ja niiden
 *      oletussäännöt (Espoo-default).
 *   2. Per-kunta ActionRuleMapping.kt -tiedostot — kunkin kunnan yliajot.
 *      Per kunta voi olla yksi tai useampi mapping-tiedosto (Tampereen
 *      seudun kunnille: Trevaka-perustaso + kuntakohtainen mapping).
 *
 * Komposointi: viimeisin override voittaa. `extend_default`-haara käyttää
 * AINA Action.kt:n defaultRules-roolit pohjana, EI edellisen mappingin
 * lopputulosta — koska Kotlinin `when`-haarat ovat eksklusiivisia.
 */

import { getFileContent } from '../api/github.js';
import { parseActionKt, ParsedAction } from './parsers/kotlin-actions.js';
import { parseActionRuleMapping, ActionOverride } from './parsers/kotlin-action-rule-mapping.js';
import {
  ACTION_KT_PATH,
  PERMISSIONS_INSTANCES,
  PERMISSIONS_CITY_GROUPS,
  PERMISSIONS_ROLES,
  PERMISSIONS_ROLE_LABELS,
  PermissionsInstance,
} from '../config/permissions-instances.js';
import { actionLabel, categoryLabel } from '../config/permissions-labels.js';

export type Crud = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'OTHER';

export interface PermissionsAction {
  name: string;
  shortName: string;
  category: string;
  crud: Crud;
  /** Suomenkielinen otsikko — fallback shortName, jos käännöstä ei löydy. */
  label: string;
  /** Lista roolit per kunta-id. */
  rolesAllowed: Record<string, string[]>;
  /** Konteksti­rajoitukset per (kunta, rooli). Tyhjä lista = ei rajoitusta. */
  contextByRole: Record<string, Record<string, string[]>>;
  /** DEPRECATED: vanha action-kohtainen konteksti — jätä taaksepäin-yhteensopivuus. */
  contextNotes: Record<string, string[]>;
}

export interface PermissionsCategory {
  id: string;
  label: string;
  actions: PermissionsAction[];
}

export interface PermissionsCityMeta {
  id: string;
  name: string;
  cityGroupId: string;
  error: string | null;
}

export interface PermissionsCityGroup {
  id: string;
  label: string;
  cities: string[];
}

export interface PermissionsData {
  generatedAt: string;
  sourceCommit: string | null;
  roles: string[];
  roleLabels: Record<string, string>;
  cityGroups: PermissionsCityGroup[];
  cities: PermissionsCityMeta[];
  categories: PermissionsCategory[];
  errorFallbackDate?: string;
}

const CRUD_PATTERNS: Array<[Crud, RegExp]> = [
  ['CREATE', /\b(CREATE|INSERT|ADD|REGISTER|RECEIVE)(?:_|$)/],
  ['READ', /\b(READ|LIST|SEARCH|VIEW|GET|DOWNLOAD|EXPORT|FETCH)(?:_|$)/],
  ['UPDATE', /\b(UPDATE|MODIFY|SET|CHANGE|EDIT|MOVE|CONFIRM|CANCEL|ACCEPT|REJECT|REOPEN|RESTART|SEND|RETRY|MARK|RESOLVE|APPROVE|RETURN|VERIFY|FINALIZE|FORCE|UNCONFIRM|SUBMIT|PROCESS|PUBLISH|UNPUBLISH|REPLAN|RESET|UPSERT|TOGGLE|ARCHIVE|UNARCHIVE|SWAP|PROPOSE|ASSIGN|UNASSIGN|REPLACE|SIMULATE|GENERATE|REVOKE|GRANT|ANSWER|PIN_LOGIN|PREV_STATUS|NEXT_STATUS)(?:_|$)/],
  ['DELETE', /\b(DELETE|REMOVE|CLEAR|DISCARD|DROP)(?:_|$)/],
];

const SIMPLE_CRUD: Record<string, Crud> = {
  CREATE: 'CREATE', READ: 'READ', UPDATE: 'UPDATE', DELETE: 'DELETE',
};

function classifyCrud(shortName: string): Crud {
  if (SIMPLE_CRUD[shortName]) return SIMPLE_CRUD[shortName];
  for (const [crud, pat] of CRUD_PATTERNS) {
    if (pat.test(shortName)) return crud;
  }
  return 'OTHER';
}

interface InstanceParsed {
  instance: PermissionsInstance;
  overrides: Map<string, ActionOverride>;
  error: string | null;
}

export async function collectPermissions(): Promise<PermissionsData> {
  // 1. Hae Action.kt yhdesti ja jaettu kaikille
  const actionsRepo = PERMISSIONS_INSTANCES[0].repository;
  let actionKtSource = '';
  try {
    actionKtSource = await getFileContent(
      actionsRepo.owner,
      actionsRepo.name,
      ACTION_KT_PATH,
      actionsRepo.ref
    );
  } catch (err) {
    throw new Error(
      `Failed to fetch Action.kt from ${actionsRepo.owner}/${actionsRepo.name}@${actionsRepo.ref}: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  const baseActions = parseActionKt(actionKtSource);
  const baseRulesByAction = new Map<string, string[]>();
  const baseEntries = new Map<string, ParsedAction>();
  for (const action of baseActions) {
    baseRulesByAction.set(action.name, action.defaultRoles);
    baseEntries.set(action.name, action);
  }

  // 2. Hae per-kunta mapping-tiedostot rinnakkain
  const instanceResults: InstanceParsed[] = await Promise.all(
    PERMISSIONS_INSTANCES.map(async (instance) => {
      const overrides = new Map<string, ActionOverride>();
      let error: string | null = null;
      try {
        for (const path of instance.mappingPaths) {
          const source = await getFileContent(
            instance.repository.owner,
            instance.repository.name,
            path,
            instance.repository.ref
          );
          const parsed = parseActionRuleMapping(source);
          // Viimeisin voittaa: jos sama action määritellään useammin, korvataan
          for (const override of parsed.overrides) {
            overrides.set(override.action, override);
          }
        }
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
        console.warn(`Failed to collect permissions for ${instance.name}: ${error}`);
      }
      return { instance, overrides, error };
    })
  );

  // 3. Komposoi roolilistaukset per (action, kunta)
  // Per kunta, jokaiselle Action.kt:n actionille: jos override löytyy, sovella;
  // muuten käytä baseRules.
  const allActions = new Map<string, PermissionsAction>();
  for (const baseAction of baseActions) {
    const action: PermissionsAction = {
      name: baseAction.name,
      shortName: baseAction.shortName,
      category: baseAction.category,
      crud: classifyCrud(baseAction.shortName),
      label: actionLabel(baseAction.name, baseAction.shortName),
      rolesAllowed: {},
      contextByRole: {},
      contextNotes: {},
    };
    const defaults = baseAction.defaultRoles;
    for (const { instance, overrides } of instanceResults) {
      const override = overrides.get(baseAction.name);
      if (!override) {
        action.rolesAllowed[instance.id] = [...defaults];
        action.contextByRole[instance.id] = buildContextByRole(baseAction.defaultRoleRules);
        action.contextNotes[instance.id] = [];
        continue;
      }
      let resolvedRoles: string[];
      let roleRules;
      if (override.mode === 'replace') {
        resolvedRoles = [...override.added];
        roleRules = override.addedRoleRules;
      } else {
        resolvedRoles = unionSorted(defaults, override.added);
        // extend_default: yhdistä default + override-säännöt (roolikohtainen konteksti)
        roleRules = [...baseAction.defaultRoleRules, ...override.addedRoleRules];
      }
      action.rolesAllowed[instance.id] = resolvedRoles;
      action.contextByRole[instance.id] = buildContextByRole(roleRules);
      action.contextNotes[instance.id] = override.contextNotes;
    }
    allActions.set(baseAction.name, action);
  }

  // 4. Ryhmittely kategorialla
  const byCategory = new Map<string, PermissionsAction[]>();
  for (const action of allActions.values()) {
    const list = byCategory.get(action.category) ?? [];
    list.push(action);
    byCategory.set(action.category, list);
  }

  const categories: PermissionsCategory[] = Array.from(byCategory.entries())
    .map(([id, actions]) => ({
      id,
      label: categoryLabel(id),
      actions: actions.sort((a, b) => {
        const crudOrder: Crud[] = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'OTHER'];
        const ai = crudOrder.indexOf(a.crud);
        const bi = crudOrder.indexOf(b.crud);
        if (ai !== bi) return ai - bi;
        return a.shortName.localeCompare(b.shortName);
      }),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const cities: PermissionsCityMeta[] = instanceResults.map(({ instance, error }) => ({
    id: instance.id,
    name: instance.name,
    cityGroupId: instance.cityGroupId,
    error,
  }));

  return {
    generatedAt: new Date().toISOString(),
    sourceCommit: null,
    roles: PERMISSIONS_ROLES,
    roleLabels: PERMISSIONS_ROLE_LABELS,
    cityGroups: PERMISSIONS_CITY_GROUPS,
    cities,
    categories,
  };
}

function unionSorted(a: string[], b: string[]): string[] {
  const set = new Set<string>();
  for (const r of a) set.add(r);
  for (const r of b) set.add(r);
  return Array.from(set).sort();
}

/**
 * Yhdistä rooli-säännöt (HasGlobalRole + HasUnitRole + HasGroupRole) per-rooli-tason
 * kontekstijoukoksi. Rooli voi esiintyä useammassa säännössä — kontekstit yhdistyvät
 * unionina. Globaali sääntö = tyhjä konteksti (kuvastaa "ei rajoitusta").
 *
 * Esim. HasGlobalRole(ADMIN, SERVICE_WORKER) +
 *       HasUnitRole(STAFF).inPlacementUnitOfChild()
 * tuottaa:
 *   { ADMIN: [], SERVICE_WORKER: [], STAFF: ['inPlacementUnitOfChild'] }
 */
function buildContextByRole(roleRules: Array<{ kind: string; roles: string[]; contextNotes: string[] }>): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const rule of roleRules) {
    for (const role of rule.roles) {
      if (!result[role]) result[role] = [];
      for (const note of rule.contextNotes) {
        if (!result[role].includes(note)) result[role].push(note);
      }
    }
  }
  return result;
}

/**
 * For instances that errored, restore previously collected data so the
 * visualisation does not regress to "no rules" when GitHub is intermittently
 * unavailable.
 */
export function mergePermissionsFallback(
  current: PermissionsData,
  previous: PermissionsData
): void {
  const erroredCities = new Set(
    current.cities.filter((c) => c.error).map((c) => c.id)
  );
  if (erroredCities.size === 0) return;

  const prevActionLookup = new Map<string, PermissionsAction>();
  for (const cat of previous.categories) {
    for (const action of cat.actions) {
      prevActionLookup.set(action.name, action);
    }
  }

  for (const cat of current.categories) {
    for (const action of cat.actions) {
      const prevAction = prevActionLookup.get(action.name);
      if (!prevAction) continue;
      for (const cityId of erroredCities) {
        if (prevAction.rolesAllowed[cityId]) {
          action.rolesAllowed[cityId] = prevAction.rolesAllowed[cityId];
        }
        if (prevAction.contextNotes[cityId]) {
          action.contextNotes[cityId] = prevAction.contextNotes[cityId];
        }
      }
    }
  }

  current.errorFallbackDate = previous.generatedAt;
}
