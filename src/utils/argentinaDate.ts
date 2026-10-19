// La app es solo para Argentina: "hoy" es siempre el día en UTC-3, aunque el
// navegador esté en otra zona horaria.
const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires';

// Fecha de hoy en Argentina con formato AAAA-MM-DD (el que espera la API y un <input type="date">).
export function todayInArgentina(): string {
  // en-CA formatea las fechas como AAAA-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: ARGENTINA_TIME_ZONE }).format(new Date());
}

// "2026-10-19" → "19/10/2026", sin pasar por Date para no correr el día por la zona horaria.
export function formatIsoDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return year && month && day ? `${day}/${month}/${year}` : isoDate;
}
