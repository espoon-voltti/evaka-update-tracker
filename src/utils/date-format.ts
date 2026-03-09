/**
 * Format an ISO 8601 timestamp in Finnish style with Helsinki timezone.
 * Output matches the web UI format: "pe 6.3. klo 09.28"
 */
export function formatFinnishDateTime(isoString: string): string {
  const d = new Date(isoString);

  const weekday = d.toLocaleDateString('fi', {
    weekday: 'short',
    timeZone: 'Europe/Helsinki',
  });

  const day = d.toLocaleDateString('fi', {
    day: 'numeric',
    timeZone: 'Europe/Helsinki',
  });

  const month = d.toLocaleDateString('fi', {
    month: 'numeric',
    timeZone: 'Europe/Helsinki',
  });

  const time = d.toLocaleTimeString('fi', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Helsinki',
  });

  return `${weekday} ${parseInt(day)}.${parseInt(month)}. klo ${time}`;
}
