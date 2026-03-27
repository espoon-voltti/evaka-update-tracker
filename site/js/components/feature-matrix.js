/**
 * Feature matrix comparison component.
 * Displays feature flags across cities as a side-by-side table.
 */

import { getQueryParam } from '../router.js';

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

  // Check for cities with errors
  const errorCities = (data.cities || []).filter((c) => c.error);
  const errorGroupIds = new Set(errorCities.map((c) => c.cityGroupId));

  let errorBanner = '';
  if (errorCities.length > 0) {
    const cityNames = errorCities.map((c) => c.name).join(', ');
    const fallbackDate = data.errorFallbackDate
      ? `, ${formatFinnishDate(data.errorFallbackDate)},`
      : '';
    errorBanner = `
      <div class="feature-error-banner">
        Ominaisuuksien hakemisessa havaittiin ongelma (${escapeHtml(cityNames)}).
        Näytetään edellisen onnistuneen${escapeHtml(fallbackDate)} haun tulokset.
      </div>
    `;
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
    const rows = category.flags.map((flag) => {
      const differs = doesFlagDiffer(flag, data.cities);
      const cells = CITY_GROUPS.map((group) =>
        renderGroupCell(flag, group, data.cities, errorGroupIds)
      ).join('');

      const diffClass = differs ? ' flag-differs' : '';
      return `<tr class="flag-row${diffClass}" data-flag-key="${escapeHtml(flag.key)}" data-flag-type="${flag.type}">
        <td class="flag-label" title="${escapeHtml(flag.key)}">${escapeHtml(flag.label)}</td>
        ${cells}
      </tr>`;
    });

    if (rows.length === 0) continue;

    const sectionId = `category-${category.id}`;
    sectionsHtml += `
      <div class="feature-category" id="${sectionId}">
        <details open>
          <summary class="category-header ${category.id}">${escapeHtml(category.label)}</summary>
          <table class="feature-matrix">
            <thead>
              <tr>
                <th class="flag-label-header">Ominaisuus</th>
                ${CITY_GROUPS.map((g) => {
                  const warn = errorGroupIds.has(g.id) ? ' city-col-warning' : '';
                  return `<th class="city-col-header${warn}">${escapeHtml(g.label)}</th>`;
                }).join('')}
              </tr>
            </thead>
            <tbody>
              ${rows.join('')}
            </tbody>
          </table>
        </details>
      </div>
    `;
  }

  if (!sectionsHtml) {
    sectionsHtml = '<div class="empty-state">Ominaisuustietoja ei löytynyt.</div>';
  }

  return `
    <div class="feature-view">
      <h2>Ominaisuusvertailu</h2>
      ${errorBanner}
      ${toolbar}
      ${sectionsHtml}
      <div class="empty-state" id="no-differences-msg" style="display:none">Ei eroja kaupunkien välillä</div>
    </div>
  `;
}

function renderGroupCell(flag, group, cities, errorGroupIds) {
  const warn = errorGroupIds.has(group.id) ? ' flag-cell-warning' : '';
  if (group.cities.length === 1) {
    const val = flag.values[group.cities[0]];
    return `<td class="flag-cell${warn}">${renderValue(val, flag.type)}</td>`;
  }

  // Tampere-region aggregation
  const values = group.cities.map((id) => flag.values[id]);
  const allSame = values.every(
    (v) => JSON.stringify(v) === JSON.stringify(values[0])
  );

  if (allSame) {
    return `<td class="flag-cell${warn}">${renderValue(values[0], flag.type)}</td>`;
  }

  // Divergent — show majority with indicator
  const cityNames = buildCityNameMap(cities);
  const details = group.cities
    .map((id) => `${cityNames[id] || id}: ${formatValue(flag.values[id], flag.type)}`)
    .join('\n');

  return `<td class="flag-cell tampere-divergent${warn}" title="${escapeHtml(details)}">
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
    if (type === 'boolean') {
      // Boolean flags default to false when unset
      return '<span class="flag-false flag-default" title="Oletusarvo (ei asetettu)">✗</span>';
    }
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
  // Read initial state from URL
  const differencesOnly = getQueryParam('differencesOnly') === 'true';
  const showValues = getQueryParam('showValues') === 'true';

  // Apply initial filter state (all rows are rendered, filter via CSS classes)
  if (!showValues) applyValuesFilter(false);
  if (differencesOnly) applyDifferencesFilter(true);

  // Differences-only toggle — DOM manipulation, no re-render
  const diffToggle = document.getElementById('differences-toggle');
  if (diffToggle) {
    diffToggle.addEventListener('click', () => {
      diffToggle.classList.toggle('active');
      const active = diffToggle.classList.contains('active');
      applyDifferencesFilter(active);
      updateQuerySilent('differencesOnly', active ? 'true' : null);
    });
  }

  // Non-boolean values toggle — DOM manipulation, no re-render
  const valuesToggle = document.getElementById('values-toggle');
  if (valuesToggle) {
    valuesToggle.addEventListener('click', () => {
      valuesToggle.classList.toggle('active');
      const active = valuesToggle.classList.contains('active');
      applyValuesFilter(active);
      updateQuerySilent('showValues', active ? 'true' : null);
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

function applyDifferencesFilter(active) {
  document.querySelectorAll('.flag-row').forEach((row) => {
    if (active && !row.classList.contains('flag-differs')) {
      row.classList.add('filtered-diff');
    } else {
      row.classList.remove('filtered-diff');
    }
  });
  updateCategoryVisibility();
}

function applyValuesFilter(showValues) {
  document.querySelectorAll('.flag-row').forEach((row) => {
    if (!showValues && row.dataset.flagType !== 'boolean') {
      row.classList.add('filtered-type');
    } else {
      row.classList.remove('filtered-type');
    }
  });
  updateCategoryVisibility();
}

function updateCategoryVisibility() {
  const diffActive = document.getElementById('differences-toggle')?.classList.contains('active');
  let anyVisible = false;

  document.querySelectorAll('.feature-category').forEach((cat) => {
    const visibleRows = cat.querySelectorAll('.flag-row:not(.filtered-diff):not(.filtered-type)');
    cat.classList.toggle('category-hidden', visibleRows.length === 0);
    if (visibleRows.length > 0) anyVisible = true;
  });

  // Show/hide empty state message
  const msg = document.getElementById('no-differences-msg');
  if (msg) {
    msg.style.display = (diffActive && !anyVisible) ? '' : 'none';
  }
}

/** Update URL query param without triggering hashchange re-render */
function updateQuerySilent(name, value) {
  const hash = window.location.hash || '#/';
  const [pathPart, queryPart] = hash.slice(1).split('?');
  const params = new URLSearchParams(queryPart || '');
  if (value === null) {
    params.delete(name);
  } else {
    params.set(name, value);
  }
  const qs = params.toString();
  const newHash = '#' + (pathPart || '/') + (qs ? '?' + qs : '');
  history.replaceState(null, '', newHash);
}

function formatFinnishDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return `${d.getDate()}.${d.getMonth() + 1}.`;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
