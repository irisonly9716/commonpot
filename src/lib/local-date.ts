/** Today's date in the user's own time zone, as YYYY-MM-DD. */
export function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** This month in the user's own time zone, as YYYY-MM. */
export function getLocalMonthString(date = new Date()): string {
  return getLocalDateString(date).slice(0, 7);
}
