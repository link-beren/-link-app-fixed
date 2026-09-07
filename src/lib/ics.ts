import type { JudoCompetition } from '@/types';

function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function foldLine(line: string): string {
  // RFC 5545 requires folding lines longer than 75 octets.
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    chunks.push(rest.slice(0, 75));
    rest = ' ' + rest.slice(75);
  }
  chunks.push(rest);
  return chunks.join('\r\n');
}

/**
 * Builds a downloadable .ics calendar event for a competition (spec 9.5).
 * `reminderDaysBefore` defaults to the spec's two reminders: a week before
 * and a day before the event.
 */
export function buildCompetitionIcs(competition: JudoCompetition, reminderDaysBefore: number[] = [7, 1]): string {
  const start = new Date(competition.startsAt);
  const end = new Date(start.getTime() + 60 * 60 * 1000); // 1-hour placeholder duration

  const descriptionParts = [
    competition.weighInAt ? `שקילה: ${new Date(competition.weighInAt).toLocaleString('he-IL')}` : null,
    `קטגוריית משקל: ${competition.weightClassKg} ק"ג`,
    competition.notes ? `הערות: ${competition.notes}` : null,
  ].filter((part): part is string => part !== null);

  const alarmLines = reminderDaysBefore.flatMap((days) => [
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcsText(`תזכורת: ${competition.name}`)}`,
    `TRIGGER:-P${days}D`,
    'END:VALARM',
  ]);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//personal-sport-app//judo//HE',
    'BEGIN:VEVENT',
    `UID:${competition.id}@personal-sport-app`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${escapeIcsText(competition.name)}`,
    competition.location ? `LOCATION:${escapeIcsText(competition.location)}` : null,
    descriptionParts.length > 0 ? `DESCRIPTION:${escapeIcsText(descriptionParts.join('\\n'))}` : null,
    ...alarmLines,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter((line): line is string => line !== null);

  return lines.map(foldLine).join('\r\n') + '\r\n';
}
