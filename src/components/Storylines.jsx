import { useState } from "react";
import { ArrowUpRight, ChevronDown, Eye, TrendingDown, TrendingUp, Activity } from "lucide-react";
import { relativeTime, textLanguage } from "./dateLabels";

// Objectives come from scripts/intelligence/storylines.py; tones only group them visually.
const OBJECTIVE_TONE = {
  offence: "attack", pressure: "attack", mobilisation: "mobilise", defence: "defend",
  legal: "legal", governance: "govern", coalition: "ally", realignment: "ally",
  organisation: "organise", goodwill: "govern",
};

const MOMENTUM = {
  escalating: { label: "Escalating", icon: TrendingUp },
  active: { label: "Active", icon: Activity },
  cooling: { label: "Cooling", icon: TrendingDown },
};

const CONFIDENCE_LABEL = {
  high: "Strong signals", medium: "Moderate signals", low: "Weak signals; read with care",
};

const formatCount = (value) => Number(value || 0).toLocaleString("en-IN");

export function IntentTag({ move, compact = false }) {
  if (!move) return null;
  return (
    <span
      className={`intent-tag tone-${OBJECTIVE_TONE[move.objective] || "organise"} confidence-${move.confidence}`}
      title={`Inferred intent · ${CONFIDENCE_LABEL[move.confidence] || ""}${move.signals ? ` · ${move.signals.join("; ")}` : ""}`}
    >
      <span className="intent-action">{move.actionLabel}</span>
      {!compact && <span className="intent-reading">{move.intent}</span>}
    </span>
  );
}

function StepRow({ step, now, onPerson, isKnown }) {
  return (
    <li className={`chain-step tone-${OBJECTIVE_TONE[step.objective] || "organise"}`}>
      <span className="chain-dot" aria-hidden="true" />
      <div className="chain-body">
        <p className="chain-head">
          <button type="button" className="chain-actor" onClick={() => onPerson?.(step.actor)} disabled={!isKnown(step.actor)}>
            {step.actorName}
          </button>
          <span className="chain-action">{step.actionLabel.toLowerCase()}</span>
          {step.counterparts?.length > 0 && (
            <span className="chain-target">→ {step.counterparts.slice(0, 2).map(c => c.name).join(", ")}</span>
          )}
          {step.date && <time dateTime={step.date}>{relativeTime(step.date, now)}</time>}
        </p>
        <p className="chain-intent" title={(step.signals || []).join("; ")}>
          <span className="visually-hidden">Inferred intent: </span>{step.intent}
          {step.confidence === "low" && <span className="chain-weak"> · weak signal</span>}
        </p>
        <a lang={textLanguage(step.title)} className="chain-title" href={step.url} target="_blank" rel="noreferrer">
          {step.title}
        </a>
        <span className="chain-source">
          {step.source}{step.outlets > 1 ? ` +${formatCount(step.outlets - 1)}` : ""}
        </span>
      </div>
    </li>
  );
}

export function StorylineCard({ thread, now, onPerson, isKnown = () => true, defaultOpen = false, preview = 3 }) {
  const [open, setOpen] = useState(defaultOpen);
  const momentum = MOMENTUM[thread.momentum] || MOMENTUM.active;
  const MomentumIcon = momentum.icon;
  const steps = open ? thread.steps : thread.steps.slice(-preview);
  const analysis = open ? thread.analysis || [] : (thread.analysis || []).slice(0, 1);
  return (
    <article className="storyline-card" data-momentum={thread.momentum}>
      <header className="storyline-head">
        <p className="storyline-kicker">
          <span className="storyline-momentum"><MomentumIcon size={13} aria-hidden="true" />{momentum.label}</span>
          <span>{formatCount(thread.stepCount)} moves</span>
          {thread.lastAt && <span>latest {relativeTime(thread.lastAt, now)}</span>}
        </p>
        <h3 lang={textLanguage(thread.title)} className="storyline-title">{thread.title}</h3>
        <p className="storyline-cast">
          {thread.participants.slice(0, 5).map(person => (
            <button key={person.id} type="button" className="cast-chip" onClick={() => onPerson?.(person.id)} disabled={!isKnown(person.id)}>
              {person.name}<span>{formatCount(person.moves)}</span>
            </button>
          ))}
        </p>
      </header>
      {analysis.length > 0 && (
        <ul className="storyline-analysis">
          {analysis.map(line => <li key={line}>{line}</li>)}
        </ul>
      )}
      <ol className="chain" aria-label="Moves in order">
        {!open && thread.steps.length > preview && (
          <li className="chain-more" aria-hidden="true">{formatCount(thread.steps.length - preview)} earlier moves</li>
        )}
        {steps.map(step => <StepRow key={step.storyId} step={step} now={now} onPerson={onPerson} isKnown={isKnown} />)}
      </ol>
      <footer className="storyline-foot">
        {thread.watchFor && (
          <p className="storyline-watch"><Eye size={14} aria-hidden="true" /><span><strong>Watch for</strong> {thread.watchFor}</span></p>
        )}
        {(thread.steps.length > preview || (thread.analysis || []).length > 1) && (
          <button type="button" className="link-button storyline-toggle" aria-expanded={open} onClick={() => setOpen(value => !value)}>
            {open ? "Show fewer" : "Show the whole chain"}<ChevronDown size={14} aria-hidden="true" />
          </button>
        )}
      </footer>
    </article>
  );
}

