import { describe, expect, it } from 'vitest';
import { buildCompetitionIcs } from '@/lib/ics';
import type { JudoCompetition } from '@/types';

function competition(partial: Partial<JudoCompetition> = {}): JudoCompetition {
  return {
    id: 'comp-1',
    name: 'גביע הארץ',
    startsAt: '2026-03-01T09:00:00.000Z',
    weightClassKg: 73,
    status: 'planned',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

describe('buildCompetitionIcs', () => {
  it('produces a valid VCALENDAR/VEVENT structure with the competition details', () => {
    const ics = buildCompetitionIcs(
      competition({ location: 'היכל הספורט', weighInAt: '2026-02-28T18:00:00.000Z', notes: 'להביא שני קימונו' }),
    );

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('SUMMARY:גביע הארץ');
    expect(ics).toContain('LOCATION:היכל הספורט');
    expect(ics).toContain('UID:comp-1@personal-sport-app');
    expect(ics).toContain('DTSTART:20260301T090000Z');
    expect(ics).toContain('קטגוריית משקל: 73');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
  });

  it('includes a week-before and day-before reminder by default', () => {
    const ics = buildCompetitionIcs(competition());
    const alarmCount = (ics.match(/BEGIN:VALARM/g) ?? []).length;
    expect(alarmCount).toBe(2);
    expect(ics).toContain('TRIGGER:-P7D');
    expect(ics).toContain('TRIGGER:-P1D');
  });

  it('honors a custom reminder list, including zero reminders', () => {
    const withOne = buildCompetitionIcs(competition(), [3]);
    expect((withOne.match(/BEGIN:VALARM/g) ?? []).length).toBe(1);
    expect(withOne).toContain('TRIGGER:-P3D');

    const withNone = buildCompetitionIcs(competition(), []);
    expect(withNone).not.toContain('VALARM');
  });

  it('escapes commas, semicolons and newlines in free text', () => {
    const ics = buildCompetitionIcs(competition({ name: 'תחרות; מיוחדת, השנה' }));
    expect(ics).toContain('SUMMARY:תחרות\\; מיוחדת\\, השנה');
  });
});
