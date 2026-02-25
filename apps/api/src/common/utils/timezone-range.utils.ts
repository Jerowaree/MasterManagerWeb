function getTimeZoneParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0');

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

function timeZoneOffsetMs(utcDate: Date, timeZone: string) {
  const zoned = getTimeZoneParts(utcDate, timeZone);
  const zonedAsUtc = Date.UTC(
    zoned.year,
    zoned.month - 1,
    zoned.day,
    zoned.hour,
    zoned.minute,
    zoned.second
  );

  return zonedAsUtc - utcDate.getTime();
}

function zonedLocalToUtc(
  parts: { year: number; month: number; day: number; hour: number; minute: number; second: number },
  timeZone: string
) {
  const utcGuess = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  );
  const offset = timeZoneOffsetMs(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offset);
}

export function getLocalDayUtcRange(referenceUtcDate: Date, timeZone: string) {
  const localNow = getTimeZoneParts(referenceUtcDate, timeZone);
  const startUtc = zonedLocalToUtc(
    {
      year: localNow.year,
      month: localNow.month,
      day: localNow.day,
      hour: 0,
      minute: 0,
      second: 0,
    },
    timeZone
  );

  const localTomorrowUtcApprox = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);
  const localTomorrow = getTimeZoneParts(localTomorrowUtcApprox, timeZone);
  const endUtc = zonedLocalToUtc(
    {
      year: localTomorrow.year,
      month: localTomorrow.month,
      day: localTomorrow.day,
      hour: 0,
      minute: 0,
      second: 0,
    },
    timeZone
  );

  return { startUtc, endUtc };
}

export function isValidIanaTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}
