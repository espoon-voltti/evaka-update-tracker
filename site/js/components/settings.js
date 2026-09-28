/**
 * Settings view (#/settings): edit scheduled screens stored in this browser.
 */

import { escapeHtml } from '../utils.js';
import {
  WEEKDAYS,
  loadScreens,
  saveScreens,
  validateScreen,
  previewScheduledScreen,
} from '../scheduled-screens.js';

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

export function renderSettings() {
  const screens = loadScreens();
  return `
    <div class="settings-view">
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

export function bindSettingsEvents() {
  const view = document.querySelector('.settings-view');
  if (!view) return;

  view.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
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
    const status = e.target.closest('form')?.querySelector('.settings-status');
    if (status) status.textContent = '';
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
