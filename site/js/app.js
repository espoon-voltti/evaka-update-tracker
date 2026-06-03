/**
 * App initialization: fetch data, wire router, render views.
 */

import { addRoute, setNotFound, startRouter, navigate, handleRoute } from './router.js';
import { renderOverview, bindOverviewEvents } from './components/overview.js';
import { initCache, startAutoRefresh } from './auto-refresh.js';
import { cacheBustUrl } from './utils.js';

let currentData = null;
const appEl = () => document.getElementById('app');
const generatedAtEl = () => document.getElementById('generated-at');

function updateGeneratedAt() {
  if (generatedAtEl() && currentData?.generatedAt) {
    const d = new Date(currentData.generatedAt);
    generatedAtEl().textContent = `Päivitetty: ${d.toLocaleString('fi')}`;
  }
}

async function loadCurrentData(bustCache = false) {
  try {
    const url = bustCache ? cacheBustUrl('data/current.json') : 'data/current.json';
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    currentData = await response.json();
    updateGeneratedAt();
  } catch (err) {
    console.error('Failed to load deployment data:', err);
    if (!currentData) {
      appEl().innerHTML = `
        <div class="empty-state">
          Muutostietojen lataaminen epäonnistui. Tietoja ei ehkä ole vielä luotu.
        </div>
      `;
    }
  }
}

function renderView(html) {
  appEl().innerHTML = html;
}

function exitFullscreen() {
  document.body.classList.remove('fullscreen');
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
}

// Route: Overview (#/)
function handleOverview(_params, queryParams) {
  if (!currentData) {
    renderView('<div class="loading">Ladataan...</div>');
    return;
  }
  document.title = 'Yleiskatsaus - eVaka muutostenseuranta';
  fetch(cacheBustUrl('data/history.json')).then((r) => r.ok ? r.json() : { events: [] }).catch(() => ({ events: [] }))
    .then((historyData) => {
      renderView(renderOverview(currentData, historyData.events || []));
      bindOverviewEvents();
      updateTabs(null);
      if (queryParams?.get('fullscreen') === 'true') {
        document.body.classList.add('fullscreen');
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } else {
        document.body.classList.remove('fullscreen');
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      }
    });
}

// Route: City detail (#/city/:id)
function handleCityDetail({ id }, queryParams) {
  exitFullscreen();
  if (!currentData) {
    renderView('<div class="loading">Ladataan...</div>');
    return;
  }
  // Dynamically import city-detail and load history + feature flags
  Promise.all([
    import('./components/city-detail.js'),
    fetch(cacheBustUrl('data/history.json')).then((r) => r.ok ? r.json() : { events: [] }).catch(() => ({ events: [] })),
    fetch(cacheBustUrl('data/feature-flags.json')).then((r) => r.ok ? r.json() : null).catch(() => null),
  ]).then(([{ renderCityDetail, bindCityDetailEvents }, historyData, featureData]) => {
    const city = currentData.cityGroups.find((c) => c.id === id);
    if (!city) {
      renderView('<div class="empty-state">Kuntaa ei löytynyt</div>');
      return;
    }
    document.title = `${city.name} - eVaka muutostenseuranta`;
    const showBots = queryParams?.get('showBots') === 'true';
    renderView(renderCityDetail(city, { showBots }, historyData.events || [], featureData));
    bindCityDetailEvents(city);
    updateTabs(id);
  });
}

// Route: City history (#/city/:id/history)
function handleCityHistory({ id }, queryParams) {
  exitFullscreen();
  if (!currentData) {
    renderView('<div class="loading">Ladataan...</div>');
    return;
  }
  import('./components/history-view.js').then(async ({ renderHistoryView, bindHistoryViewEvents }) => {
    const city = currentData.cityGroups.find((c) => c.id === id);
    if (!city) {
      renderView('<div class="empty-state">Kuntaa ei löytynyt</div>');
      return;
    }
    document.title = `Muutoshistoria - ${city.name} - eVaka muutostenseuranta`;
    const showBots = queryParams?.get('showBots') === 'true';
    try {
      const resp = await fetch(cacheBustUrl('data/history.json'));
      const historyData = resp.ok ? await resp.json() : { events: [] };
      renderView(renderHistoryView(city, historyData, { showBots }));
      bindHistoryViewEvents(city);
      updateTabs(id);
    } catch {
      renderView(renderHistoryView(city, { events: [] }, { showBots }));
      bindHistoryViewEvents(city);
      updateTabs(id);
    }
  });
}

