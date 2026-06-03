/**
 * Käyttäjäoikeudet-matriisi (rivit suoraan Action.kt:n actioneista).
 *
 * Rakenne:
 *   - Sarakkeet: kuntaryhmät (Espoo / Tampereen seutu / Oulu / Turku)
 *     × roolit (11). Tampereen seudun ryhmä on aggregaatti — soluissa
 *     näytetään ✓ vain jos kaikki ryhmän kunnat samaa mieltä; muutoin
 *     erottelumerkki *.
 *   - Rivit: jokainen action saa oman rivinsä. Ryhmittely Action-kategorialla.
 *
 * Suodattimet: kuntavalinta (yksi ryhmä tai Vertaa), Näytä vain erot
 * (kuntaryhmien välillä), CRUD-rajaus, wildcard-haku action-nimeen tai
 * suomenkieliseen otsikkoon.
 */

import { getQueryParam } from '../router.js';
import { escapeHtml } from '../utils.js';

/**
 * Käännä yksi konteksti­rajoitus suomeksi. Sama logiikka kuin
 * src/config/permissions-labels.ts → contextNoteLabel(), mutta toistettu täällä,
 * koska tämä komponentti ei importtaa TypeScript-konfiguraatiota suoraan
 * (selaimen ESM-moduli, ei build-stepiä). Synkattava jos backendin käännös muuttuu.
 */
const CONTEXT_LABELS = {
  inPlacementPlanUnitOfApplication: 'vain hakemuksen sijoitussuunnitelman yksikössä',
  inPlacementUnitOfChild: 'vain lapsen sijoitusyksikössä',
  inPlacementUnitOfChildOfBackupCare: 'vain varasijoitetun lapsen sijoitusyksikössä',
  inUnit: 'vain omassa yksikössä',
  inAnyUnit: 'missä tahansa omassa yksikössä',
  inUnitOfGroup: 'vain ryhmän yksikössä',
};
const PILOT_FEATURE_LABELS = {
  MESSAGING: 'viestintä',
  MOBILE: 'mobiili',
  MOBILE_MESSAGING: 'mobiili-viestintä',
  RESERVATIONS: 'varaukset käytössä',
  VASU_AND_PEDADOC: 'vasu ja pedagogiset asiakirjat',
  PLACEMENT_TERMINATION: 'sijoituksen päättäminen',
  PUSH_NOTIFICATIONS: 'push-ilmoitukset',
  SERVICE_APPLICATIONS: 'palveluhakemukset',
  CLUB_VOUCHER: 'kerhon palveluseteli',
  STAFF_ATTENDANCE_INTEGRATION: 'henkilökunnan läsnäolointegraatio',
};
const PROVIDER_TYPE_LABELS = {
  MUNICIPAL: 'kunnallinen',
  MUNICIPAL_SCHOOL: 'kunnallinen koulu',
  PURCHASED: 'ostopalvelu',
  PRIVATE: 'yksityinen',
  PRIVATE_SERVICE_VOUCHER: 'yksityinen palveluseteli',
  EXTERNAL_PURCHASED: 'ulkoinen ostopalvelu',
};
function contextNoteLabel(note) {
  if (CONTEXT_LABELS[note]) return CONTEXT_LABELS[note];
  const fm = note.match(/^features=(.+)$/);
  if (fm) {
    const items = fm[1].split(',').map((f) => PILOT_FEATURE_LABELS[f.trim()] || f.trim());
    return `ominaisuudet käytössä: ${items.join(', ')}`;
  }
  const pm = note.match(/^providerTypes=(.+)$/);
  if (pm) {
    const items = pm[1].split(',').map((p) => PROVIDER_TYPE_LABELS[p.trim()] || p.trim());
    return `vain palveluntuottajatyypit: ${items.join(', ')}`;
  }
  return note;
}

const CRUD_LABELS = {
  CREATE: 'Luo',
  READ: 'Lue',
  UPDATE: 'Muokkaa',
  DELETE: 'Poista',
  OTHER: 'Muu',
};

const CRUD_FILTERS = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'OTHER'];

const CITY_GROUP_INITIALS = {
  espoo: 'Es',
  'tampere-region': 'Tre',
  oulu: 'Ou',
  turku: 'Tku',
};

