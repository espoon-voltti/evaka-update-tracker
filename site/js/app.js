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
      generatedAtEl().textContent = `Last updated: ${d.toLocaleString('en-GB')}`;
    }
  } catch (err) {
    console.error('Failed to load deployment data:', err);
    appEl().innerHTML = `
      <div class="empty-state">
        Failed to load deployment data. The data may not have been generated yet.
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
    renderView('<div class="loading">Loading...</div>');
    return;
  }
  renderView(renderOverview(currentData));
  bindOverviewEvents();
  updateTabs(null);
}

// Route: City detail (#/city/:id)
function handleCityDetail({ id }, queryParams) {
  if (!currentData) {
    renderView('<div class="loading">Loading...</div>');
    return;
  }
  // Dynamically import city-detail when needed
  import('./components/city-detail.js').then(({ renderCityDetail, bindCityDetailEvents }) => {
    const city = currentData.cityGroups.find((c) => c.id === id);
    if (!city) {
      renderView('<div class="empty-state">City not found</div>');
      return;
    }
    const showBots = queryParams?.get('showBots') === 'true';
    renderView(renderCityDetail(city, { showBots }));
    bindCityDetailEvents(city);
    updateTabs(id);
  });
}

// Route: City history (#/city/:id/history)
function handleCityHistory({ id }) {
  if (!currentData) {
    renderView('<div class="loading">Loading...</div>');
    return;
  }
  import('./components/history-view.js').then(async ({ renderHistoryView }) => {
    const city = currentData.cityGroups.find((c) => c.id === id);
    if (!city) {
      renderView('<div class="empty-state">City not found</div>');
      return;
    }
    try {
      const resp = await fetch('data/history.json');
      const historyData = resp.ok ? await resp.json() : { events: [] };
      renderView(renderHistoryView(city, historyData));
      updateTabs(id);
    } catch {
      renderView(renderHistoryView(city, { events: [] }));
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
