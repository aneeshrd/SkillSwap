"use client";

import { useActionState, useState } from "react";
import {
  addSkillAction,
  removeSkillAction,
  setAvailabilityAction,
  updateProfileAction,
} from "@/app/actions/profile";
import { SCHOOL_YEARS, TIME_SLOTS, WEEKDAYS } from "@/lib/constants";
import { emptyState } from "@/lib/forms";
import type { SkillKind, UserSkillRow } from "@/lib/types";
import { Field, FormAlert, SubmitButton } from "./shared";

export function ProfileForm({
  defaults,
}: {
  defaults: { name: string; bio: string; year: string | null; avatar_emoji: string };
}) {
  const [state, action] = useActionState(updateProfileAction, emptyState);
  const [bio, setBio] = useState(defaults.bio);

  return (
    <form action={action} className="space-y-5">
      <FormAlert state={state} />

      <div className="grid gap-5 sm:grid-cols-[1fr_7rem]">
        <Field label="Display name" htmlFor="name" error={state.fieldErrors?.name}>
          <input id="name" name="name" className="input" defaultValue={defaults.name} required />
        </Field>
        <Field
          label="Initials"
          htmlFor="avatar_emoji"
          hint="Shown on your avatar"
          error={state.fieldErrors?.avatar_emoji}
        >
          <input
            id="avatar_emoji"
            name="avatar_emoji"
            className="input text-center"
            maxLength={8}
            defaultValue={defaults.avatar_emoji}
          />
        </Field>
      </div>

      <Field label="Year" htmlFor="year" error={state.fieldErrors?.year}>
        <select id="year" name="year" className="select" defaultValue={defaults.year ?? ""}>
          <option value="">Prefer not to say</option>
          {SCHOOL_YEARS.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="About you"
        htmlFor="bio"
        hint={`${bio.length}/600 — what you teach, how you teach it, and what you're trying to learn.`}
        error={state.fieldErrors?.bio}
      >
        <textarea
          id="bio"
          name="bio"
          className="textarea"
          maxLength={600}
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          placeholder="Spanish literature major, grew up bilingual. I run conversation sessions where you talk and I correct gently…"
        />
      </Field>

      <SubmitButton pendingLabel="Saving…">Save profile</SubmitButton>
    </form>
  );
}

export function AddSkillForm({
  kind,
  skills,
}: {
  kind: SkillKind;
  skills: { id: string; name: string; category_name: string }[];
}) {
  const [state, action] = useActionState(addSkillAction, emptyState);

  const grouped = skills.reduce<Record<string, typeof skills>>((acc, skill) => {
    (acc[skill.category_name] ??= []).push(skill);
    return acc;
  }, {});

  return (
    <form action={action} className="space-y-4">
      <FormAlert state={state} />
      <input type="hidden" name="kind" value={kind} />

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Field label="Skill" htmlFor={`skill_${kind}`} error={state.fieldErrors?.skill_id}>
          <select id={`skill_${kind}`} name="skill_id" className="select" defaultValue="" required>
            <option value="" disabled>
              Choose a skill
            </option>
            {Object.entries(grouped).map(([category, items]) => (
              <optgroup key={category} label={category}>
                {items.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>

        {kind === "teach" ? (
          <Field label="Level" htmlFor="level" error={state.fieldErrors?.level}>
            <select id="level" name="level" className="select" defaultValue="intermediate">
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </Field>
        ) : (
          <input type="hidden" name="level" value="beginner" />
        )}
      </div>

      {kind === "teach" ? (
        <Field
          label="How you teach it (optional)"
          htmlFor="note"
          hint="One line. “Bring your actual problem set” beats “I'm good at maths”."
          error={state.fieldErrors?.note}
        >
          <input id="note" name="note" className="input" maxLength={200} />
        </Field>
      ) : null}

      <SubmitButton className="btn btn-primary btn-sm" pendingLabel="Adding…">
        {kind === "teach" ? "Add to what I teach" : "Add to what I want to learn"}
      </SubmitButton>
    </form>
  );
}

export function SkillList({ skills, kind }: { skills: UserSkillRow[]; kind: SkillKind }) {
  if (skills.length === 0) {
    return (
      <p className="text-sm text-muted">
        {kind === "teach"
          ? "Nothing listed yet. You need at least one skill here before anyone can book you."
          : "Nothing listed yet. Adding goals here is what powers your personal match ranking."}
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {skills.map((skill) => (
        <li key={skill.id} className="card-flat flex items-center gap-3 px-4 py-3">
          <span aria-hidden>{skill.category_icon}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{skill.skill_name}</p>
            {skill.note ? (
              <p className="truncate text-xs text-muted">{skill.note}</p>
            ) : (
              <p className="text-xs text-faint">{skill.category_name}</p>
            )}
          </div>
          {kind === "teach" ? <span className="pill pill-skill">{skill.level}</span> : null}
          <form action={removeSkillAction}>
            <input type="hidden" name="user_skill_id" value={skill.id} />
            <button
              type="submit"
              className="text-xs font-semibold text-danger hover:underline"
              aria-label={`Remove ${skill.skill_name}`}
            >
              Remove
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}

export function AvailabilityForm({
  blocks,
}: {
  blocks: { weekday: number; start_minute: number; end_minute: number }[];
}) {
  const [state, action] = useActionState(setAvailabilityAction, emptyState);
  const existing = new Map(blocks.map((b) => [b.weekday, b]));
  const [active, setActive] = useState<Set<number>>(new Set(blocks.map((b) => b.weekday)));

  const toggle = (day: number) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  return (
    <form action={action} className="space-y-4">
      <FormAlert state={state} />

      <ul className="space-y-2">
        {WEEKDAYS.map((day) => {
          const current = existing.get(day.index);
          const on = active.has(day.index);
          return (
            <li
              key={day.index}
              className="flex flex-wrap items-center gap-3 rounded-md border border-line px-4 py-2.5"
            >
              <label className="flex w-28 items-center gap-2.5 text-sm font-semibold">
                <input
                  type="checkbox"
                  name={`day_${day.index}`}
                  checked={on}
                  onChange={() => toggle(day.index)}
                  className="size-4 accent-[var(--c-brand)]"
                />
                {day.long}
              </label>

              <div className={`flex items-center gap-2 ${on ? "" : "pointer-events-none opacity-40"}`}>
                <select
                  name={`start_${day.index}`}
                  className="select w-auto py-1.5 text-sm"
                  defaultValue={current?.start_minute ?? 960}
                  disabled={!on}
                >
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot.value} value={slot.value}>
                      {slot.label}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-faint">to</span>
                <select
                  name={`end_${day.index}`}
                  className="select w-auto py-1.5 text-sm"
                  defaultValue={current?.end_minute ?? 1200}
                  disabled={!on}
                >
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot.value} value={slot.value}>
                      {slot.label}
                    </option>
                  ))}
                </select>
              </div>
            </li>
          );
        })}
      </ul>

      <SubmitButton className="btn btn-primary btn-sm" pendingLabel="Saving…">
        Save availability
      </SubmitButton>
    </form>
  );
}