export function renderPermissionsMatrix(data, opts = {}) {
  if (!data || !Array.isArray(data.categories) || data.categories.length === 0) {
    return '<div class="empty-state">Käyttäjäoikeustietoja ei löytynyt.</div>';
  }

  const cityGroups = data.cityGroups || [];
  const allGroupIds = cityGroups.map((g) => g.id);
  const cityGroupId = allGroupIds.includes(opts.cityGroup) || opts.cityGroup === 'compare'
    ? opts.cityGroup
    : 'espoo';
  const differencesOnly = !!opts.differencesOnly;
  const filterText = opts.filterText || '';
  const enabledCruds = new Set(opts.crudFilter && opts.crudFilter.length
    ? opts.crudFilter
    : CRUD_FILTERS);

  const roles = data.roles;
  const roleLabels = data.roleLabels || {};

  const groupButtons = `
    <div class="perm-city-group" role="group" aria-label="Kunta">
      ${cityGroups.map((g) => `<button class="perm-city-btn${cityGroupId === g.id ? ' active' : ''}" data-city-group="${escapeHtml(g.id)}">${escapeHtml(g.label)}</button>`).join('')}
      <button class="perm-city-btn${cityGroupId === 'compare' ? ' active' : ''}" data-city-group="compare">Vertaa</button>
    </div>
  `;

  const crudButtons = `
    <div class="perm-crud-filter" role="group" aria-label="Operaatiot">
      ${CRUD_FILTERS.map((c) => `<button class="perm-crud-btn perm-crud-btn-${c}${enabledCruds.has(c) ? ' active' : ''}" data-crud="${c}">${CRUD_LABELS[c]}</button>`).join('')}
    </div>
  `;

  const compareLegend = cityGroupId === 'compare'
    ? cityGroups.map((g) => `<span class="perm-legend-item"><b>${escapeHtml(CITY_GROUP_INITIALS[g.id] || g.id)}</b> = ${escapeHtml(g.label)}</span>`).join('')
    : '';

  const partialNote = cityGroupId === 'compare'
    ? '<span class="perm-legend-item"><span class="perm-initial-partial">*</span> kirjaimen jälkeen = rooli luvitettu vain osassa ryhmän kunnista</span>'
    : '<span class="perm-legend-item"><span class="perm-cell-partial">◐</span> = rooli luvitettu vain osassa ryhmän kunnista</span>';

  const diffLegendItem = cityGroupId === 'compare'
    ? ''
    : '<span class="perm-legend-item"><span class="perm-legend-diff-swatch"><span class="perm-cell-sym">✓</span><span class="perm-cell-diff-mark">*</span></span> keltaisella = tämän ryhmän tilanne eroaa muista kuntaryhmistä</span>';

  const ctxLegendItem = '<span class="perm-legend-item"><span class="perm-cell-ctx">⌖</span> = solu­kohtainen kontekstirajoitus (esim. vain lapsen sijoitusyksikössä) — tooltip selittää</span>';

  // Kerätään kaikki uniikit kontekstirajoitukset filterin tarjontaa varten
  const availableCtxNotes = collectAvailableContextNotes(data);
  const selectedCtx = new Set(opts.ctxFilter || []);

  const anomalyLegendItem = '<span class="perm-legend-item"><span class="perm-legend-anomaly-swatch"><span class="perm-cell-sym">✓</span><span class="perm-cell-anomaly-mark">⚠</span></span> punaisella = kirjoitusoikeus ilman lukuoikeutta samaan resurssiin (epäjohdonmukainen oikeus)</span>';

  const legend = `
    <div class="perm-legend">
      <span class="perm-legend-item"><span class="perm-cell-yes">✓</span> = rooli luvitettu${cityGroupId === 'compare' ? ' kaikissa kunnissa' : ''}</span>
      <span class="perm-legend-item"><span class="perm-cell-no">·</span> = rooli ei luvitettu${cityGroupId === 'compare' ? ' missään kunnassa' : ''}</span>
      ${partialNote}
      ${diffLegendItem}
      ${ctxLegendItem}
      ${anomalyLegendItem}
      ${compareLegend}
    </div>
  `;

  const ctxFilter = renderContextFilter(availableCtxNotes, selectedCtx);

  const toolbar = `
    <div class="perm-toolbar">
      ${groupButtons}
      <button class="perm-filter-btn${differencesOnly ? ' active' : ''}" id="perm-differences-toggle">Näytä vain erot</button>
      ${crudButtons}
      ${ctxFilter}
      <label class="perm-search-wrap">
        <span class="perm-search-label">Suodata (* ja ? toimivat)</span>
        <input type="search" id="perm-search" class="perm-search-input"
               placeholder="esim. *tuen* tai READ_*"
               value="${escapeHtml(filterText)}" autocomplete="off" />
      </label>
      <span class="perm-meta" id="perm-meta"></span>
    </div>
    ${legend}
  `;

  const headerCells = roles.map((r) => {
    const label = roleLabels[r] || r;
    return `<th class="perm-role-col" title="${escapeHtml(r)}">${escapeHtml(label)}</th>`;
  }).join('');

  const headerHtml = `
    <thead>
      <tr>
        <th class="perm-row-col perm-row-col-feature">Action</th>
        <th class="perm-row-col perm-row-col-crud">CRUD</th>
        ${headerCells}
      </tr>
    </thead>
  `;

  const anomalyIndex = buildAnomalyIndex(data, cityGroups);

  let sectionsHtml = '';
  for (const category of data.categories) {
    const rows = category.actions.map((action) => renderActionRow(action, roles, cityGroups, cityGroupId, enabledCruds, anomalyIndex));
    if (rows.every((r) => !r)) continue;
    const visibleRows = rows.filter(Boolean);
    sectionsHtml += `
      <div class="perm-category" data-category-id="${escapeHtml(category.id)}">
        <details open>
          <summary class="perm-category-header">${escapeHtml(category.label)} <span class="perm-category-count">(${visibleRows.length})</span></summary>
          <table class="perm-matrix">
            ${headerHtml}
            <tbody>${visibleRows.join('')}</tbody>
          </table>
        </details>
      </div>
    `;
  }

  if (!sectionsHtml) {
    sectionsHtml = '<div class="empty-state">Ei ryhmiä nykyisellä suodatuksella.</div>';
  }

  return `
    <div class="perm-view" data-city-group="${escapeHtml(cityGroupId)}">
      <h2>Käyttäjäoikeudet</h2>
      <p class="perm-desc">
        Rivit muodostettu suoraan koodista (<code>Action.kt</code> + per-kunta
        <code>ActionRuleMapping.kt</code> -tiedostot). Yksi rivi per action,
        sarakkeessa ✓ jos rooli on luvitettu. <b>Tampereen seutu</b> aggregoi
        Tampereen, Nokian, Kangasalan, Lempäälän, Oriveden, Pirkkalan, Vesilahden,
        Ylöjärven ja Hämeenkyrön — solun yläoikealla * jos kuntien välillä on eroja.
        Konteksti­rajoitukset (esim. <em>inPlacementUnitOfChild</em>) näkyvät tooltipissä.
      </p>
      ${toolbar}
      <div class="perm-sticky-header" id="perm-sticky-header" aria-hidden="true" style="display:none"></div>
      <div class="perm-table-wrap">${sectionsHtml}</div>
      <div class="empty-state" id="perm-empty-msg" style="display:none">Ei rivejä nykyisellä suodatuksella.</div>
    </div>
  `;
}

