/**
 * Settings view (#/settings): edit scheduled screens and metrics endpoints
 * stored in this browser.
 */

import { escapeHtml } from '../utils.js';
import {
  WEEKDAYS,
  loadScreens,
  saveScreens,
  validateScreen,
  previewScheduledScreen,
} from '../scheduled-screens.js';
import { loadMetricsSettings, saveMetricsSettings } from '../metrics/client.js';
import { invalidateMetrics } from '../metrics/cache.js';
import { ImportError, maskToken, parseImport } from '../metrics/import.js';

function newScreen() {
  return {
    id: `screen-${Date.now().toString(36)}`,
    name: '',
    days: [1, 2, 3, 4, 5],
    start: '11:00',
    end: '12:00',
    panels: [newPanel()],
    pageWidth: 1200,
    enabled: true,
  };
}

function newPanel() {
  return { name: '', url: '', offsets: {}, cropLeft: 0, cropWidth: 1200 };
}

function renderPanelRow(panel) {
  const offsetInputs = WEEKDAYS.map(
    ({ day, label }) => `
      <label class="settings-offset">${label}
        <input type="number" min="0" step="1" data-offset-day="${day}" value="${panel.offsets?.[day] ?? ''}" placeholder="0">
      </label>`
  ).join('');
  return `
    <div class="settings-panel">
      <input type="text" class="settings-panel-name" value="${escapeHtml(panel.name || '')}" placeholder="Nimi (esim. ravintola)" aria-label="Sivun nimi">
      <input type="url" class="settings-panel-url" value="${escapeHtml(panel.url)}" placeholder="https://…" aria-label="Sivun osoite">
      <div class="settings-offsets"><span class="settings-label">Siirtymä (px)</span>${offsetInputs}</div>
      <div class="settings-offsets">
        <span class="settings-label">Rajaus (px)</span>
        <label class="settings-offset">vasen reuna <input type="number" min="0" step="10" data-crop="cropLeft" value="${panel.cropLeft}"></label>
        <label class="settings-offset">leveys <input type="number" min="100" step="10" data-crop="cropWidth" value="${panel.cropWidth}"></label>
      </div>
      <button type="button" data-action="remove-panel">Poista sivu</button>
    </div>
  `;
}

function renderScreenForm(screen) {
  const dayBoxes = WEEKDAYS.map(
    ({ day, label }) => `
      <label class="settings-day">
        <input type="checkbox" name="days" value="${day}"${screen.days.includes(day) ? ' checked' : ''}>
        ${label}
      </label>`
  ).join('');

  return `
    <form class="settings-screen" data-screen-id="${escapeHtml(screen.id)}">
      <div class="settings-row">
        <label>Nimi <input type="text" name="name" value="${escapeHtml(screen.name)}" placeholder="esim. Lounaslistat"></label>
        <label class="settings-inline">
          <input type="checkbox" name="enabled"${screen.enabled !== false ? ' checked' : ''}> Käytössä
        </label>
      </div>
      <div class="settings-row">
        <span class="settings-label">Päivät</span>${dayBoxes}
      </div>
      <div class="settings-row">
        <label>Alkaa <input type="time" name="start" value="${escapeHtml(screen.start)}"></label>
        <label>Päättyy <input type="time" name="end" value="${escapeHtml(screen.end)}"></label>
        <label>Sivun leveys (px) <input type="number" name="pageWidth" min="320" max="3000" step="10" value="${screen.pageWidth}"></label>
      </div>
      <div class="settings-block">
        <span class="settings-label">Sivut (näytetään rinnakkain)</span>
        <div class="settings-panels">${screen.panels.map(renderPanelRow).join('')}</div>
        <button type="button" data-action="add-panel" class="settings-add-panel">+ Lisää sivu</button>
      </div>
      <div class="settings-errors" role="alert"></div>
      <div class="settings-actions">
        <button type="submit">Tallenna</button>
        <button type="button" data-action="preview">Esikatsele</button>
        <select name="previewDay" aria-label="Esikatselupäivä">
          ${WEEKDAYS.map(({ day, label }) => `<option value="${day}"${day === new Date().getDay() ? ' selected' : ''}>${label}</option>`).join('')}
        </select>
        <button type="button" data-action="delete" class="settings-delete">Poista</button>
        <span class="settings-status"></span>
      </div>
    </form>
  `;
}

function renderMetricsForm(cityGroups) {
  const rows = cityGroups
    .map((city) => {
      const { url, token } = loadMetricsSettings(city.id);
      return `
        <div class="settings-row settings-metrics-row" data-city-id="${escapeHtml(city.id)}">
          <span class="settings-label settings-metrics-city">${escapeHtml(city.name)}</span>
          <input type="url" name="url" class="settings-metrics-url" value="${escapeHtml(url)}" placeholder="https://….lambda-url.eu-north-1.on.aws" aria-label="${escapeHtml(city.name)}: funktion osoite">
          <input type="password" name="token" class="settings-metrics-token" value="${escapeHtml(token)}" placeholder="Tunniste" autocomplete="off" aria-label="${escapeHtml(city.name)}: tunniste">
        </div>`;
    })
    .join('');
  return `
    <h2>Operatiiviset mittarit</h2>
    <p class="settings-help">
      Kunnan mittaritietojen lukufunktion osoite ja tunniste. Mittarit näkyvät
      <a href="#/metrics">Mittarit</a>-välilehdellä niille kunnille, joilla on osoite.
      Tunniste tallennetaan vain tähän selaimeen.
    </p>
    <form class="settings-metrics">
      ${rows}
      <div class="settings-actions">
        <button type="submit">Tallenna</button>
        <span class="settings-status"></span>
      </div>
    </form>
  `;
}

