import type { JudoCompetition } from '@/types';

export interface CompetitionFormState {
  name: string;
  startsAtDate: string;
  startsAtTime: string;
  weighInAtDate: string;
  weighInAtTime: string;
  location: string;
  address: string;
  weightClassKg: string;
  targetWeighInKg: string;
  status: JudoCompetition['status'];
  finalPlace: string;
  medal: '' | 'gold' | 'silver' | 'bronze' | 'none';
  wins: string;
  losses: string;
  notes: string;
}

export function emptyCompetitionForm(): CompetitionFormState {
  return {
    name: '',
    startsAtDate: '',
    startsAtTime: '',
    weighInAtDate: '',
    weighInAtTime: '',
    location: '',
    address: '',
    weightClassKg: '',
    targetWeighInKg: '',
    status: 'planned',
    finalPlace: '',
    medal: '',
    wins: '',
    losses: '',
    notes: '',
  };
}

function splitDateTime(iso: string | undefined): [string, string] {
  if (!iso) return ['', ''];
  const date = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  ];
}

export function competitionToForm(competition: JudoCompetition): CompetitionFormState {
  const [startsAtDate, startsAtTime] = splitDateTime(competition.startsAt);
  const [weighInAtDate, weighInAtTime] = splitDateTime(competition.weighInAt);
  return {
    name: competition.name,
    startsAtDate,
    startsAtTime,
    weighInAtDate,
    weighInAtTime,
    location: competition.location ?? '',
    address: competition.address ?? '',
    weightClassKg: competition.weightClassKg.toString(),
    targetWeighInKg: competition.targetWeighInKg?.toString() ?? '',
    status: competition.status,
    finalPlace: competition.finalPlace?.toString() ?? '',
    medal: competition.medal ?? '',
    wins: competition.wins?.toString() ?? '',
    losses: competition.losses?.toString() ?? '',
    notes: competition.notes ?? '',
  };
}

function combineDateTime(date: string, time: string): string | undefined {
  if (!date) return undefined;
  return new Date(`${date}T${time || '00:00'}`).toISOString();
}

export function formToCompetitionPatch(
  values: CompetitionFormState,
): Omit<JudoCompetition, 'id' | 'createdAt' | 'updatedAt'> | null {
  if (!values.name.trim() || !values.startsAtDate || !(Number(values.weightClassKg) > 0)) return null;
  return {
    name: values.name.trim(),
    startsAt: combineDateTime(values.startsAtDate, values.startsAtTime)!,
    weighInAt: combineDateTime(values.weighInAtDate, values.weighInAtTime),
    location: values.location.trim() || undefined,
    address: values.address.trim() || undefined,
    weightClassKg: Number(values.weightClassKg),
    targetWeighInKg: values.targetWeighInKg ? Number(values.targetWeighInKg) : undefined,
    status: values.status,
    finalPlace: values.finalPlace ? Number(values.finalPlace) : undefined,
    medal: values.status === 'completed' && values.medal ? values.medal : undefined,
    wins: values.status === 'completed' && values.wins ? Number(values.wins) : undefined,
    losses: values.status === 'completed' && values.losses ? Number(values.losses) : undefined,
    notes: values.notes.trim() || undefined,
  };
}
