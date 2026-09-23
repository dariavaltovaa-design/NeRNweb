import { useState } from 'react';
import { useProfile } from '../../db/exists';
import { fill } from '../../i18n/format';
import { useI18n } from '../../i18n/I18nProvider';
import { localDateOf } from '../../stats/dates';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { Kicker, PageHeader } from '../../ui/Heading';
import { Check, Close } from '../../ui/icons';

/** Saves a file made in the browser. Nothing is uploaded anywhere. */
function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** SPEC «Екран 7»: the privacy label, where data lives, export, delete, and why. */
export function PrivacyPage() {
  const { m } = useI18n();
  const profile = useProfile();
  const [deleting, setDeleting] = useState(false);
  const [word, setWord] = useState('');

  async function exportJson() {
    const { exportAll } = await import('../../db/repo');
    const data = await exportAll();
    download(
      `nern-${localDateOf(Date.now())}.json`,
      JSON.stringify(data, null, 2),
      'application/json',
    );
  }

  async function exportCsv() {
    const { exportAll, sessionsToCsv } = await import('../../db/repo');
    const data = await exportAll();
    download(
      `nern-sessions-${localDateOf(Date.now())}.csv`,
      sessionsToCsv(data.sessions),
      'text/csv',
    );
  }

  async function removeAll() {
    const { deleteEverything } = await import('../../db/repo');
    await deleteEverything();
    window.location.assign('/');
  }

  const hasData = profile !== null && profile !== undefined;

  return (
    <div className="flex flex-col gap-12">
      <PageHeader kicker={m.privacy.kicker} title={m.privacy.title} />
      <p className="-mt-6 text-18">{m.privacy.lead}</p>

      <section className="grid gap-8 rounded-card p-5 ring-1 ring-hairline ring-inset">
        <Column title={m.privacy.countsTitle} items={m.privacy.counts} mark="yes" />
        <Column title={m.privacy.neverTitle} items={m.privacy.never} mark="no" />
      </section>

      <section>
        <Kicker className="mb-3">{m.privacy.whereTitle}</Kicker>
        {m.privacy.whereText.map((line) => (
          <p key={line} className="text-16">
            {line}
          </p>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <Kicker className="mb-1">{m.privacy.exportTitle}</Kicker>
        {hasData ? (
          <>
            <Button variant="secondary" onClick={() => void exportJson()} wide>
              {m.privacy.exportJson}
            </Button>
            <Button variant="secondary" onClick={() => void exportCsv()} wide>
              {m.privacy.exportCsv}
            </Button>
            <Button variant="quiet" onClick={() => setDeleting(true)}>
              {m.privacy.deleteButton}
            </Button>
            <p className="mt-2 text-12 text-muted">
              {fill(m.privacy.consentVersion, { v: profile.consentVersion })}
            </p>
          </>
        ) : (
          <p className="text-16 text-muted">{m.privacy.empty}</p>
        )}
      </section>

      <section>
        <h2 className="serif-caps mb-4 text-28">{m.privacy.whyTitle}</h2>
        {m.privacy.why.map((p) => (
          <p key={p} className="mb-3 text-16">
            {p}
          </p>
        ))}
      </section>

      <section id="policy">
        <h2 className="serif-caps mb-4 text-28">{m.privacy.policyTitle}</h2>
        <ul>
          {m.privacy.policy.map((p) => (
            <li key={p} className="border-t border-hairline py-3 text-16">
              {p}
            </li>
          ))}
        </ul>
      </section>

      <section id="terms">
        <h2 className="serif-caps mb-4 text-28">{m.privacy.termsTitle}</h2>
        <ul>
          {m.privacy.terms.map((p) => (
            <li key={p} className="border-t border-hairline py-3 text-16">
              {p}
            </li>
          ))}
        </ul>
      </section>

      <Dialog
        open={deleting}
        onClose={() => {
          setDeleting(false);
          setWord('');
        }}
        title={m.privacy.deleteTitle}
      >
        <p className="text-16 text-muted">{m.privacy.deleteText}</p>
        <label className="mt-6 block">
          <span className="text-14">
            {fill(m.privacy.deleteConfirmLabel, { word: m.privacy.deleteWord })}
          </span>
          <input
            value={word}
            onChange={(e) => setWord(e.target.value)}
            autoComplete="off"
            autoCapitalize="off"
            className="mt-2 w-full rounded-inner bg-surface px-4 py-3 text-16 ring-1 ring-hairline ring-inset focus:ring-text focus:outline-none"
          />
        </label>
        <div className="mt-6">
          <Button
            onClick={() => void removeAll()}
            disabled={word.trim().toLowerCase() !== m.privacy.deleteWord}
            wide
          >
            {m.privacy.deleteFinal}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function Column({
  title,
  items,
  mark,
}: {
  title: string;
  items: readonly string[];
  mark: 'yes' | 'no';
}) {
  return (
    <div>
      <h2 className="font-display text-16 font-semibold tracking-[0.04em] uppercase">{title}</h2>
      <ul className="mt-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3 border-t border-hairline py-3 text-16">
            <span className={`mt-0.5 shrink-0 ${mark === 'yes' ? 'text-accent' : 'text-muted'}`}>
              {mark === 'yes' ? <Check /> : <Close />}
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