/**
 * Päättele resurssi-avain action-nimestä. Sama "resurssi" tarkoittaa että
 * READ / CREATE / UPDATE / DELETE toimivat saman objektin yli, ja siten
 * niiden roolioikeudet ovat verrannollisia.
 *
 * Esimerkit:
 *   Action.AssistanceAction.READ       → "AssistanceAction:" (sama kuin .UPDATE, .DELETE)
 *   Action.AssistanceAction.UPDATE     → "AssistanceAction:"
 *   Action.Child.READ_ASSISTANCE       → "Child:ASSISTANCE"
 *   Action.Child.CREATE_ASSISTANCE_FACTOR → "Child:ASSISTANCE_FACTOR"
 *   Action.Global.PIN_LOGIN            → null (ei resurssi-toiminto)
 */
function parseResourceKey(action) {
  const short = action.shortName;
  if (short === 'READ' || short === 'CREATE' || short === 'UPDATE' || short === 'DELETE') {
    return `${action.category}:`;
  }
  const prefixMatch = short.match(/^(READ|CREATE|UPDATE|DELETE)_(.+)$/);
  if (prefixMatch) {
    // Yksikkö/monikko-yhdistäminen: READ_ASSISTANCES ja READ_ASSISTANCE viittaavat samaan
    // perusobjektiin → strippaa trailing 'S' johdonmukaisuuden vuoksi
    let obj = prefixMatch[2];
    obj = obj.replace(/S$/, '');
    return `${action.category}:${obj}`;
  }
  return null;
}

/**
 * Esikäsittele anomalia-indeksi: per (resourceKey, role, cityGroupId) merkintä,
 * kun roolilla on luvitettu KIRJOITUSOIKEUS (CREATE/UPDATE/DELETE), mutta EI
 * lukuoikeutta samaan resurssiin. Tämä tunnistaa eVakassa olemassa olevan
 * "see no evil" -anomalian (esim. SERVICE_WORKER päivittää AssistanceAction:in
 * mutta ei pysty lukemaan sitä).
 *
 * Aggregointi cityGroup-tasolla: anomalia on ryhmälle jos
 *   - rooli on luvitettu johonkin write-actioniin VÄHINTÄÄN yhdessä ryhmän kunnassa
 *   - JA kaikki ryhmän kunnat kieltävät kaikki resurssin read-actionit
 */
function buildAnomalyIndex(data, cityGroups) {
  // resourceKey -> { reads: action[], writes: action[] }
  const byResource = new Map();
  for (const cat of data.categories) {
    for (const action of cat.actions) {
      const key = parseResourceKey(action);
      if (!key) continue;
      if (!byResource.has(key)) byResource.set(key, { reads: [], writes: [] });
      const bucket = byResource.get(key);
      if (action.crud === 'READ') bucket.reads.push(action);
      else if (action.crud === 'CREATE' || action.crud === 'UPDATE' || action.crud === 'DELETE') {
        bucket.writes.push(action);
      }
    }
  }
  // resourceKey -> { role -> Set<cityGroupId> }
  const anomalies = new Map();
  for (const [key, { reads, writes }] of byResource) {
    if (reads.length === 0 || writes.length === 0) continue;
    for (const role of data.roles) {
      for (const cityGroup of cityGroups) {
        const anyReadAllowed = reads.some((a) => aggregateGroupValue(a, role, cityGroup) !== 'none');
        const anyWriteAllowed = writes.some((a) => aggregateGroupValue(a, role, cityGroup) !== 'none');
        if (anyWriteAllowed && !anyReadAllowed) {
          if (!anomalies.has(key)) anomalies.set(key, new Map());
          const roleMap = anomalies.get(key);
          if (!roleMap.has(role)) roleMap.set(role, new Set());
          roleMap.get(role).add(cityGroup.id);
        }
      }
    }
  }
  return anomalies;
}

function isAnomalyForCell(action, role, cityGroupId, anomalyIndex) {
  if (action.crud !== 'CREATE' && action.crud !== 'UPDATE' && action.crud !== 'DELETE') return false;
  const key = parseResourceKey(action);
  if (!key) return false;
  const roleMap = anomalyIndex.get(key);
  if (!roleMap) return false;
  const groups = roleMap.get(role);
  if (!groups) return false;
  return groups.has(cityGroupId);
}

