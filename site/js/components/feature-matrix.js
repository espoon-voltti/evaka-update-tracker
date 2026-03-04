/**
 * Feature matrix comparison component.
 * Displays feature flags across cities as a side-by-side table.
 */

import { getQueryParam, setQueryParam } from '../router.js';

/**
 * City groups to display as columns.
 * Tampere-region cities are aggregated into a single "Tampereen seutu" column.
 */
const CITY_GROUPS = [
  { id: 'espoo', label: 'Espoo', cities: ['espoo'] },
  {
    id: 'tampere-region',
    label: 'Tampereen seutu',
    cities: [
      'tampere',
      'nokia',
      'kangasala',
      'lempaala',
      'orivesi',
      'pirkkala',
      'vesilahti',
      'ylojarvi',
      'hameenkyro',
    ],
  },
  { id: 'oulu', label: 'Oulu', cities: ['oulu'] },
  { id: 'turku', label: 'Turku', cities: ['turku'] },
];

export function renderFeatureMatrix(data, { differencesOnly = false, showValues = false } = {}) {
  if (!data || !data.categories) {
    return '<div class="empty-state">Ominaisuustietoja ei löytynyt.</div>';
  }

  const filterActive = differencesOnly ? ' active' : '';
  const valuesActive = showValues ? ' active' : '';

  const toolbar = `
    <div class="feature-toolbar">
      <button class="feature-filter-btn${filterActive}" id="differences-toggle">Näytä vain erot</button>
      <button class="feature-filter-btn${valuesActive}" id="values-toggle">Näytä asetusarvot</button>
    </div>
  `;

  let sectionsHtml = '';
  for (const category of data.categories) {
    const isFrontend = category.id === 'frontend';
    const flags = category.flags.filter((flag) => {
      // Hide non-boolean flags unless showValues is on
      if (!showValues && flag.type !== 'boolean') return false;
      return true;
    });

    if (flags.length === 0) continue;

    const rows = flags.map((flag) => {
      const differs = doesFlagDiffer(flag, data.cities);
      if (differencesOnly && !differs) return '';

      const cells = CITY_GROUPS.map((group) =>
        renderGroupCell(flag, group, data.cities)
      ).join('');

      const diffClass = differs ? ' flag-differs' : '';
      return `<tr class="flag-row${diffClass}" data-flag-key="${escapeHtml(flag.key)}">
        <td class="flag-label" title="${escapeHtml(flag.key)}">${escapeHtml(flag.label)}</td>
        ${cells}
      </tr>`;
    }).filter(Boolean);

    if (differencesOnly && rows.length === 0) continue;

    const sectionId = `category-${category.id}`;
    sectionsHtml += `
      <div class="feature-category" id="${sectionId}">
        <details open>
          <summary class="category-header ${category.id}">${escapeHtml(category.label)}</summary>
          <div class="matrix-scroll">
            <table class="feature-matrix">
              <thead>
                <tr>
                  <th class="flag-label-header">Ominaisuus</th>
                  ${CITY_GROUPS.map((g) => `<th class="city-col-header">${escapeHtml(g.label)}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${rows.join('')}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    `;
  }

  if (differencesOnly && !sectionsHtml) {
    sectionsHtml = '<div class="empty-state">Ei eroja kaupunkien välillä</div>';
  }

  return `
    <div class="feature-view">
      <h2>Ominaisuusvertailu</h2>
      ${toolbar}
      ${sectionsHtml}
    </div>
  `;
}

function renderGroupCell(flag, group, cities) {
  if (group.cities.length === 1) {
    const val = flag.values[group.cities[0]];
    return `<td class="flag-cell">${renderValue(val, flag.type)}</td>`;
  }

  // Tampere-region aggregation
  const values = group.cities.map((id) => flag.values[id]);
  const allSame = values.every(
    (v) => JSON.stringify(v) === JSON.stringify(values[0])
  );

  if (allSame) {
    return `<td class="flag-cell">${renderValue(values[0], flag.type)}</td>`;
  }

  // Divergent — show majority with indicator
  const cityNames = buildCityNameMap(cities);
  const details = group.cities
    .map((id) => `${cityNames[id] || id}: ${formatValue(flag.values[id], flag.type)}`)
    .join('\n');

  return `<td class="flag-cell tampere-divergent" title="${escapeHtml(details)}">
    <span class="divergent-indicator">
      ${renderValue(values[0], flag.type)}
      <span class="divergent-marker" aria-label="Kaupunkien välillä on eroja">*</span>
    </span>
    <div class="tampere-detail hidden">
      ${group.cities
        .map(
          (id) =>
            `<div class="tampere-city-row"><span class="tampere-city-name">${escapeHtml(cityNames[id] || id)}</span>${renderValue(flag.values[id], flag.type)}</div>`
        )
        .join('')}
    </div>
  </td>`;
}

function renderValue(val, type) {
  if (val === null || val === undefined) {
    return '<span class="flag-unset" title="Ei asetettu">—</span>';
  }
  if (typeof val === 'boolean') {
    return val
      ? '<span class="flag-true" title="Kyllä">✓</span>'
      : '<span class="flag-false" title="Ei">✗</span>';
  }
  return `<span class="flag-value">${escapeHtml(String(val))}</span>`;
}

function formatValue(val, type) {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'Kyllä' : 'Ei';
  return String(val);
}

function doesFlagDiffer(flag, cities) {
  const groupValues = CITY_GROUPS.map((group) => {
    // For single-city groups, use the city value
    if (group.cities.length === 1) {
      return JSON.stringify(flag.values[group.cities[0]]);
    }
    // For multi-city groups, check if all cities agree first
    const values = group.cities.map((id) => JSON.stringify(flag.values[id]));
    const allSame = values.every((v) => v === values[0]);
    return allSame ? values[0] : '__DIVERGENT__';
  });

  // Check if values differ across groups
  return !groupValues.every((v) => v === groupValues[0]);
}

function buildCityNameMap(cities) {
  const map = {};
  for (const city of cities) {
    map[city.id] = city.name;
  }
  return map;
}

export function bindFeatureMatrixEvents() {
  // Differences-only toggle
  const diffToggle = document.getElementById('differences-toggle');
  if (diffToggle) {
    diffToggle.addEventListener('click', () => {
      const current = getQueryParam('differencesOnly') === 'true';
      setQueryParam('differencesOnly', current ? null : 'true');
    });
  }

  // Non-boolean values toggle
  const valuesToggle = document.getElementById('values-toggle');
  if (valuesToggle) {
    valuesToggle.addEventListener('click', () => {
      const current = getQueryParam('showValues') === 'true';
      setQueryParam('showValues', current ? null : 'true');
    });
  }

  // Tampere-region expand/collapse
  document.querySelectorAll('.tampere-divergent').forEach((cell) => {
    cell.addEventListener('click', () => {
      const detail = cell.querySelector('.tampere-detail');
      if (detail) {
        detail.classList.toggle('hidden');
      }
    });
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
