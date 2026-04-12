/**
 * Lista de fusos IANA para seleção (searchable).
 * Usa Intl.supportedValuesOf quando disponível (Chrome 99+, Safari 16+, Firefox 100+).
 */
const FALLBACK_ZONES = [
  'America/Sao_Paulo',
  'America/Manaus',
  'America/Fortaleza',
  'America/Belem',
  'America/Bahia',
  'America/Recife',
  'America/Rio_Branco',
  'America/Cuiaba',
  'America/Campo_Grande',
  'America/Noronha',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/Lisbon',
  'Europe/London',
  'Europe/Paris',
  'UTC'
];

export function getIanaTimezones() {
  try {
    if (typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function') {
      return Intl.supportedValuesOf('timeZone').sort((a, b) => a.localeCompare(b));
    }
  } catch {
    /* ignore */
  }
  return [...FALLBACK_ZONES].sort((a, b) => a.localeCompare(b));
}
