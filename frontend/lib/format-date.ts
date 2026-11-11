/** Shows a reading's full date with year; same-day readings keep the API's time-only label. */
export function formatReadingDate(datePretty: string, date: string): string {
  if (datePretty.includes(':')) return datePretty;
  const [year, month, day] = date.slice(0, 10).split('-');
  return year && month && day ? `${day}.${month}.${year}` : datePretty;
}
