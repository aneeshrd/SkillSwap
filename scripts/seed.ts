/**
 * Seeds a believable SkillSwap community for local development and demos.
 *
 *   npm run db:reset    # wipe and reseed
 *   npm run db:seed     # seed into an existing database
 *
 * Every seeded student uses the password below. Change it or drop the seed
 * before putting this anywhere real.
 */

import fs from "node:fs";
import path from "node:path";

import { hashPassword } from "../src/lib/auth";
import { balanceOf, creditsForMinutes, postEntry } from "../src/lib/credits";
import { getDb, newId, transact } from "../src/lib/db";

const DEMO_PASSWORD = "swapdemo1234";

// ----------------------------------------------------------------- env
// tsx doesn't read .env.local on its own, and src/lib/auth.ts needs
// SESSION_SECRET to exist before it is imported.
function loadEnv(): void {
  for (const file of [".env.local", ".env"]) {
    const full = path.join(process.cwd(), file);
    if (!fs.existsSync(full)) continue;
    for (const line of fs.readFileSync(full, "utf8").split("\n")) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key] !== undefined) continue;
      process.env[key] = rawValue.replace(/^["']|["']$/g, "");
    }
  }
  process.env.SESSION_SECRET ??= "seed-only-secret-not-for-production-use-0000";
  process.env.ALLOWED_EMAIL_DOMAINS ??=
    "students.northfield.edu,northfield.edu,example.edu";
}
loadEnv();

// Note: the modules above read SESSION_SECRET / DATABASE_PATH lazily, inside
// functions, so loading the env after the imports is safe.
const db = getDb();

