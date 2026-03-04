/**
 * City tabs navigation component.
 * Renders tab for each city group plus Overview tab.
 */

export function renderCityTabs(cityGroups, activeCityId) {
  const overviewActive = activeCityId === null || activeCityId === undefined;

  const overviewTab = `<span class="tab${overviewActive ? ' active' : ''}" data-city-id="">Yleiskatsaus</span>`;

  const cityTabs = cityGroups.map((city) => {
    const active = city.id === activeCityId;
    return `<span class="tab${active ? ' active' : ''}" data-city-id="${city.id}">${escapeHtml(city.name)}</span>`;
  });

  const featuresActive = activeCityId === 'features';
  const featuresTab = `<span class="tab${featuresActive ? ' active' : ''}" data-city-id="features">Ominaisuudet</span>`;

  return overviewTab + cityTabs.join('') + featuresTab;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