function renderActionRow(action, roles, cityGroups, cityGroupId, enabledCruds, anomalyIndex) {
  if (!enabledCruds.has(action.crud)) return '';

  const finnishLabel = action.label || action.shortName;
  // Suodatusavaimena nimi, lyhytnimi ja suomenkielinen otsikko — käyttäjä voi hakea kaikilla
  const searchHaystack = `${action.name} ${action.shortName} ${finnishLabel}`.toLowerCase();
  const cells = roles.map((role) => renderCell(action, role, cityGroups, cityGroupId, anomalyIndex)).join('');
  const differs = doesActionDiffer(action, cityGroups);

  // Per kuntaryhmä: kerää lista kontekstirajoituksista joita rivissä esiintyy
  // (kaikkien roolien yli). Käytetään filterissä — rivi näkyy jos valittu
  // kontekstirajoitus löytyy oikeasta kuntaryhmästä (tai vertailussa unionista).
  const ctxAttrs = cityGroups.map((g) => {
    const notes = new Set();
    for (const cityId of g.cities) {
      const ctxByRole = (action.contextByRole && action.contextByRole[cityId]) || {};
      for (const role of Object.keys(ctxByRole)) {
        for (const note of ctxByRole[role] || []) notes.add(note);
      }
    }
    // Erotin '|' eikä ',' — note-arvot voivat itse sisältää pilkkuja
    // (esim. "providerTypes=MUNICIPAL,MUNICIPAL_SCHOOL")
    return `data-ctx-${escapeHtml(g.id)}="${escapeHtml(Array.from(notes).sort().join('|'))}"`;
  }).join(' ');

  return `
    <tr class="perm-row"
        data-haystack="${escapeHtml(searchHaystack)}"
        data-shortname="${escapeHtml(action.shortName.toLowerCase())}"
        data-action="${escapeHtml(action.name.toLowerCase())}"
        data-crud="${action.crud}"
        data-differs="${differs ? 'true' : 'false'}"
        ${ctxAttrs}>
      <td class="perm-row-col perm-row-col-feature">
        <span class="perm-feature-label" title="${escapeHtml(action.name)}">${escapeHtml(finnishLabel)}</span>
        <span class="perm-shortname-tag" title="${escapeHtml(action.name)}">${escapeHtml(action.shortName)}</span>
        <button type="button" class="perm-copy-btn" data-copy="${escapeHtml(action.name)}" title="Kopioi tekninen nimi leikepöydälle: ${escapeHtml(action.name)}" aria-label="Kopioi ${escapeHtml(action.name)}">⧉</button>
      </td>
      <td class="perm-row-col perm-row-col-crud">
        <span class="perm-crud-pill perm-crud-${action.crud}">${CRUD_LABELS[action.crud] || action.crud}</span>
      </td>
      ${cells}
    </tr>
  `;
}

function aggregateGroupValue(action, role, group) {
  // Onko rooli luvitettu KAIKILLE ryhmän kunnille / OSALLE / EI YHDELLEKÄÄN?
  const states = group.cities.map((cityId) => (action.rolesAllowed[cityId] || []).includes(role));
  if (states.every((s) => s)) return 'all';
  if (states.every((s) => !s)) return 'none';
  return 'partial';
}

/**
 * Kerää kuntaryhmälle ja yhdelle roolille aktiiviset kontekstirajoitukset
 * käännettyinä. Palauttaa union-listan käännetyistä rajoituksista (toistot
 * poistetaan). Jos rooli on luvitettu ryhmässä TYHJÄLLÄ kontekstilla
 * (esim. ADMIN-globaalin sääntö), palauttaa tyhjän listan — ei rajoitusta.
 */
function groupContextNotesForRole(action, group, role) {
  const seen = new Set();
  const labels = [];
  for (const cityId of group.cities) {
    const ctxByRole = action.contextByRole && action.contextByRole[cityId];
    if (!ctxByRole) continue;
    const notes = ctxByRole[role];
    if (!notes) continue;
    // Jos roolilla ON sääntö ja se ON tyhjä konteksti (= globaali), ei rajoitusta
    if (notes.length === 0) {
      return [];
    }
    for (const note of notes) {
      const lbl = contextNoteLabel(note);
      if (!seen.has(lbl)) {
        seen.add(lbl);
        labels.push(lbl);
      }
    }
  }
  return labels;
}

function renderContextIndicator(notes) {
  if (!notes.length) return '';
  const title = `Kontekstirajoitus:\n  ${notes.join('\n  ')}`;
  return `<span class="perm-cell-ctx" title="${escapeHtml(title)}" aria-label="kontekstirajoitus">⌖</span>`;
}

/**
 * Käy datan läpi ja kerää uniikit kontekstirajoituksen avaimet (raakana,
 * esim. "inPlacementUnitOfChild", "features=MOBILE,RESERVATIONS"). Lasketaan
 * myös kuinka monessa actionissa kukin esiintyy — käytetään dropdownin
 * näyttämisessä.
 */
function collectAvailableContextNotes(data) {
  const counts = new Map();
  for (const cat of data.categories) {
    for (const action of cat.actions) {
      const seenInAction = new Set();
      const ctxByCity = action.contextByRole || {};
      for (const cityId of Object.keys(ctxByCity)) {
        const ctxByRole = ctxByCity[cityId] || {};
        for (const role of Object.keys(ctxByRole)) {
          for (const note of ctxByRole[role] || []) {
            seenInAction.add(note);
          }
        }
      }
      for (const note of seenInAction) {
        counts.set(note, (counts.get(note) || 0) + 1);
      }
    }
  }
  const items = Array.from(counts.entries())
    .map(([key, count]) => ({ key, label: contextNoteLabel(key), count }))
    .sort((a, b) => a.label.localeCompare(b.label, 'fi'));
  return items;
}

function renderContextFilter(items, selectedCtx) {
  if (items.length === 0) return '';
  const checkboxes = items
    .map((it) => {
      const checked = selectedCtx.has(it.key) ? ' checked' : '';
      return `
        <label class="perm-ctx-filter-item">
          <input type="checkbox" value="${escapeHtml(it.key)}"${checked} />
          <span class="perm-ctx-filter-label">${escapeHtml(it.label)}</span>
          <span class="perm-ctx-filter-count">${it.count}</span>
        </label>
      `;
    })
    .join('');
  const summaryText = selectedCtx.size === 0
    ? `Kontekstirajoitukset (${items.length})`
    : `Kontekstirajoitukset (${selectedCtx.size}/${items.length} valittu)`;
  return `
    <details class="perm-ctx-filter" id="perm-ctx-filter">
      <summary class="perm-ctx-filter-summary">
        <span id="perm-ctx-filter-summary-text">${escapeHtml(summaryText)}</span>
      </summary>
      <div class="perm-ctx-filter-popup">
        <div class="perm-ctx-filter-list">
          ${checkboxes}
        </div>
        <button type="button" class="perm-ctx-filter-clear" id="perm-ctx-filter-clear">Tyhjennä valinta</button>
      </div>
    </details>
  `;
}

