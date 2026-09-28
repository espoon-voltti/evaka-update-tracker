/**
 * Scheduled screens: full-window overlays that show one or more external web
 * pages side by side (as iframes) during a configured weekly time window.
 *
 * Each page is laid out at a fixed width (`pageWidth`), so positions are the
 * same on every display. A panel can crop a horizontal strip of the page
 * (`cropLeft`, `cropWidth`) that is scaled to fill the panel width — cropping
 * away empty margins makes the text bigger. A panel can
 * have a per-weekday offset (in page pixels) to jump to that day's section
 * of e.g. a weekly lunch menu; the rest of the page follows below it, so
 * week-to-week changes in content length don't cut anything off.
 * Cross-origin iframes can't be scrolled, so the offset is applied by
 * shifting a tall iframe inside a clipped container.
 *
 * Configuration lives only in this browser's localStorage (edited via the
 * #/settings view), so nothing screen-specific is part of the codebase and
 * only browsers that have been configured (e.g. the team room display) show
 * the overlay.
 */

import { escapeHtml } from './utils.js';

const STORAGE_KEY = 'evaka-tracker.scheduledScreens';
const CHECK_INTERVAL = 15_000;
const OVERLAY_ID = 'scheduled-screen';

/** Weekday numbers as returned by Date#getDay(), in Finnish display order. */
export const WEEKDAYS = [
  { day: 1, label: 'ma' },
  { day: 2, label: 'ti' },
  { day: 3, label: 'ke' },
  { day: 4, label: 'to' },
  { day: 5, label: 'pe' },
  { day: 6, label: 'la' },
  { day: 0, label: 'su' },
];

let intervalId = null;
/** Key of the overlay currently on screen, or null. */
let shownKey = null;
/** Screen shown via "Esikatsele" — stays until closed, ignoring the schedule. */
let previewScreen = null;
/** Weekday shown in preview, and callback for offsets adjusted with the mouse wheel. */
let previewDay = null;
let onPreviewCalibrate = null;
let previewCounter = 0;
/** Occurrences (`<id>|<date>`) the user has closed; they stay closed until the next day. */
const dismissed = new Set();

/**
 * For local testing: `?now=10:45` (today) or `?now=2026-10-01T10:45` in the page
 * URL (before the #) fakes the clock used by the schedule. Time keeps running
 * from the given moment, so you can also watch a window end.
 */
function parseClockOffset() {
  const value = new URLSearchParams(window.location.search).get('now');
  if (!value) return 0;
  let target;
  const hhmm = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (hhmm) {
    target = new Date();
    target.setHours(Number(hhmm[1]), Number(hhmm[2]), 0, 0);
  } else {
    target = new Date(value);
  }
  if (Number.isNaN(target.getTime())) {
    console.warn(`[scheduled-screens] Ignoring invalid ?now=${value}`);
    return 0;
  }
  return target.getTime() - Date.now();
}

const clockOffset = parseClockOffset();

function now() {
  return new Date(Date.now() + clockOffset);
}

export function isSafeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function toMinutes(hhmm) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '');
  if (!match) return NaN;
  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * Validate a screen config. Returns a list of Finnish error messages
 * (empty when valid).
 */
