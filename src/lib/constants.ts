/** Shared option lists. Kept out of "use server" modules, which may only
 *  export async functions. */

export const SCHOOL_YEARS = [
  "First year",
  "Second year",
  "Third year",
  "Fourth year",
  "Graduate",
  "Staff",
] as const;

export const RATING_TAGS = [
  "patient",
  "well prepared",
  "clear explanations",
  "on time",
  "encouraging",
  "knew the material",
  "good listener",
] as const;

export const REPORT_CATEGORIES = [
  { value: "no_show", label: "They didn't show up" },
  { value: "inappropriate_behaviour", label: "Inappropriate behaviour" },
  { value: "harassment", label: "Harassment or bullying" },
  { value: "misrepresented_skill", label: "Claimed a skill they don't have" },
  { value: "safety_concern", label: "I felt unsafe" },
  { value: "spam", label: "Spam or advertising" },
  { value: "other", label: "Something else" },
] as const;

export const SESSION_DURATIONS = [
  { minutes: 30, credits: 1, label: "30 minutes" },
  { minutes: 60, credits: 2, label: "1 hour" },
  { minutes: 90, credits: 3, label: "1 hour 30" },
  { minutes: 120, credits: 4, label: "2 hours" },
] as const;

export const TIME_SLOTS: { value: number; label: string }[] = Array.from(
  { length: 29 },
  (_, i) => {
    const minute = 420 + i * 30; // 07:00 → 21:00
    const hour24 = Math.floor(minute / 60);
    const mm = String(minute % 60).padStart(2, "0");
    const suffix = hour24 >= 12 ? "pm" : "am";
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    return { value: minute, label: `${hour12}:${mm}${suffix}` };
  }
);

export const WEEKDAYS = [
  { index: 1, short: "Mon", long: "Monday" },
  { index: 2, short: "Tue", long: "Tuesday" },
  { index: 3, short: "Wed", long: "Wednesday" },
  { index: 4, short: "Thu", long: "Thursday" },
  { index: 5, short: "Fri", long: "Friday" },
  { index: 6, short: "Sat", long: "Saturday" },
  { index: 0, short: "Sun", long: "Sunday" },
] as const;

export const SLOGAN = "Your skills become your currency.";