/**
 * Selittävä lausuma kuntaryhmän tilanteesta yhdelle roolille. Palauttaa
 * eri sanamuodon yhden-kunnan ryhmälle (Espoo/Oulu/Turku) ja monikunta-ryhmälle
 * (Tampereen seutu), jotta "kaikki" / "ei kukaan" ei jää harhaanjohtavaksi.
 */
function stateDescription(state, group) {
  const isSingle = group.cities.length === 1;
  if (state === 'all') {
    return isSingle ? 'rooli luvitettu' : 'rooli luvitettu kaikissa ryhmän kunnissa';
  }
  if (state === 'none') {
    return isSingle ? 'rooli ei luvitettu' : 'rooli ei luvitettu yhdessäkään ryhmän kunnassa';
  }
  return 'rooli luvitettu vain osassa ryhmän kunnista';
}

function renderCell(action, role, cityGroups, cityGroupId, anomalyIndex) {
  if (cityGroupId === 'compare') {
    // Per kuntaryhmä yksi merkki
    const states = cityGroups.map((g) => ({ g, state: aggregateGroupValue(action, role, g) }));
    const allYes = states.every((s) => s.state === 'all');
    const noneYes = states.every((s) => s.state === 'none');
    // Anomalia: onko jossain kuntaryhmässä kirjoitusoikeus ilman lukuoikeutta?
    const anomalyGroups = anomalyIndex
      ? cityGroups.filter((g) => isAnomalyForCell(action, role, g.id, anomalyIndex))
      : [];
    const isAnomaly = anomalyGroups.length > 0;
    const anomalyTitle = isAnomaly
      ? `\n\n⚠ Anomalia: ${anomalyGroups.map((g) => g.label).join(', ')}: roolilla on kirjoitusoikeus ilman lukuoikeutta samaan resurssiin.`
      : '';

    // Kontekstirajoitukset: kerää union kaikista kuntaryhmistä, joissa rooli on luvitettu.
    // Jos ainakin yhdessä ryhmässä on tyhjä konteksti (globaali) JA toisessa rajoitettu,
    // näytetään silti ⌖, koska compare-tila vertailee kaikkia kuntaryhmiä.
    const ctxParts = [];
    const seenCtx = new Set();
    for (const s of states) {
      if (s.state !== 'all' && s.state !== 'partial') continue;
      const ctxNotes = groupContextNotesForRole(action, s.g, role);
      if (ctxNotes.length === 0) continue;
      for (const note of ctxNotes) {
        const key = `${s.g.id}:${note}`;
        if (seenCtx.has(key)) continue;
        seenCtx.add(key);
        ctxParts.push(`  ${s.g.label}: ${note}`);
      }
    }
    const ctxIndicator = ctxParts.length > 0
      ? `<span class="perm-cell-ctx" title="${escapeHtml('Kontekstirajoitus:\n' + ctxParts.join('\n'))}" aria-label="kontekstirajoitus">⌖</span>`
      : '';

    if (allYes) {
      const cls = isAnomaly ? 'perm-cell-yes perm-cell-anomaly' : 'perm-cell-yes';
      const mark = isAnomaly ? '<span class="perm-cell-anomaly-mark" aria-hidden="true">⚠</span>' : '';
      return `<td class="perm-cell ${cls}" title="${escapeHtml('Rooli luvitettu kaikissa kunnissa' + anomalyTitle)}">✓${mark}${ctxIndicator}</td>`;
    }
    if (noneYes) {
      return `<td class="perm-cell perm-cell-no" title="Rooli ei luvitettu missään kunnassa">·</td>`;
    }
    const parts = states.map((s) => {
      const letter = CITY_GROUP_INITIALS[s.g.id] || (s.g.label || s.g.id).slice(0, 2);
      if (s.state === 'all') return `<span class="perm-initial-yes">${escapeHtml(letter)}</span>`;
      if (s.state === 'partial') return `<span class="perm-initial-partial">${escapeHtml(letter)}*</span>`;
      return `<span class="perm-initial-no">${escapeHtml(letter)}</span>`;
    }).join(' ');
    const title = states.map((s) => `${s.g.label}: ${stateDescription(s.state, s.g)}`).join('\n');
    const cls = isAnomaly ? 'perm-cell-mixed perm-cell-anomaly' : 'perm-cell-mixed';
    const mark = isAnomaly ? '<span class="perm-cell-anomaly-mark" aria-hidden="true">⚠</span>' : '';
    return `<td class="perm-cell ${cls}" title="${escapeHtml(title + anomalyTitle)}">${parts}${mark}${ctxIndicator}</td>`;
  }
  const group = cityGroups.find((g) => g.id === cityGroupId);
  if (!group) return `<td class="perm-cell perm-cell-na">–</td>`;
  const state = aggregateGroupValue(action, role, group);
  const otherGroups = cityGroups.filter((g) => g.id !== group.id);
  const otherStates = otherGroups.map((g) => ({
    g,
    state: aggregateGroupValue(action, role, g),
  }));
  const differs = !otherStates.every((s) => s.state === state);

  // Kontekstirajoitukset näytetään vain kun rooli on luvitettu (yes/partial)
  // JA juuri tällä roolilla on rajoitus tässä kuntaryhmässä (esim. STAFF on
  // unit-rajattu, mutta ADMIN samalle actionille on globaali → tyhjä lista).
  const ctxNotes = (state === 'all' || state === 'partial')
    ? groupContextNotesForRole(action, group, role)
    : [];
  const ctxIndicator = renderContextIndicator(ctxNotes);

  // Anomalia: onko tässä ryhmässä kirjoitusoikeus ilman lukuoikeutta?
  const anomaly = anomalyIndex
    ? isAnomalyForCell(action, role, cityGroupId, anomalyIndex)
    : false;
  const anomalyMark = anomaly ? '<span class="perm-cell-anomaly-mark" aria-hidden="true">⚠</span>' : '';
  const anomalyCls = anomaly ? ' perm-cell-anomaly' : '';
  const anomalyTitle = anomaly
    ? '\n\n⚠ Anomalia: roolilla on kirjoitusoikeus tähän resurssiin, mutta ei lukuoikeutta. ' +
      'Lue koodista samaan kategoriaan kuuluvat READ_-actionit ja vertaa.'
    : '';

  if (state === 'partial') {
    const allowedCities = group.cities
      .filter((cityId) => (action.rolesAllowed[cityId] || []).includes(role));
    const title = `Rooli luvitettu vain osassa ryhmän kunnista: ${allowedCities.join(', ')}${anomalyTitle}`;
    return `<td class="perm-cell perm-cell-partial${anomalyCls}" title="${escapeHtml(title)}">◐${anomalyMark}${ctxIndicator}</td>`;
  }

  const sym = state === 'all' ? '✓' : '·';
  const cls = state === 'all' ? 'perm-cell-yes' : 'perm-cell-no';
  if (!differs) {
    const title = stateDescription(state, group) + anomalyTitle;
    return `<td class="perm-cell ${cls}${anomalyCls}" title="${escapeHtml(title)}">${sym}${anomalyMark}${ctxIndicator}</td>`;
  }
  // Diff: tämän ryhmän tilanne eroaa muista — lisää asteriski-merkki ja selittävä tooltip
  const sym2 = state === 'all' ? '✓' : '·';
  const otherSummary = otherStates
    .map((s) => `  ${s.g.label}: ${stateDescription(s.state, s.g)}`)
    .join('\n');
  const title = `${group.label}: ${stateDescription(state, group)} ${sym2}\n` +
    `Muissa kuntaryhmissä eri tilanne:\n${otherSummary}\n\n` +
    '* = merkitsee solun, jossa tämän kuntaryhmän tilanne eroaa muista kuntaryhmistä.' +
    anomalyTitle;
  return `<td class="perm-cell ${cls} perm-cell-diff${anomalyCls}" title="${escapeHtml(title)}">` +
    `<span class="perm-cell-sym">${sym}</span>` +
    `<span class="perm-cell-diff-mark" aria-hidden="true">*</span>` +
    anomalyMark +
    ctxIndicator +
    `</td>`;
}