export function validateScreen(screen) {
  const errors = [];
  if (!screen.name?.trim()) errors.push('Anna näkymälle nimi.');
  if (!screen.days?.length) errors.push('Valitse vähintään yksi viikonpäivä.');
  const start = toMinutes(screen.start);
  const end = toMinutes(screen.end);
  if (Number.isNaN(start) || Number.isNaN(end)) {
    errors.push('Anna alkamis- ja päättymisaika.');
  } else if (end <= start) {
    errors.push('Päättymisajan pitää olla alkamisajan jälkeen.');
  }
  const panels = screen.panels || [];
  if (!panels.length) errors.push('Anna vähintään yksi osoite.');
  const badUrls = panels.map((p) => p.url).filter((u) => !isSafeUrl(u));
  if (badUrls.length) errors.push(`Virheellinen osoite: ${badUrls.join(', ') || '(tyhjä)'}`);
  const badOffsets = panels.some((p) =>
    Object.values(p.offsets || {}).some((v) => !Number.isInteger(v) || v < 0)
  );
  if (badOffsets) errors.push('Siirtymien pitää olla positiivisia kokonaislukuja.');
  if (!(screen.pageWidth >= 320 && screen.pageWidth <= 3000)) {
    errors.push('Sivun leveyden pitää olla 320–3000 px.');
  } else {
    const badCrop = panels.some(
      (p) =>
        !(p.cropLeft >= 0 && p.cropWidth >= 100 && p.cropLeft + p.cropWidth <= screen.pageWidth)
    );
    if (badCrop) errors.push('Rajauksen pitää mahtua sivun leveyteen (leveys vähintään 100 px).');
  }
  return errors;
}

export function loadScreens() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((s) => validateScreen(s).length === 0) : [];
  } catch {
    return [];
  }
}

export function saveScreens(screens) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(screens));
  refreshScheduledScreens();
}