// ------------------------------------------------------------- utilities
const iso = (daysFromNow: number, hour = 15, minute = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

function wipe(): void {
  const tables = [
    "admin_audit",
    "notifications",
    "rate_limits",
    "auth_sessions",
    "verification_codes",
    "blocks",
    "reports",
    "ratings",
    "credit_ledger",
    "sessions",
    "availability",
    "user_skills",
    "users",
    "schools",
  ];
  // skills and skill_categories are NOT wiped: they come from
  // src/lib/taxonomy.sql and exist in every deployment, demo or not.
  db.pragma("foreign_keys = OFF");
  for (const table of tables) db.prepare(`DELETE FROM ${table}`).run();
  db.pragma("foreign_keys = ON");
}

// --------------------------------------------------------------- schools
const SCHOOLS = [
  {
    name: "Northfield University",
    slug: "northfield",
    email_domains: "students.northfield.edu,northfield.edu",
    city: "Northfield",
    region: "Vermont",
  },
  {
    name: "Example State College",
    slug: "example-state",
    email_domains: "example.edu",
    city: "Rivermouth",
    region: "Oregon",
  },
];

// The skill catalogue lives in src/lib/taxonomy.sql and is applied to every
// database on connect, so it is shared by demo and production deployments.

// ----------------------------------------------------------------- people
interface SeedUser {
  name: string;
  email: string;
  handle: string;
  year: string;
  school: string;
  bio: string;
  teach: [string, "beginner" | "intermediate" | "advanced", string][];
  learn: string[];
  admin?: boolean;
  unverified?: boolean;
  avail?: [number, number, number][];
}

const PEOPLE: SeedUser[] = [
  {
    name: "Maya Rodriguez",
    email: "maya.rodriguez@students.northfield.edu",
    handle: "maya-rodriguez",
    year: "Third year",
    school: "northfield",
    bio: "Spanish literature major, grew up bilingual. I run conversation sessions where you talk and I correct gently — no textbooks. Trying to get through my stats requirement this term.",
    teach: [
      ["Spanish Conversation", "advanced", "Conversation-first. Bring a topic you care about."],
      ["Essay Structure", "intermediate", "Especially thesis statements and transitions."],
      ["Creative Writing", "intermediate", ""],
    ],
    learn: ["Statistics", "Python Basics", "Bike Repair"],
    avail: [
      [1, 960, 1200],
      [3, 960, 1200],
      [6, 600, 840],
    ],
  },
  {
    name: "Daniel Osei",
    email: "daniel.osei@students.northfield.edu",
    handle: "daniel-osei",
    year: "Fourth year",
    school: "northfield",
    bio: "Maths and physics. I've TA'd Calc I twice and I think most people who 'can't do maths' were just taught it badly. Patient with the basics.",
    teach: [
      ["Calculus I", "advanced", "From limits to integrals. I'll work your actual problem set."],
      ["Calculus II", "advanced", ""],
      ["Physics — Mechanics", "advanced", ""],
      ["Linear Algebra", "intermediate", ""],
    ],
    learn: ["Spanish Conversation", "Guitar — Beginner", "Figma"],
    avail: [
      [2, 840, 1080],
      [4, 840, 1080],
    ],
  },
  {
    name: "Priya Nair",
    email: "priya.nair@students.northfield.edu",
    handle: "priya-nair",
    year: "Second year",
    school: "northfield",
    bio: "CS second year. I spend too much time on side projects, so I know the tooling pain points — git conflicts, environment setup, why your React state won't update.",
    teach: [
      ["Python Basics", "advanced", "We'll write code, not watch slides."],
      ["JavaScript & React", "intermediate", ""],
      ["Git & GitHub", "advanced", "Including how to undo the thing you just did."],
      ["SQL & Databases", "intermediate", ""],
    ],
    learn: ["Korean — Beginner", "Public Speaking", "Strength Training Basics"],
    avail: [
      [0, 780, 1020],
      [2, 1080, 1260],
      [5, 900, 1140],
    ],
  },
  {
    name: "Tomás Beckett",
    email: "tomas.beckett@students.northfield.edu",
    handle: "tomas-beckett",
    year: "Graduate",
    school: "northfield",
    bio: "Chemistry PhD student. Organic chem has a reputation it mostly deserves, but mechanisms click once you stop memorising them. Bring your worst reaction.",
    teach: [
      ["Organic Chemistry", "advanced", "Mechanisms, not flashcards."],
      ["MCAT Biology", "intermediate", ""],
      ["Research Papers", "advanced", "Structure, figures and how to answer reviewers."],
    ],
    learn: ["Video Editing", "Cooking Fundamentals", "Running Form"],
    avail: [[3, 1020, 1260]],
  },
  {
    name: "Ayesha Khan",
    email: "ayesha.khan@students.northfield.edu",
    handle: "ayesha-khan",
    year: "Third year",
    school: "northfield",
    bio: "Design student. I'll review your portfolio honestly, which is more useful than being nice about it. Figma, posters, type.",
    teach: [
      ["Figma", "advanced", "Components, auto-layout, and not fighting the tool."],
      ["Poster & Print Design", "advanced", ""],
      ["Portfolio Reviews", "advanced", "Expect direct feedback."],
      ["Illustration", "intermediate", ""],
    ],
    learn: ["JavaScript & React", "Audio Recording", "Budgeting & Student Finance"],
    avail: [
      [1, 600, 780],
      [4, 960, 1200],
    ],
  },
  {
    name: "Jonas Lindqvist",
    email: "jonas.lindqvist@students.northfield.edu",
    handle: "jonas-lindqvist",
    year: "Second year",
    school: "northfield",
    bio: "I fix bikes behind the engineering building most Saturdays. Also happy to teach you to cook something that isn't pasta.",
    teach: [
      ["Bike Repair", "advanced", "Bring the bike. We'll do it together."],
      ["Cooking Fundamentals", "intermediate", ""],
      ["Sewing & Repairs", "intermediate", ""],
    ],
    learn: ["Calculus I", "Python Basics", "Music Theory"],
    avail: [[6, 540, 780]],
  },
  {
    name: "Grace Oyelaran",
    email: "grace.oyelaran@students.northfield.edu",
    handle: "grace-oyelaran",
    year: "Fourth year",
    school: "northfield",
    bio: "Econ, heading to a grad programme. I've read a lot of bad personal statements, including my own first drafts. Happy to help with applications and econometrics.",
    teach: [
      ["Econometrics", "advanced", ""],
      ["Statistics", "advanced", "R or Python, your choice."],
      ["Grad School Applications", "advanced", "Bring a draft, however rough."],
      ["Scholarship Essays", "intermediate", ""],
    ],
    learn: ["Figma", "Yoga — Beginner", "Mandarin Conversation"],
    avail: [
      [2, 960, 1200],
      [5, 780, 1020],
    ],
  },
  {
    name: "Leo Ferrante",
    email: "leo.ferrante@students.northfield.edu",
    handle: "leo-ferrante",
    year: "First year",
    school: "northfield",
    bio: "Been playing guitar since I was nine. I can get you playing actual songs in a couple of sessions instead of scales forever.",
    teach: [
      ["Guitar — Beginner", "advanced", "You'll play a song in the first session."],
      ["Music Theory", "intermediate", ""],
      ["Singing Technique", "beginner", ""],
    ],
    learn: ["Essay Structure", "Time Management", "Calculus I"],
    avail: [
      [0, 840, 1080],
      [4, 1080, 1260],
    ],
  },
  {
    name: "Hannah Weiss",
    email: "hannah.weiss@students.northfield.edu",
    handle: "hannah-weiss",
    year: "Third year",
    school: "northfield",
    bio: "Pre-law. LSAT logic games went from my worst section to my best, so I know the climb. Also happy to do mock interviews.",
    teach: [
      ["LSAT Logic Games", "advanced", "Diagramming drills that actually transfer."],
      ["Interview Practice", "intermediate", ""],
      ["Public Speaking", "intermediate", ""],
    ],
    learn: ["Organic Chemistry", "Photography Basics", "Climbing Technique"],
    avail: [[3, 600, 840]],
  },
  {
    name: "Wei Chen",
    email: "wei.chen@students.northfield.edu",
    handle: "wei-chen",
    year: "Graduate",
    school: "northfield",
    bio: "Data science MSc. I like the boring parts — cleaning data, reading error messages properly, writing SQL that doesn't scan the whole table.",
    teach: [
      ["Data Analysis with Pandas", "advanced", ""],
      ["Machine Learning Intro", "intermediate", "Enough to know when not to use it."],
      ["SQL & Databases", "advanced", ""],
      ["Mandarin Conversation", "advanced", ""],
      ["LaTeX", "intermediate", ""],
    ],
    learn: ["Public Speaking", "Swimming Technique", "Poster & Print Design"],
    avail: [
      [1, 1080, 1260],
      [4, 1080, 1260],
    ],
  },
  {
    name: "Sofia Almeida",
    email: "sofia.almeida@students.northfield.edu",
    handle: "sofia-almeida",
    year: "Second year",
    school: "northfield",
    bio: "Sport science. I coach the beginners' running group. Form first, mileage later — that's how you stay uninjured.",
    teach: [
      ["Running Form", "advanced", ""],
      ["Strength Training Basics", "advanced", "We'll start with bodyweight."],
      ["Meal Prep on a Budget", "intermediate", ""],
      ["Swimming Technique", "intermediate", ""],
    ],
    learn: ["Spanish Conversation", "Excel & Spreadsheets", "Illustration"],
    avail: [
      [1, 420, 600],
      [3, 420, 600],
      [6, 480, 720],
    ],
  },
  {
    name: "Omar Haddad",
    email: "omar.haddad@students.northfield.edu",
    handle: "omar-haddad",
    year: "Fourth year",
    school: "northfield",
    bio: "Film and media. I edit the student paper's video pieces. Premiere, DaVinci, and how to cut something so people keep watching.",
    teach: [
      ["Video Editing", "advanced", ""],
      ["Photography Basics", "intermediate", ""],
      ["Audio Recording", "intermediate", ""],
    ],
    learn: ["Git & GitHub", "Budgeting & Student Finance", "Guitar — Beginner"],
    avail: [[5, 960, 1200]],
  },
  {
    name: "Ruth Mensah",
    email: "ruth.mensah@students.northfield.edu",
    handle: "ruth-mensah",
    year: "Third year",
    school: "northfield",
    bio: "Business and accounting. Spreadsheets genuinely are interesting once they stop being scary. I also help people set up a student budget that survives week three.",
    teach: [
      ["Excel & Spreadsheets", "advanced", "Pivot tables, lookups, and clean inputs."],
      ["Budgeting & Student Finance", "advanced", ""],
      ["CV & Cover Letters", "intermediate", ""],
      ["Time Management", "intermediate", ""],
    ],
    learn: ["Data Analysis with Pandas", "Yoga — Beginner", "Korean — Beginner"],
    avail: [
      [2, 600, 840],
      [4, 600, 840],
    ],
  },
  {
    name: "Minji Park",
    email: "minji.park@example.edu",
    handle: "minji-park",
    year: "Second year",
    school: "example-state",
    bio: "Korean exchange student. I'll teach you survival Korean and the slang your app won't. In return I'd love help with academic English.",
    teach: [
      ["Korean — Beginner", "advanced", "Hangul in one session, honestly."],
      ["Piano — Beginner", "intermediate", ""],
    ],
    learn: ["Research Papers", "Citation & Referencing", "Climbing Technique"],
    avail: [[0, 600, 840]],
  },
  {
    name: "Noah Birch",
    email: "noah.birch@example.edu",
    handle: "noah-birch",
    year: "First year",
    school: "example-state",
    bio: "Climbing team. I can teach you to move on the wall without burning your arms out in ten minutes.",
    teach: [
      ["Climbing Technique", "advanced", "Indoor wall, bring shoes or rent them."],
      ["Yoga — Beginner", "beginner", ""],
    ],
    learn: ["Calculus I", "Essay Structure", "Figma"],
    avail: [[6, 720, 960]],
  },
  {
    name: "Elena Petrova",
    email: "elena.petrova@students.northfield.edu",
    handle: "elena-petrova",
    year: "First year",
    school: "northfield",
    bio: "Just joined — still setting up my profile.",
    teach: [["Driving Theory", "intermediate", ""]],
    learn: ["Calculus I", "Python Basics"],
    unverified: true,
  },
  {
    name: "Dean Okafor",
    email: "dean.okafor@northfield.edu",
    handle: "dean-okafor",
    year: "Staff",
    school: "northfield",
    bio: "Student services. I moderate SkillSwap reports for Northfield. If something goes wrong, report it and I'll read it.",
    teach: [["Time Management", "advanced", ""]],
    learn: [],
    admin: true,
  },
];

// ---------------------------------------------------------------- sessions
type SeedSession = {
  learner: string;
  teacher: string;
  skill: string;
  minutes: number;
  day: number;
  hour: number;
  status: "completed" | "accepted" | "pending" | "declined" | "cancelled";
  mode: "in_person" | "video";
  location: string;
  message: string;
  note?: string;
  reason?: string;
  ratings?: { from: string; stars: number; comment: string; tags: string }[];
};

const SESSIONS: SeedSession[] = [
  {
    learner: "maya-rodriguez",
    teacher: "daniel-osei",
    skill: "Calculus I",
    minutes: 60,
    day: -14,
    hour: 15,
    status: "completed",
    mode: "in_person",
    location: "Library, group study room 2B",
    message: "I'm lost on the chain rule and my midterm is in a week.",
    note: "Bring your problem set and we'll work through it.",
    ratings: [
      {
        from: "maya-rodriguez",
        stars: 5,
        comment: "Dan drew the whole thing out and suddenly it was obvious. Didn't make me feel stupid once.",
        tags: "patient,clear explanations",
      },
      {
        from: "daniel-osei",
        stars: 5,
        comment: "Came prepared with specific questions, which makes it so much easier.",
        tags: "well prepared,on time",
      },
    ],
  },
  {
    learner: "daniel-osei",
    teacher: "maya-rodriguez",
    skill: "Spanish Conversation",
    minutes: 60,
    day: -11,
    hour: 17,
    status: "completed",
    mode: "video",
    location: "Video call",
    message: "I've got a year abroad coming and I can read Spanish but freeze when I speak.",
    note: "We'll just talk. I'll correct the things that matter.",
    ratings: [
      {
        from: "daniel-osei",
        stars: 5,
        comment: "Forty minutes in I realised we'd only spoken Spanish. Exactly what I needed.",
        tags: "encouraging,clear explanations",
      },
      {
        from: "maya-rodriguez",
        stars: 4,
        comment: "Good session — would be even better with a topic picked in advance.",
        tags: "on time",
      },
    ],
  },
  {
    learner: "jonas-lindqvist",
    teacher: "priya-nair",
    skill: "Python Basics",
    minutes: 90,
    day: -9,
    hour: 14,
    status: "completed",
    mode: "in_person",
    location: "Computer lab, Engineering building",
    message: "I want to automate a spreadsheet for the bike co-op.",
    note: "We'll build the actual thing rather than toy examples.",
    ratings: [
      {
        from: "jonas-lindqvist",
        stars: 5,
        comment: "We finished with a working script. I've used it every week since.",
        tags: "well prepared,knew the material",
      },
    ],
  },
  {
    learner: "priya-nair",
    teacher: "minji-park",
    skill: "Korean — Beginner",
    minutes: 60,
    day: -7,
    hour: 11,
    status: "completed",
    mode: "video",
    location: "Video call",
    message: "Complete beginner. I can't read any of it yet.",
    ratings: [
      {
        from: "priya-nair",
        stars: 5,
        comment: "I could read Hangul by the end of one hour. I did not expect that.",
        tags: "clear explanations,encouraging",
      },
      {
        from: "minji-park",
        stars: 5,
        comment: "Asked great questions and practised between sessions.",
        tags: "well prepared",
      },
    ],
  },
  {
    learner: "ayesha-khan",
    teacher: "priya-nair",
    skill: "JavaScript & React",
    minutes: 60,
    day: -6,
    hour: 16,
    status: "completed",
    mode: "in_person",
    location: "Design studio, 3rd floor",
    message: "I can design components but I can't make them real.",
    ratings: [
      {
        from: "ayesha-khan",
        stars: 5,
        comment: "Patient with my very basic questions about state.",
        tags: "patient,good listener",
      },
    ],
  },
  {
    learner: "grace-oyelaran",
    teacher: "ayesha-khan",
    skill: "Figma",
    minutes: 60,
    day: -5,
    hour: 13,
    status: "completed",
    mode: "in_person",
    location: "Library, media room",
    message: "Need to make my research poster not look like a Word document.",
    ratings: [
      {
        from: "grace-oyelaran",
        stars: 5,
        comment: "Blunt in the best way. My poster is twice as readable.",
        tags: "knew the material,clear explanations",
      },
      {
        from: "ayesha-khan",
        stars: 5,
        comment: "Took the feedback well and iterated fast.",
        tags: "well prepared,on time",
      },
    ],
  },
  {
    learner: "leo-ferrante",
    teacher: "maya-rodriguez",
    skill: "Essay Structure",
    minutes: 30,
    day: -4,
    hour: 18,
    status: "completed",
    mode: "video",
    location: "Video call",
    message: "My thesis statements keep coming back marked 'too vague'.",
    ratings: [
      {
        from: "leo-ferrante",
        stars: 4,
        comment: "Half an hour was a bit short but I got a usable template out of it.",
        tags: "clear explanations",
      },
    ],
  },
  {
    learner: "omar-haddad",
    teacher: "priya-nair",
    skill: "Git & GitHub",
    minutes: 60,
    day: -3,
    hour: 15,
    status: "completed",
    mode: "in_person",
    location: "Library, group study room 4A",
    message: "I keep breaking the paper's repo and I don't understand branches.",
    ratings: [
      {
        from: "omar-haddad",
        stars: 5,
        comment: "Showed me how to undo things safely. Life-changing, genuinely.",
        tags: "patient,knew the material",
      },
      {
        from: "priya-nair",
        stars: 5,
        comment: "Good session, clear about what he needed.",
        tags: "on time,good listener",
      },
    ],
  },
  {
    learner: "sofia-almeida",
    teacher: "ruth-mensah",
    skill: "Excel & Spreadsheets",
    minutes: 60,
    day: -2,
    hour: 10,
    status: "completed",
    mode: "in_person",
    location: "Business school, study pod 7",
    message: "Tracking training data for the running group and it's a mess.",
    ratings: [
      {
        from: "sofia-almeida",
        stars: 5,
        comment: "Pivot tables finally make sense. She restructured my whole sheet.",
        tags: "well prepared,clear explanations",
      },
    ],
  },
  {
    learner: "hannah-weiss",
    teacher: "tomas-beckett",
    skill: "Organic Chemistry",
    minutes: 90,
    day: 2,
    hour: 16,
    status: "accepted",
    mode: "in_person",
    location: "Chemistry building, room 214",
    message: "Mechanisms. All of them. I have a resit in three weeks.",
    note: "Bring the past papers. We'll do mechanisms by hand.",
  },
  {
    learner: "ruth-mensah",
    teacher: "wei-chen",
    skill: "Data Analysis with Pandas",
    minutes: 60,
    day: 3,
    hour: 18,
    status: "accepted",
    mode: "video",
    location: "Video call",
    message: "I can do this in Excel but I need to learn it properly in Python.",
    note: "Send me your dataset beforehand and we'll use that.",
  },
  {
    learner: "noah-birch",
    teacher: "daniel-osei",
    skill: "Calculus I",
    minutes: 60,
    day: 4,
    hour: 14,
    status: "accepted",
    mode: "video",
    location: "Video call",
    message: "First year, falling behind on limits.",
    note: "No problem, we'll start from the beginning.",
  },
  {
    learner: "wei-chen",
    teacher: "hannah-weiss",
    skill: "Public Speaking",
    minutes: 60,
    day: 5,
    hour: 11,
    status: "pending",
    mode: "in_person",
    location: "Library, presentation room 1",
    message: "I have a conference talk in a month and I'm dreading it.",
  },
  {
    learner: "tomas-beckett",
    teacher: "omar-haddad",
    skill: "Video Editing",
    minutes: 90,
    day: 6,
    hour: 15,
    status: "pending",
    mode: "in_person",
    location: "Media lab, basement",
    message: "Making a short explainer for my research group.",
  },
  {
    learner: "leo-ferrante",
    teacher: "ruth-mensah",
    skill: "Time Management",
    minutes: 30,
    day: 7,
    hour: 12,
    status: "pending",
    mode: "video",
    location: "Video call",
    message: "First year and already behind on everything.",
  },
  {
    learner: "grace-oyelaran",
    teacher: "sofia-almeida",
    skill: "Yoga — Beginner",
    minutes: 60,
    day: -1,
    hour: 8,
    status: "declined",
    mode: "in_person",
    location: "Sports hall, studio 2",
    message: "Never done it. Hoping for something gentle.",
    reason: "Sorry — I'm away at a meet that weekend. Try me the week after?",
  },
  {
    learner: "ayesha-khan",
    teacher: "ruth-mensah",
    skill: "Budgeting & Student Finance",
    minutes: 60,
    day: -1,
    hour: 14,
    status: "cancelled",
    mode: "in_person",
    location: "Business school, study pod 3",
    message: "Need to work out whether I can afford next semester's materials.",
    reason: "Got called into a shift, really sorry. Rebooking.",
  },
];

// ------------------------------------------------------------------- run
console.info("Seeding SkillSwap…");
wipe();

const now = new Date().toISOString();

const schoolIds = new Map<string, string>();
const insertSchool = db.prepare(
  `INSERT INTO schools (id, name, slug, email_domains, city, region, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);
for (const school of SCHOOLS) {
  const id = newId();
  schoolIds.set(school.slug, id);
  insertSchool.run(
    id,
    school.name,
    school.slug,
    school.email_domains,
    school.city,
    school.region,
    now
  );
}

// The catalogue is already in place (src/lib/taxonomy.sql, applied on
// connect). The seed only needs to look skills up by name.
const skillIds = new Map<string, string>(
  (db.prepare(`SELECT id, name FROM skills`).all() as { id: string; name: string }[]).map(
    (row) => [row.name, row.id]
  )
);
if (skillIds.size === 0) {
  throw new Error("No skills found — src/lib/taxonomy.sql did not load.");
}

const passwordHash = hashPassword(DEMO_PASSWORD);
const userIds = new Map<string, string>();

const insertUser = db.prepare(
  `INSERT INTO users
     (id, handle, name, email, email_domain, password_hash, school_id, year, bio,
      avatar_emoji, verification_status, verified_at, is_admin, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);
const insertUserSkill = db.prepare(
  `INSERT INTO user_skills (id, user_id, skill_id, kind, level, note, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);
const insertAvailability = db.prepare(
  `INSERT INTO availability (id, user_id, weekday, start_minute, end_minute) VALUES (?, ?, ?, ?, ?)`
);

PEOPLE.forEach((person, index) => {
  const id = newId();
  userIds.set(person.handle, id);
  const verified = !person.unverified;
  const createdAt = iso(-60 + index * 2, 12);

  insertUser.run(
    id,
    person.handle,
    person.name,
    person.email,
    person.email.split("@")[1],
    passwordHash,
    schoolIds.get(person.school) ?? null,
    person.year,
    person.bio,
    person.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    verified ? "verified" : "unverified",
    verified ? createdAt : null,
    person.admin ? 1 : 0,
    createdAt,
    createdAt
  );

  for (const [skill, level, note] of person.teach) {
    const skillId = skillIds.get(skill);
    if (!skillId) throw new Error(`Unknown skill in seed: ${skill}`);
    insertUserSkill.run(newId(), id, skillId, "teach", level, note, createdAt);
  }
  for (const skill of person.learn) {
    const skillId = skillIds.get(skill);
    if (!skillId) throw new Error(`Unknown skill in seed: ${skill}`);
    insertUserSkill.run(newId(), id, skillId, "learn", "beginner", "", createdAt);
  }
  for (const [weekday, start, end] of person.avail ?? []) {
    insertAvailability.run(newId(), id, weekday, start, end);
  }

  if (verified) {
    transact((tx) =>
      postEntry(tx, {
        userId: id,
        delta: 2,
        reason: "signup_bonus",
        note: "Welcome to SkillSwap — your first hour is on the community.",
      })
    );
  }
});

// Sessions, with a ledger that obeys the real rules: hold at request time,
// release on decline/cancel, pay the teacher on completion.
const insertSession = db.prepare(
  `INSERT INTO sessions
     (id, learner_id, teacher_id, skill_id, status, duration_minutes, credits,
      scheduled_at, mode, location, learner_message, teacher_note,
      learner_confirmed_at, teacher_confirmed_at, completed_at, cancel_reason,
      created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);
const insertRating = db.prepare(
  `INSERT INTO ratings (id, session_id, rater_id, ratee_id, stars, comment, tags, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
);

/** Keeps the seed valid without letting a balance go negative. */
function ensureBalance(userId: string, needed: number): void {
  const balance = balanceOf(userId);
  if (balance >= needed) return;
  transact((tx) =>
    postEntry(tx, {
      userId,
      delta: needed - balance,
      reason: "community_grant",
      note: "Founding member grant (seed data)",
    })
  );
}

for (const seed of SESSIONS) {
  const learnerId = userIds.get(seed.learner);
  const teacherId = userIds.get(seed.teacher);
  const skillId = skillIds.get(seed.skill);
  if (!learnerId || !teacherId || !skillId) {
    throw new Error(`Bad session seed: ${seed.learner} → ${seed.teacher} (${seed.skill})`);
  }

  const credits = creditsForMinutes(seed.minutes);
  const scheduledAt = iso(seed.day, seed.hour);
  // A request is always created before it is scheduled, and never in the future.
  const createdAt = iso(Math.min(seed.day - 3, -1), 9);
  const sessionId = newId();
  const done = seed.status === "completed";

  insertSession.run(
    sessionId,
    learnerId,
    teacherId,
    skillId,
    seed.status,
    seed.minutes,
    credits,
    scheduledAt,
    seed.mode,
    seed.location,
    seed.message,
    seed.note ?? "",
    done ? scheduledAt : null,
    done ? scheduledAt : null,
    done ? scheduledAt : null,
    seed.reason ?? "",
    createdAt,
    done ? scheduledAt : createdAt
  );

  ensureBalance(learnerId, credits);
  transact((tx) =>
    postEntry(tx, {
      userId: learnerId,
      delta: -credits,
      reason: "session_hold",
      sessionId,
      note: "Held while your request is pending",
    })
  );

  if (done) {
    transact((tx) =>
      postEntry(tx, {
        userId: teacherId,
        delta: credits,
        reason: "session_earned",
        sessionId,
        note: `Taught ${seed.skill}`,
      })
    );
    for (const rating of seed.ratings ?? []) {
      const raterId = userIds.get(rating.from);
      if (!raterId) throw new Error(`Unknown rater: ${rating.from}`);
      insertRating.run(
        newId(),
        sessionId,
        raterId,
        raterId === learnerId ? teacherId : learnerId,
        rating.stars,
        rating.comment,
        rating.tags,
        scheduledAt
      );
    }
  } else if (seed.status === "declined" || seed.status === "cancelled") {
    transact((tx) =>
      postEntry(tx, {
        userId: learnerId,
        delta: credits,
        reason: "hold_released",
        sessionId,
        note:
          seed.status === "declined"
            ? "Request declined — credits returned"
            : "Session cancelled — credits returned",
      })
    );
  }
}

// One open report so the moderation queue isn't empty in a demo.
db.prepare(
  `INSERT INTO reports (id, reporter_id, reported_user_id, session_id, category, details, status, created_at)
   VALUES (?, ?, ?, NULL, 'no_show', ?, 'open', ?)`
).run(
  newId(),
  userIds.get("grace-oyelaran")!,
  userIds.get("elena-petrova")!,
  "We agreed a time in the library and they didn't turn up or message. First time it's happened to me, so I'm not looking for anything drastic — just flagging it.",
  iso(-1, 19)
);

// A couple of notifications so the dashboard has something to show.
const insertNotification = db.prepare(
  `INSERT INTO notifications (id, user_id, kind, title, body, href, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);
insertNotification.run(
  newId(),
  userIds.get("hannah-weiss")!,
  "session_accepted",
  "Tomás Beckett accepted your session",
  "Organic Chemistry · Chemistry building, room 214",
  "/dashboard/sessions",
  iso(-1, 10)
);
insertNotification.run(
  newId(),
  userIds.get("priya-nair")!,
  "credits_earned",
  "+2 credits for teaching Git & GitHub",
  "Both of you confirmed the session.",
  "/dashboard/wallet",
  iso(-3, 16)
);

// ------------------------------------------------------------------ report
const count = (table: string): number =>
  (db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;

console.info(`
Seeded:
  schools            ${count("schools")}
  skill categories   ${count("skill_categories")}
  skills             ${count("skills")}
  students           ${count("users")}
  skill listings     ${count("user_skills")}
  sessions           ${count("sessions")}
  ratings            ${count("ratings")}
  ledger entries     ${count("credit_ledger")}
  open reports       ${count("reports")}

Log in as any student with the password: ${DEMO_PASSWORD}
  learner + teacher   maya.rodriguez@students.northfield.edu
  busiest teacher     priya.nair@students.northfield.edu
  moderator (admin)   dean.okafor@northfield.edu
`);

const total = db.prepare(`SELECT COALESCE(SUM(delta), 0) AS n FROM credit_ledger`).get() as {
  n: number;
};
const negative = db
  .prepare(
    `SELECT COUNT(*) AS n FROM (
       SELECT user_id, SUM(delta) AS balance FROM credit_ledger GROUP BY user_id
     ) WHERE balance < 0`
  )
  .get() as { n: number };

console.info(`Ledger check: ${total.n} credits in circulation, ${negative.n} negative balances.`);
if (negative.n > 0) {
  console.error("Seed produced a negative balance — that's a bug in the seed, not the app.");
  process.exit(1);
}