function storeMetricsSettings(cityId, settings) {
  saveMetricsSettings(cityId, settings);
  invalidateMetrics(cityId);
}

function saveMetricsForm(form) {
  form.querySelectorAll('.settings-metrics-row').forEach((row) => {
    storeMetricsSettings(row.dataset.cityId, {
      url: row.querySelector('[name=url]').value,
      token: row.querySelector('[name=token]').value,
    });
  });
  form.querySelector('.settings-status').textContent = 'Tallennettu';
}

function renderImportForm() {
  return `
    <h2>Tuo mittariasetukset</h2>
    <p class="settings-help">
      Liitä mittariasetusten tuontilinkki tai koko viesti, jossa linkki on. Asetukset
      tallennetaan tähän selaimeen vasta, kun valitset Tallenna.
    </p>
    <form class="settings-import">
      <label class="settings-block">Liitä linkki tai tuontikoodi
        <textarea class="settings-import-text" rows="3" autocomplete="off" spellcheck="false" aria-describedby="settings-import-preview"></textarea>
      </label>
      <div class="settings-import-preview" id="settings-import-preview" aria-live="polite"></div>
      <span class="settings-status" role="status"></span>
    </form>
  `;
}

function cityName(cityGroups, cityId) {
  return cityGroups.find((city) => city.id === cityId)?.name ?? cityId;
}

function renderImportPreview(parsed, cityGroups) {
  const cancel = '<button type="button" data-action="cancel-import">Peruuta</button>';
  if (parsed instanceof ImportError) {
    return `
      <div class="settings-errors">${escapeHtml(parsed.message)}</div>
      <div class="settings-actions">${cancel}</div>`;
  }
  const rows = parsed.cities
    .map(
      ({ id, url, token }) => `
        <tr data-city-id="${escapeHtml(id)}">
          <td>${escapeHtml(cityName(cityGroups, id))}</td>
          <td>${escapeHtml(new URL(url).host)}</td>
          <td class="settings-import-token">${escapeHtml(maskToken(token))}</td>
        </tr>`
    )
    .join('');
  const skipped = parsed.unknown.length
    ? `<p class="settings-import-skipped">Ohitetaan tuntemattomat kunnat: ${escapeHtml(parsed.unknown.join(', '))}</p>`
    : '';
  return `
    <p>Ympäristö: <strong class="settings-import-env">${escapeHtml(parsed.env)}</strong></p>
    <table class="settings-import-cities">
      <thead><tr><th>Kunta</th><th>Funktion osoite</th><th>Tunniste</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${skipped}
    <div class="settings-actions">
      <button type="submit">Tallenna</button>
      ${cancel}
    </div>`;
}

function parseImportForm(form, cityGroups) {
  const text = form.querySelector('.settings-import-text').value;
  return text.trim() ? parseImport(text, cityGroups.map((city) => city.id)) : null;
}

function showImportPreview(form, cityGroups) {
  const parsed = parseImportForm(form, cityGroups);
  form.querySelector('.settings-import-preview').innerHTML = parsed ? renderImportPreview(parsed, cityGroups) : '';
}

function clearImportForm(form) {
  form.querySelector('.settings-import-text').value = '';
  form.querySelector('.settings-import-preview').innerHTML = '';
}

function saveImportForm(form, cityGroups) {
  const parsed = parseImportForm(form, cityGroups);
  if (!parsed || parsed instanceof ImportError) return;
  for (const { id, url, token } of parsed.cities) {
    storeMetricsSettings(id, { url, token });
    const row = document.querySelector(`.settings-metrics-row[data-city-id="${CSS.escape(id)}"]`);
    row.querySelector('[name=url]').value = url;
    row.querySelector('[name=token]').value = token;
  }
  clearImportForm(form);
  const names = parsed.cities.map(({ id }) => cityName(cityGroups, id)).join(', ');
  form.querySelector('.settings-status').textContent = `Tallennettu: ${names}`;
}

/** Fills the import box with a code from an import link and shows its preview. */
export function prefillImport(code, cityGroups) {
  const form = document.querySelector('.settings-import');
  if (!form) return;
  form.querySelector('.settings-import-text').value = code;
  form.querySelector('.settings-status').textContent = '';
  showImportPreview(form, cityGroups);
}