// Route: Permissions (#/permissions)
function handlePermissions(_params, queryParams) {
  exitFullscreen();
  document.title = 'Käyttäjäoikeudet - eVaka muutostenseuranta';
  renderView('<div class="loading">Ladataan...</div>');
  fetch(cacheBustUrl('data/permissions.json'))
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((permData) => {
      import('./components/permissions-matrix.js').then(
        ({ renderPermissionsMatrix, bindPermissionsMatrixEvents }) => {
          const cityGroup = queryParams?.get('city') || 'espoo';
          const differencesOnly = queryParams?.get('differencesOnly') === 'true';
          const filterText = queryParams?.get('q') || '';
          const crudParam = queryParams?.get('crud');
          const crudFilter = crudParam ? crudParam.split(',').filter(Boolean) : null;
          const ctxParam = queryParams?.get('ctx');
          const ctxFilter = ctxParam ? ctxParam.split(',').filter(Boolean) : null;
          renderView(
            renderPermissionsMatrix(permData, {
              cityGroup,
              differencesOnly,
              filterText,
              crudFilter,
              ctxFilter,
            })
          );
          bindPermissionsMatrixEvents();
          updateTabs('permissions');
        }
      );
    })
    .catch((err) => {
      console.error('Failed to load permissions:', err);
      renderView(
        '<div class="empty-state">Käyttäjäoikeustietojen lataaminen epäonnistui.</div>'
      );
      updateTabs('permissions');
    });
}

// Route: Features (#/features)
function handleFeatures(_params, queryParams) {
  exitFullscreen();
  document.title = 'Ominaisuudet - eVaka muutostenseuranta';
  renderView('<div class="loading">Ladataan...</div>');
  fetch(cacheBustUrl('data/feature-flags.json'))
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((featureData) => {
      import('./components/feature-matrix.js').then(
        ({ renderFeatureMatrix, bindFeatureMatrixEvents }) => {
          const differencesOnly = queryParams?.get('differencesOnly') === 'true';
          const showValues = queryParams?.get('showValues') === 'true';
          renderView(renderFeatureMatrix(featureData, { differencesOnly, showValues }));
          bindFeatureMatrixEvents();
          updateTabs('features');
        }
      );
    })
    .catch((err) => {
      console.error('Failed to load feature flags:', err);
      renderView(
        '<div class="empty-state">Ominaisuustietojen lataaminen epäonnistui.</div>'
      );
      updateTabs('features');
    });
}

function updateTabs(activeCityId) {
  // Dynamically import city-tabs if they exist
  import('./components/city-tabs.js').then(({ renderCityTabs }) => {
    const tabsEl = document.getElementById('city-tabs');
    if (tabsEl && currentData) {
      tabsEl.innerHTML = renderCityTabs(currentData.cityGroups, activeCityId);
      // Bind tab click events
      tabsEl.querySelectorAll('.tab').forEach((tab) => {
        tab.addEventListener('click', () => {
          const cityId = tab.dataset.cityId;
          if (cityId === 'features') {
            navigate('/features');
          } else if (cityId === 'permissions') {
            navigate('/permissions');
          } else if (cityId) {
            navigate(`/city/${cityId}`);
          } else {
            navigate('/');
          }
        });
      });
    }
  }).catch(() => {
    // city-tabs not yet implemented, skip
  });
}

/**
 * Re-render the current view with fresh data.
 * Called by auto-refresh when data changes are detected.
 */
export async function refreshCurrentView() {
  await loadCurrentData(true);
  handleRoute();
}

// Register routes
addRoute('/', handleOverview);
addRoute('/features', handleFeatures);
addRoute('/permissions', handlePermissions);
addRoute('/city/:id', handleCityDetail);
addRoute('/city/:id/history', handleCityHistory);
setNotFound(() => navigate('/'));

// Bootstrap
async function init() {
  await loadCurrentData();
  startRouter();
  await initCache();
  startAutoRefresh(refreshCurrentView);
}

init();
