import { useRef, useState } from 'react';
import { saveCheckIn } from '../../db/repo';
import type { CheckIn as CheckInData, Session } from '../../db/schema';
import { fill } from '../../i18n/format';
import { useI18n } from '../../i18n/I18nProvider';
import { Chip, Scale5, Stepper, Toggle } from '../../ui/Controls';

const TAGS = ['coffee', 'reels_before_bed', 'late_sleep', 'sport', 'stress', 'nap'] as const;
const NOTE_MAX = 140;

/**
 * The short check-in under the Form: sleep, sleep quality, mood, a night alert, tags, a note.
 * Every change is saved at once, on this device only.
 */
export function CheckIn({
  session,
  conditionQuestion,
}: {
  session: Session;
  /** "Did you keep condition B last night?" — only when the test belongs to an experiment. */
  conditionQuestion: string | null;
}) {
  const { m, formatNumber } = useI18n();
  // The parent remounts this component (key) when the session changes.
  const [draft, setDraft] = useState<CheckInData>(session.checkIn ?? { tags: [] });
  const [saved, setSaved] = useState(false);
  const noteTimer = useRef<number | null>(null);

  function update(patch: Partial<CheckInData>, { debounce = false } = {}) {
    const next = { ...draft, ...patch };
    setDraft(next);
    const persist = () =>
      void saveCheckIn(session.id, next).then(() => {
        setSaved(true);
      });
    if (noteTimer.current !== null) window.clearTimeout(noteTimer.current);
    if (debounce) noteTimer.current = window.setTimeout(persist, 500);
    else persist();
  }

  const sleep = draft.sleepHours;

  return (
    <section aria-labelledby="checkin-title" className="flex flex-col gap-8">
      <h2 id="checkin-title" className="serif-caps text-28">
        {m.checkin.title}
      </h2>

      {conditionQuestion && (
        <fieldset className="rounded-card p-5 ring-1 ring-accent ring-inset">
          <legend className="sr-only">{conditionQuestion}</legend>
          <p className="text-16" aria-hidden="true">
            {conditionQuestion}
          </p>
          <div className="mt-4 flex gap-2">
            <Chip
              pressed={draft.conditionKept === true}
              onToggle={() => update({ conditionKept: true })}
            >
              {m.common.yes}
            </Chip>
            <Chip
              pressed={draft.conditionKept === false}
              onToggle={() => update({ conditionKept: false })}
            >
              {m.common.no}
            </Chip>
          </div>
          {draft.conditionKept === false && (
            <p className="mt-3 text-14 text-muted">{m.checkin.conditionNo}</p>
          )}
        </fieldset>
      )}

      <div>
        <p className="kicker mb-3 text-muted">{m.checkin.sleep}</p>
        <Stepper
          label={m.checkin.sleep}
          value={sleep ?? 7}
          display={
            sleep === undefined
              ? '—'
              : `${formatNumber(sleep, { maximumFractionDigits: 1 })} ${m.common.hoursShort}`
          }
          onChange={(value) => update({ sleepHours: sleep === undefined ? 7 : value })}
          step={0.5}
          min={0}
          max={14}
        />
      </div>

      <Scale5
        label={m.checkin.sleepQuality}
        name="sleepQuality"
        value={draft.sleepQuality}
        low={m.checkin.sleepQualityLow}
        high={m.checkin.sleepQualityHigh}
        onChange={(sleepQuality) => update({ sleepQuality })}
      />

      <Scale5
        label={m.checkin.mood}
        name="mood"
        value={draft.mood}
        low={m.checkin.moodLow}
        high={m.checkin.moodHigh}
        onChange={(mood) => update({ mood })}
      />

      <div className="border-y border-hairline py-1">
        <Toggle
          label={m.checkin.nightAlert}
          checked={draft.nightAlert === true}
          onChange={(nightAlert) => update({ nightAlert })}
        />
      </div>

      <fieldset>
        <legend className="kicker mb-3 text-muted">{m.checkin.tags}</legend>
        <div className="flex flex-wrap gap-2">
          {TAGS.map((tag) => (
            <Chip
              key={tag}
              pressed={draft.tags.includes(tag)}
              onToggle={() =>
                update({
                  tags: draft.tags.includes(tag)
                    ? draft.tags.filter((t) => t !== tag)
                    : [...draft.tags, tag],
                })
              }
            >
              {m.checkin.tagNames[tag]}
            </Chip>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="kicker mb-3 flex justify-between text-muted">
          <span>{m.checkin.note}</span>
          <span>
            {(draft.note ?? '').length}/{NOTE_MAX}
          </span>
        </span>
        <textarea
          value={draft.note ?? ''}
          maxLength={NOTE_MAX}
          rows={2}
          placeholder={m.checkin.notePlaceholder}
          onChange={(e) => update({ note: e.target.value }, { debounce: true })}
          className="w-full resize-none rounded-inner bg-surface p-4 text-16 ring-1 ring-hairline ring-inset placeholder:text-muted focus:ring-text focus:outline-none"
        />
      </label>

      <p aria-live="polite" className="kicker -mt-4 text-muted">
        {saved ? m.checkin.saved : ''}
      </p>
    </section>
  );
}

export function conditionQuestionFor(
  m: ReturnType<typeof useI18n>['m'],
  session: Session,
  timing: 'evening' | 'morning' | undefined,
): string | null {
  if (!session.condition || !timing) return null;
  return fill(timing === 'evening' ? m.checkin.conditionEvening : m.checkin.conditionMorning, {
    c: session.condition,
  });
}