function doesActionDiffer(action, cityGroups) {
  // Vertailee per ryhmä saatuja role-listoja. Jos kaikki ryhmät tuottavat
  // saman aggregaatin (käytetään union-of-all eli kaikki ryhmän kunnat),
  // ei eroa.
  // Yksinkertaisempi sopii: vertaa per ryhmä jokaiselle roolille ja tarkista
  // ovatko ryhmien aggregaatit kaikki samaa.
  const allRoles = new Set();
  for (const cities of Object.values(action.rolesAllowed)) {
    for (const r of cities) allRoles.add(r);
  }
  for (const role of allRoles) {
    const states = cityGroups.map((g) => aggregateGroupValue(action, role, g));
    if (!states.every((s) => s === states[0])) return true;
  }
  return false;
}

/** Muunna kebab-case attribuuttinimi camelCase data-* -avaimeksi (DOMStringMap). */
function toCamelCase(s) {
  return s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
}

/**
 * Käyttäjän kirjoittama wildcard-pattern → RegExp.
 *
 * Käyttäjäystävällinen tulkinta:
 *   - `create`     → contains: löytää "..create.."
 *   - `*create`    → contains: löytää "..create.." (alkupään `*` toimii kuten implicit prefix)
 *   - `create*`    → contains: löytää "create.." (loppupään `*` toimii kuten implicit suffix)
 *   - `*create*`   → contains (selkeästi merkitty)
 *   - `assistance*action` → "assistance" sitten mitä tahansa, sitten "action"
 *   - `?reate`     → mikä tahansa yksi merkki + "reate"
 *
 * Eli wildcard-merkit määrittävät MITEN match etenee, mutta ankkurointia ei
 * koskaan vaadita käyttäjältä — contains-semantiikka on oletus.
 */