export function renderSettings(cityGroups = []) {
  const screens = loadScreens();
  return `
    <div class="settings-view">
      ${cityGroups.length ? renderImportForm() : ''}
      <h2>Ajastetut näkymät</h2>
      <p class="settings-help">
        Ajastettu näkymä peittää sivun valittuina päivinä ja kellonaikoina ja näyttää annetut
        verkkosivut rinnakkain. Siirtymä kertoo, kuinka monta pikseliä sivun alusta kyseisen
        päivän kohta alkaa (esim. viikon lounaslistassa). Jätä otsikon yläpuolelle väljyyttä,
        koska kohta siirtyy, kun ruokalajien kuvausten pituus vaihtelee viikoittain. Sivu asetellaan aina sivun leveyteen, ja siitä näytetään rajauksen mukainen kaistale
        paneelin levyisenä — kapeampi rajaus suurentaa tekstiä.
        Siirtymiä voi säätää esikatselussa hiiren rullalla.
        Asetukset tallennetaan vain tähän selaimeen.
      </p>
      <div class="settings-screens">
        ${screens.map(renderScreenForm).join('')}
      </div>
      <button type="button" data-action="add">+ Lisää näkymä</button>
      ${cityGroups.length ? renderMetricsForm(cityGroups) : ''}
    </div>
  `;
}

function readForm(form) {
  const data = new FormData(form);
  return {
    id: form.dataset.screenId,
    name: String(data.get('name') || '').trim(),
    days: data.getAll('days').map(Number),
    start: String(data.get('start') || ''),
    end: String(data.get('end') || ''),
    panels: [...form.querySelectorAll('.settings-panel')].map((row) => ({
      name: row.querySelector('.settings-panel-name').value.trim(),
      url: row.querySelector('.settings-panel-url').value.trim(),
      offsets: Object.fromEntries(
        [...row.querySelectorAll('[data-offset-day]')]
          .filter((input) => input.value !== '')
          .map((input) => [input.dataset.offsetDay, Number(input.value)])
      ),
      cropLeft: Number(row.querySelector('[data-crop="cropLeft"]').value),
      cropWidth: Number(row.querySelector('[data-crop="cropWidth"]').value),
    })),
    pageWidth: Number(data.get('pageWidth')),
    enabled: data.get('enabled') === 'on',
  };
}

function showErrors(form, errors) {
  form.querySelector('.settings-errors').innerHTML = errors
    .map((e) => `<div>${escapeHtml(e)}</div>`)
    .join('');
}

export function bindSettingsEvents(cityGroups = []) {
  const view = document.querySelector('.settings-view');
  if (!view) return;

  view.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    if (form.matches('.settings-metrics')) {
      saveMetricsForm(form);
      return;
    }
    if (form.matches('.settings-import')) {
      saveImportForm(form, cityGroups);
      return;
    }
    const screen = readForm(form);
    const errors = validateScreen(screen);
    showErrors(form, errors);
    if (errors.length) return;
    const screens = loadScreens();
    const idx = screens.findIndex((s) => s.id === screen.id);
    if (idx >= 0) screens[idx] = screen;
    else screens.push(screen);
    saveScreens(screens);
    form.querySelector('.settings-status').textContent = 'Tallennettu';
  });

  view.addEventListener('input', (e) => {
    const form = e.target.closest('form');
    const status = form?.querySelector('.settings-status');
    if (status) status.textContent = '';
    if (form?.matches('.settings-import')) showImportPreview(form, cityGroups);
  });

  view.addEventListener('click', (e) => {
    const button = e.target.closest('button[data-action]');
    if (!button) return;
    const form = button.closest('form');

    if (button.dataset.action === 'add') {
      view.querySelector('.settings-screens').insertAdjacentHTML('beforeend', renderScreenForm(newScreen()));
    } else if (button.dataset.action === 'preview') {
      const screen = readForm(form);
      const errors = validateScreen(screen);
      showErrors(form, errors);
      if (errors.length) return;
      const day = Number(form.querySelector('[name=previewDay]').value);
      // Offsets adjusted with the mouse wheel in the preview are written back to the form.
      previewScheduledScreen(screen, day, (panelIndex, offsetDay, offset) => {
        const row = form.querySelectorAll('.settings-panel')[panelIndex];
        row.querySelector(`[data-offset-day="${offsetDay}"]`).value = offset;
        form.querySelector('.settings-status').textContent = 'Muutoksia ei ole tallennettu';
      });
    } else if (button.dataset.action === 'cancel-import') {
      clearImportForm(form);
    } else if (button.dataset.action === 'add-panel') {
      form.querySelector('.settings-panels').insertAdjacentHTML('beforeend', renderPanelRow(newPanel()));
    } else if (button.dataset.action === 'remove-panel') {
      button.closest('.settings-panel').remove();
    } else if (button.dataset.action === 'delete') {
      // Two-step delete to avoid accidental removal.
      if (!button.dataset.confirm) {
        button.dataset.confirm = 'true';
        button.textContent = 'Vahvista poisto';
        return;
      }
      saveScreens(loadScreens().filter((s) => s.id !== form.dataset.screenId));
      form.remove();
    }
  });
}