function localDateKey(date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

/** Return the first enabled screen whose window contains `at`, or null. */
export function findActiveScreen(screens, at = now()) {
  const minutes = at.getHours() * 60 + at.getMinutes();
  return (
    screens.find(
      (s) =>
        s.enabled !== false &&
        s.days.includes(at.getDay()) &&
        minutes >= toMinutes(s.start) &&
        minutes < toMinutes(s.end) &&
        !dismissed.has(`${s.id}|${localDateKey(at)}`)
    ) || null
  );
}

function offsetFor(panel, day) {
  return panel.offsets?.[day] ?? 0;
}

function dayLabel(day) {
  return WEEKDAYS.find((w) => w.day === day)?.label ?? '';
}

function renderOverlay(screen, day, preview) {
  const panels = screen.panels
    .map(
      (panel, i) => `
      <div class="scheduled-screen-panel" data-panel="${i}">
        ${panel.name ? `<div class="scheduled-screen-panel-name">${escapeHtml(panel.name)}</div>` : ''}
        <div class="scheduled-screen-panel-body">
          <iframe src="${escapeHtml(panel.url)}" title="${escapeHtml(panel.name || panel.url)}"
            sandbox="allow-scripts allow-same-origin" referrerpolicy="no-referrer"></iframe>
          ${preview ? '<div class="scheduled-screen-calibrate" title="Säädä siirtymää hiiren rullalla"><span class="scheduled-screen-offset"></span></div>' : ''}
        </div>
      </div>`
    )
    .join('');
  return `
    <div class="scheduled-screen-bar">
      <span class="scheduled-screen-name">${escapeHtml(screen.name)}</span>
      <span class="scheduled-screen-day">${preview ? dayLabel(day) : now().toLocaleDateString('fi', { weekday: 'short', day: 'numeric', month: 'numeric' })}</span>
      <span class="scheduled-screen-time">${escapeHtml(screen.start)}–${escapeHtml(screen.end)}</span>
      ${preview ? '<span class="scheduled-screen-time">(esikatselu — säädä siirtymää hiiren rullalla)</span>' : ''}
      ${!preview && clockOffset ? `<span class="scheduled-screen-time">(testiaika ${now().toLocaleString('fi')})</span>` : ''}
      <button type="button" class="scheduled-screen-close">Sulje</button>
    </div>
    <div class="scheduled-screen-panels">${panels}</div>
  `;
}

function panelScale(bodyEl, panel) {
  return bodyEl.clientWidth / panel.cropWidth;
}

/**
 * Size and shift each iframe so the panel shows the page from the day's
 * offset down, with the cropped strip scaled to the panel width.
 */
function layoutPanels(el, screen, day) {
  el.querySelectorAll('.scheduled-screen-panel').forEach((panelEl) => {
    const panel = screen.panels[Number(panelEl.dataset.panel)];
    const bodyEl = panelEl.querySelector('.scheduled-screen-panel-body');
    const start = offsetFor(panel, day);
    const scale = panelScale(bodyEl, panel);
    const left = -panel.cropLeft * scale;
    const iframe = bodyEl.querySelector('iframe');
    iframe.style.width = `${screen.pageWidth}px`;
    iframe.style.height = `${Math.ceil(start + bodyEl.clientHeight / scale)}px`;
    iframe.style.transform = `translateX(${left}px) scale(${scale}) translateY(${-start}px)`;
    const label = panelEl.querySelector('.scheduled-screen-offset');
    if (label) label.textContent = `${dayLabel(day)}: ${start} px`;
  });
}

function removeOverlay() {
  document.getElementById(OVERLAY_ID)?.remove();
  shownKey = null;
}

function showOverlay(screen, key, day) {
  if (shownKey === key) return;
  removeOverlay();
  const preview = Boolean(previewScreen);
  const el = document.createElement('div');
  el.id = OVERLAY_ID;
  el.className = 'scheduled-screen';
  el.innerHTML = renderOverlay(screen, day, preview);
  el.querySelector('.scheduled-screen-close').addEventListener('click', () => {
    if (previewScreen) {
      previewScreen = null;
    } else {
      dismissed.add(`${screen.id}|${localDateKey(now())}`);
    }
    refreshScheduledScreens();
  });
  if (preview) {
    el.querySelectorAll('.scheduled-screen-calibrate').forEach((layer) => {
      layer.addEventListener(
        'wheel',
        (e) => {
          e.preventDefault();
          const panelEl = layer.closest('.scheduled-screen-panel');
          const index = Number(panelEl.dataset.panel);
          const panel = screen.panels[index];
          const scale = panelScale(layer.parentElement, panel);
          const current = panel.offsets?.[day] ?? 0;
          const next = Math.max(0, Math.round(current + e.deltaY / scale));
          panel.offsets = { ...panel.offsets, [day]: next };
          layoutPanels(el, screen, day);
          onPreviewCalibrate?.(index, day, next);
        },
        { passive: false }
      );
    });
  }
  document.body.appendChild(el);
  layoutPanels(el, screen, day);
  shownKey = key;
}

/** Re-evaluate the schedule and show, swap or hide the overlay as needed. */
export function refreshScheduledScreens() {
  if (previewScreen) {
    showOverlay(previewScreen, `preview|${previewCounter}`, previewDay);
    return;
  }
  const at = now();
  const screen = findActiveScreen(loadScreens(), at);
  if (!screen) {
    removeOverlay();
    return;
  }
  // Key includes the config and day, so edits to an active screen re-render it.
  showOverlay(screen, `scheduled|${at.getDay()}|${JSON.stringify(screen)}`, at.getDay());
}

/**
 * Show a screen immediately as it would look on `day`, regardless of its
 * schedule, until closed. Wheel over a panel adjusts that day's offset and
 * reports it through `onCalibrate(panelIndex, day, offset)`.
 */
export function previewScheduledScreen(screen, day, onCalibrate) {
  previewScreen = screen;
  previewDay = day;
  onPreviewCalibrate = onCalibrate;
  previewCounter++;
  refreshScheduledScreens();
}

export function startScheduledScreens() {
  if (intervalId !== null) return;
  refreshScheduledScreens();
  intervalId = setInterval(refreshScheduledScreens, CHECK_INTERVAL);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') document.querySelector(`#${OVERLAY_ID} .scheduled-screen-close`)?.click();
  });
  window.addEventListener('resize', () => {
    const el = document.getElementById(OVERLAY_ID);
    const screen = previewScreen || findActiveScreen(loadScreens());
    if (el && screen) layoutPanels(el, screen, previewScreen ? previewDay : now().getDay());
  });
}