function wildcardToRegex(pattern) {
  const trimmed = (pattern || '').trim().toLowerCase();
  if (!trimmed) return null;
  let re = '';
  for (const ch of trimmed) {
    if (ch === '*') re += '.*';
    else if (ch === '?') re += '.';
    else re += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  // Aina contains-haku: lisätään `.*` joka päähän jos se ei jo ole (* alussa/lopussa).
  // RegExp.test() löytää vain ensimmäisen osuman, joten `^...$`-ankkurointi
  // tarvitsee `.*` jos haluamme contains-tulkinnan.
  if (!trimmed.startsWith('*')) re = `.*${re}`;
  if (!trimmed.endsWith('*')) re = `${re}.*`;
  try {
    return new RegExp(`^${re}$`);
  } catch {
    return null;
  }
}

function applyFilters() {
  const filterInput = document.getElementById('perm-search');
  const filterText = filterInput ? filterInput.value : '';
  const regex = wildcardToRegex(filterText);
  const diffOnly = document.getElementById('perm-differences-toggle')?.classList.contains('active');
  const enabledCruds = new Set(
    Array.from(document.querySelectorAll('.perm-crud-btn.active')).map((b) => b.dataset.crud)
  );
  const selectedCtx = new Set(
    Array.from(document.querySelectorAll('.perm-ctx-filter-item input[type="checkbox"]:checked')).map((cb) => cb.value)
  );
  const cityGroup = document.querySelector('.perm-view')?.dataset.cityGroup || 'espoo';
  // Vertailussa rivi täyttää ctx-filterin jos MIKÄ TAHANSA kuntaryhmä sisältää valitun rajoituksen.
  // Yksittäisessä kuntaryhmässä vain sen ryhmän attribuutti.
  const ctxAttrNames = cityGroup === 'compare'
    ? Array.from(document.querySelectorAll('.perm-city-btn'))
        .map((b) => b.dataset.cityGroup)
        .filter((g) => g && g !== 'compare')
        .map((g) => `ctx-${g}`)
    : [`ctx-${cityGroup}`];

  let visible = 0;
  let total = 0;
  document.querySelectorAll('.perm-row').forEach((row) => {
    total++;
    const haystack = row.dataset.haystack || `${row.dataset.shortname} ${row.dataset.action}`;
    const matchesText = !regex || regex.test(haystack);
    const matchesDiff = !diffOnly || row.dataset.differs === 'true';
    const matchesCrud = enabledCruds.size === 0 || enabledCruds.has(row.dataset.crud);

    let matchesCtx = true;
    if (selectedCtx.size > 0) {
      matchesCtx = false;
      for (const attr of ctxAttrNames) {
        const raw = row.dataset[toCamelCase(attr)];
        if (!raw) continue;
        // Erotin '|' — sama kuin renderöidessä, koska note-arvot voivat sisältää pilkkuja
        const notes = raw.split('|');
        for (const note of notes) {
          if (selectedCtx.has(note)) { matchesCtx = true; break; }
        }
        if (matchesCtx) break;
      }
    }

    const show = matchesText && matchesDiff && matchesCrud && matchesCtx;
    row.classList.toggle('perm-hidden', !show);
    if (show) visible++;
  });

  document.querySelectorAll('.perm-category').forEach((cat) => {
    const visibleRows = cat.querySelectorAll('.perm-row:not(.perm-hidden)');
    cat.classList.toggle('perm-category-hidden', visibleRows.length === 0);
    const countEl = cat.querySelector('.perm-category-count');
    if (countEl) countEl.textContent = `(${visibleRows.length})`;
  });

  const meta = document.getElementById('perm-meta');
  if (meta) meta.textContent = `Näytetään ${visible} / ${total} action${visible === 1 ? '' : 'ia'}`;
  const emptyMsg = document.getElementById('perm-empty-msg');
  if (emptyMsg) emptyMsg.style.display = visible === 0 ? '' : 'none';
}

function updateQuerySilent(name, value) {
  const hash = window.location.hash || '#/';
  const [pathPart, queryPart] = hash.slice(1).split('?');
  const params = new URLSearchParams(queryPart || '');
  if (value === null || value === undefined || value === '') {
    params.delete(name);
  } else {
    params.set(name, value);
  }
  const qs = params.toString();
  const newHash = '#' + (pathPart || '/') + (qs ? '?' + qs : '');
  history.replaceState(null, '', newHash);
}

export function bindPermissionsMatrixEvents() {
  applyFilters();

  document.querySelectorAll('.perm-city-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const group = btn.dataset.cityGroup;
      updateQuerySilent('city', group === 'espoo' ? null : group);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
  });

  const diffToggle = document.getElementById('perm-differences-toggle');
  if (diffToggle) {
    diffToggle.addEventListener('click', () => {
      diffToggle.classList.toggle('active');
      const active = diffToggle.classList.contains('active');
      updateQuerySilent('differencesOnly', active ? 'true' : null);
      applyFilters();
    });
  }

  document.querySelectorAll('.perm-crud-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      const enabled = Array.from(document.querySelectorAll('.perm-crud-btn.active'))
        .map((b) => b.dataset.crud);
      const allEnabled = enabled.length === CRUD_FILTERS.length;
      updateQuerySilent('crud', allEnabled ? null : enabled.join(','));
      applyFilters();
    });
  });

  const search = document.getElementById('perm-search');
  if (search) {
    let timer = null;
    search.addEventListener('input', () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        updateQuerySilent('q', search.value || null);
        applyFilters();
      }, 120);
    });
  }

  // Kontekstirajoituksen dropdown — checkboxit ja URL-tila
  const ctxFilter = document.getElementById('perm-ctx-filter');
  if (ctxFilter) {
    const updateSummary = () => {
      const checked = ctxFilter.querySelectorAll('input[type="checkbox"]:checked');
      const total = ctxFilter.querySelectorAll('input[type="checkbox"]').length;
      const text = checked.length === 0
        ? `Kontekstirajoitukset (${total})`
        : `Kontekstirajoitukset (${checked.length}/${total} valittu)`;
      const txt = document.getElementById('perm-ctx-filter-summary-text');
      if (txt) txt.textContent = text;
      const values = Array.from(checked).map((cb) => cb.value);
      updateQuerySilent('ctx', values.length ? values.join(',') : null);
      // Lisää active-luokka summaryyn jos jotain valittu, jotta ulkoasu kertoo siitä
      ctxFilter.querySelector('.perm-ctx-filter-summary')?.classList.toggle('active', checked.length > 0);
    };
    ctxFilter.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.addEventListener('change', () => {
        updateSummary();
        applyFilters();
      });
    });
    const clearBtn = document.getElementById('perm-ctx-filter-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        ctxFilter.querySelectorAll('input[type="checkbox"]').forEach((cb) => { cb.checked = false; });
        updateSummary();
        applyFilters();
      });
    }
    updateSummary();
  }

  // Action-sarakkeen kopiointi-napit: kopioi tekninen action-nimi leikepöydälle
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.perm-copy-btn');
    if (!btn) return;
    e.preventDefault();
    const text = btn.dataset.copy;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      flashCopyFeedback(btn, 'Kopioitu!');
    } catch {
      // Fallback ilman clipboard-API:a: valitse teksti ja kehota käyttäjää copy-näppäimeen
      const range = document.createRange();
      const tmp = document.createElement('span');
      tmp.textContent = text;
      document.body.appendChild(tmp);
      range.selectNode(tmp);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
      try { document.execCommand('copy'); flashCopyFeedback(btn, 'Kopioitu!'); }
      catch { flashCopyFeedback(btn, 'Virhe'); }
      window.getSelection()?.removeAllRanges();
      document.body.removeChild(tmp);
    }
  });

  setupStickyHeader();
}

