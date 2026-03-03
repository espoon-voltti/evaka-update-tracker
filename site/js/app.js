/**
 * App initialization: fetch data, wire router, render views.
 */

import { addRoute, setNotFound, startRouter, navigate } from './router.js';
import { renderOverview, bindOverviewEvents } from './components/overview.js';

let currentData = null;
const appEl = () => document.getElementById('app');
const generatedAtEl = () => document.getElementById('generated-at');

async function loadCurrentData() {
  try {
    const response = await fetch('data/current.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    currentData = await response.json();
    if (generatedAtEl() && currentData.generatedAt) {
      const d = new Date(currentData.generatedAt);
      generatedAtEl().textContent = `Päivitetty: ${d.toLocaleString('fi')}`;
    }
  } catch (err) {
    console.error('Failed to load deployment data:', err);
    appEl().innerHTML = `
      <div class="empty-state">
        Muutostietojen lataaminen epäonnistui. Tietoja ei ehkä ole vielä luotu.
      </div>
    `;
  }
}

function renderView(html) {
  appEl().innerHTML = html;
}

// Route: Overview (#/)
function handleOverview() {
  if (!currentData) {
    renderView('<div class="loading">Ladataan...</div>');
    return;
  }
  document.title = 'Yleiskatsaus - eVaka muutostenseuranta';
  fetch('data/history.json').then((r) => r.ok ? r.json() : { events: [] }).catch(() => ({ events: [] }))
    .then((historyData) => {
      renderView(renderOverview(currentData, historyData.events || []));
      bindOverviewEvents();
      updateTabs(null);
    });
}

// Route: City detail (#/city/:id)
function handleCityDetail({ id }, queryParams) {
  if (!currentData) {
    renderView('<div class="loading">Ladataan...</div>');
    return;
  }
  // Dynamically import city-detail and load history for detection timestamps
  Promise.all([
    import('./components/city-detail.js'),
    fetch('data/history.json').then((r) => r.ok ? r.json() : { events: [] }).catch(() => ({ events: [] })),
  ]).then(([{ renderCityDetail, bindCityDetailEvents }, historyData]) => {
    const city = currentData.cityGroups.find((c) => c.id === id);
    if (!city) {
      renderView('<div class="empty-state">Kuntaa ei löytynyt</div>');
      return;
    }
    document.title = `${city.name} - eVaka muutostenseuranta`;
    const showBots = queryParams?.get('showBots') === 'true';
    renderView(renderCityDetail(city, { showBots }, historyData.events || []));
    bindCityDetailEvents(city);
    updateTabs(id);
  });
}

// Route: City history (#/city/:id/history)
function handleCityHistory({ id }, queryParams) {
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
      const resp = await fetch('data/history.json');
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
          if (cityId) {
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

// Register routes
addRoute('/', handleOverview);
addRoute('/city/:id', handleCityDetail);
addRoute('/city/:id/history', handleCityHistory);
setNotFound(() => navigate('/'));

// Bootstrap
async function init() {
  await loadCurrentData();
  startRouter();
}

init();