function CounterpartList({ title, items, onPerson, isKnown, empty }) {
  return (
    <section className="playbook-list">
      <h4>{title}</h4>
      {items.length ? (
        <ol>
          {items.map(item => {
            const personId = item.id.startsWith("@") ? item.id.slice(1) : null;
            return (
              <li key={item.id}>
                {personId && isKnown(personId)
                  ? <button type="button" className="link-button" onClick={() => onPerson?.(personId)}>{item.name}</button>
                  : <span>{item.name}</span>}
                <span className="playbook-count">{formatCount(item.count)}</span>
              </li>
            );
          })}
        </ol>
      ) : <p className="playbook-empty">{empty}</p>}
    </section>
  );
}

export function PlaybookPanel({ playbook, threads = [], objectives = {}, now, onPerson, isKnown = () => true }) {
  if (!playbook) {
    return (
      <div className="playbook-empty-state">
        <h3>No recent moves on record</h3>
        <p>Moves appear here once recent coverage names this politician as the one acting: a statement, protest, alliance talk or legal step.</p>
      </div>
    );
  }
  const total = playbook.moveCount || 1;
  const theirThreads = threads.filter(thread => playbook.threads?.includes(thread.id));
  return (
    <div className="playbook">
      <section className="playbook-summary">
        <p className="workspace-eyebrow">Current posture · inferred from {formatCount(playbook.moveCount)} moves</p>
        <h3 className={`playbook-posture tone-${OBJECTIVE_TONE[playbook.posture] || "organise"}`}>{playbook.postureLabel}</h3>
        {playbook.shift && (
          <p className="playbook-shift">
            Shifted from <strong>{(objectives[playbook.shift.from] || playbook.shift.from).toLowerCase()}</strong> to{" "}
            <strong>{(objectives[playbook.shift.to] || playbook.shift.to).toLowerCase()}</strong> this week.
          </p>
        )}
        <p className="playbook-note">
          Intent is read from what each story says they did and whom it involved, weighed against who governs the state and the Centre.
          It is an analyst’s reading, not a statement of fact.
        </p>
        <ol className="objective-bars" aria-label="What their moves are for">
          {playbook.objectives.map(item => (
            <li key={item.id} className={`tone-${OBJECTIVE_TONE[item.id] || "organise"}`}>
              <span className="objective-label">{item.label}</span>
              <span className="objective-count">{formatCount(item.count)}</span>
              <span className="objective-bar" style={{ "--share": item.count / total }} aria-hidden="true" />
            </li>
          ))}
        </ol>
      </section>

      <div className="playbook-grid">
        <CounterpartList title="Takes aim at" items={playbook.targets} onPerson={onPerson} isKnown={isKnown} empty="No clear targets yet." />
        <CounterpartList title="Under fire from" items={playbook.attackedBy} onPerson={onPerson} isKnown={isKnown} empty="No one is attacking them by name." />
        <CounterpartList title="Courting" items={playbook.allies} onPerson={onPerson} isKnown={isKnown} empty="No alliance moves recorded." />
      </div>

      {theirThreads.length > 0 && (
        <section className="playbook-threads">
          <h4>Storylines they are part of</h4>
          <div className="storyline-stack">
            {theirThreads.slice(0, 4).map(thread => <StorylineCard key={thread.id} thread={thread} now={now} onPerson={onPerson} isKnown={isKnown} />)}
          </div>
        </section>
      )}

      <section className="playbook-moves">
        <h4>Recent moves</h4>
        <ol className="chain">
          {playbook.moves.map(step => <StepRow key={step.storyId} step={step} now={now} onPerson={onPerson} isKnown={isKnown} />)}
        </ol>
      </section>
    </div>
  );
}

export function RivalryList({ relations = [], onPerson, isKnown = () => true }) {
  const attacks = relations.filter(item => item.action === "attack").slice(0, 8);
  if (!attacks.length) return null;
  const top = attacks[0].count;
  return (
    <section className="rail-card">
      <h2>Who is targeting whom</h2>
      <ol className="rank-list rivalry-list">
        {attacks.map(item => (
          <li key={`${item.from}-${item.to}`}>
            <button type="button" onClick={() => onPerson?.(item.from)} disabled={!isKnown(item.from)}>
              <span className="rank-name">{item.fromName} <ArrowUpRight size={12} aria-hidden="true" className="rivalry-arrow" /> {item.toName}</span>
              <span className="rank-count">{formatCount(item.count)}</span>
              <span className="rank-bar" style={{ "--share": item.count / top }} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