function flashCopyFeedback(btn, msg) {
  const original = btn.textContent;
  btn.classList.add('perm-copy-btn-active');
  btn.textContent = '✓';
  btn.dataset.originalLabel = original;
  setTimeout(() => {
    btn.textContent = btn.dataset.originalLabel || '⧉';
    btn.classList.remove('perm-copy-btn-active');
    delete btn.dataset.originalLabel;
  }, 1200);
}

/**
 * Floating sticky-header joka näyttää aina viewportin yläreunassa olevan
 * kategorian thead-rivin. Toolbarin alapuolella on yksi <div>, jonka sisältö
 * (table + thead) päivitetään scroll-tapahtumissa.
 *
 * Tarvitaan koska jokaisella kategorialla on oma <table> ja kunkin oma thead
 * `position: sticky` rajoittuu omaan parent-tableensa — taulukoiden välissä
 * syntyy aukko jossa otsikkoa ei näy.
 */
function setupStickyHeader() {
  const sticky = document.getElementById('perm-sticky-header');
  if (!sticky) return;
  const toolbar = document.querySelector('.perm-toolbar');
  const legend = document.querySelector('.perm-legend');

  function getToolbarBottom() {
    const tbRect = toolbar?.getBoundingClientRect();
    const lgRect = legend?.getBoundingClientRect();
    return Math.max(0, (tbRect?.bottom ?? 0), (lgRect?.bottom ?? 0));
  }

  function findVisibleCategory(threshold) {
    const cats = document.querySelectorAll('.perm-category:not(.perm-category-hidden)');
    for (const cat of cats) {
      const rect = cat.getBoundingClientRect();
      // Kategoria katsotaan "aktiiviseksi" kun sen yläreuna on threshold:n yläpuolella
      // ja alareuna sen alapuolella. Eli viewportin ylin näkyvä kategoria.
      if (rect.top <= threshold && rect.bottom > threshold) {
        return cat;
      }
    }
    return null;
  }

  let renderedFor = null;
  function update() {
    const threshold = getToolbarBottom() + 4;
    const cat = findVisibleCategory(threshold);
    if (!cat) {
      sticky.style.display = 'none';
      renderedFor = null;
      return;
    }
    const ownThead = cat.querySelector('.perm-matrix thead');
    if (!ownThead) {
      sticky.style.display = 'none';
      return;
    }
    // Piilota sticky-header jos kategorian oma thead on jo viewportissa
    // (välttää päällekkäisen näyttämisen)
    const theadRect = ownThead.getBoundingClientRect();
    if (theadRect.top >= threshold) {
      sticky.style.display = 'none';
      return;
    }

    // Synkronoi sarakerakenne kategorian taulukon kanssa
    const sourceTable = cat.querySelector('.perm-matrix');
    const sourceRect = sourceTable.getBoundingClientRect();
    const categoryId = cat.dataset.categoryId;
    const categoryLabel = cat.querySelector('.perm-category-header')?.firstChild?.textContent?.trim()
      || categoryId;

    // Renderöi koko sisältö uudestaan jos kategoria vaihtui
    if (renderedFor !== categoryId) {
      sticky.innerHTML = `
        <div class="perm-sticky-label">${escapeHtml(categoryLabel)}</div>
        <table class="perm-matrix perm-sticky-table">
          <colgroup></colgroup>
          ${ownThead.outerHTML}
        </table>
      `;
      renderedFor = categoryId;
    }

    // Päivitä leveydet ja sijainti AINA — selaimen leveyden muutos kasvattaa/kaventaa
    // taulukkoa, ja sticky-headerin täytyy seurata
    const ths = ownThead.querySelectorAll('th');
    const widths = Array.from(ths).map((th) => th.getBoundingClientRect().width);
    const colgroup = sticky.querySelector('colgroup');
    if (colgroup) {
      const cols = colgroup.querySelectorAll('col');
      if (cols.length !== widths.length) {
        colgroup.innerHTML = widths.map((w) => `<col style="width: ${w}px">`).join('');
      } else {
        cols.forEach((col, i) => { col.style.width = `${widths[i]}px`; });
      }
    }
    const stickyTable = sticky.querySelector('.perm-sticky-table');
    if (stickyTable) {
      stickyTable.style.width = `${sourceRect.width}px`;
    }
    sticky.style.left = `${sourceRect.left}px`;
    sticky.style.width = `${sourceRect.width}px`;
    sticky.style.top = `${getToolbarBottom()}px`;
    sticky.style.display = '';
  }

  // Tarkkaillaan kategoria-elementtejä IntersectionObserverilla + scroll-tapahtumalla
  // (IntersectionObserver yksin ei riitä koska tarvitaan myös position-laskenta).
  const onScroll = () => requestAnimationFrame(update);
  document.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  // Päivitä kun details/summary avataan tai suljetaan
  document.querySelectorAll('.perm-category details').forEach((d) => {
    d.addEventListener('toggle', onScroll);
  });
  // Tarkkaile kaikkien kategoria-taulukoiden kokoa — esim. selaimen leveyden muutos
  // tai content-reflow käynnistää päivityksen, jotta sticky-header seuraa leveyttä.
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => requestAnimationFrame(update));
    document.querySelectorAll('.perm-category .perm-matrix').forEach((tbl) => ro.observe(tbl));
    // Tarkkaile myös main-elementtiä jonka leveyden muutos vaikuttaa taulukon leveyteen
    const main = document.querySelector('main');
    if (main) ro.observe(main);
  }
  update();
}
