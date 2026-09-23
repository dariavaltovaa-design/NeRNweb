import type { Experiment } from '../../db/schema';
import type { Messages } from '../../i18n/messages';

export type TemplateId = keyof Messages['experiments']['templates'];

/** The 6 library experiments from SPEC. Evening habits are measured by the next morning's test. */
export const TEMPLATES: ReadonlyArray<{ id: TemplateId; timing: Experiment['timing'] }> = [
  { id: 'phone_bedroom', timing: 'evening' },
  { id: 'no_scroll_bed', timing: 'evening' },
  { id: 'no_coffee_15', timing: 'evening' },
  { id: 'morning_no_phone', timing: 'morning' },
  { id: 'daylight', timing: 'morning' },
  { id: 'notifications_off', timing: 'morning' },
];

function isTemplateId(id: string | undefined, m: Messages): id is TemplateId {
  return id !== undefined && id in m.experiments.templates;
}

/** Title and conditions in the current language (library) or as the person wrote them (custom). */
export function experimentTexts(experiment: Experiment, m: Messages) {
  if (isTemplateId(experiment.templateId, m)) {
    const t = m.experiments.templates[experiment.templateId];
    return { title: t.title, a: t.a, b: t.b };
  }
  return { title: experiment.title, a: experiment.conditionA, b: experiment.conditionB };
}
