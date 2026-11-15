-- ---------------------------------------------------------------------------
-- SkillSwap skill taxonomy.
--
-- Executed on every connection, after schema.sql. Every statement is
-- INSERT OR IGNORE and ids are slugs, so it is safe to run repeatedly and
-- a fresh deployment comes up with a usable catalogue instead of nothing.
--
-- Add a skill by adding a row. Removing one is a migration, not an edit:
-- user_skills references it.
-- ---------------------------------------------------------------------------

INSERT OR IGNORE INTO skill_categories (id, name, slug, blurb, icon, sort_order)
VALUES ('academics-stem', 'Academics & STEM', 'academics-stem', 'Course content, problem sets and the subjects people get stuck on.', '🧪', 0);
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('biology-genetics', 'Biology — Genetics', 'biology-genetics', 'academics-stem', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('calculus-i', 'Calculus I', 'calculus-i', 'academics-stem', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('calculus-ii', 'Calculus II', 'calculus-ii', 'academics-stem', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('econometrics', 'Econometrics', 'econometrics', 'academics-stem', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('linear-algebra', 'Linear Algebra', 'linear-algebra', 'academics-stem', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('organic-chemistry', 'Organic Chemistry', 'organic-chemistry', 'academics-stem', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('physics-mechanics', 'Physics — Mechanics', 'physics-mechanics', 'academics-stem', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('statistics', 'Statistics', 'statistics', 'academics-stem', '2026-01-01T00:00:00.000Z');

INSERT OR IGNORE INTO skill_categories (id, name, slug, blurb, icon, sort_order)
VALUES ('writing-languages', 'Writing & Languages', 'writing-languages', 'Essays, citations, and conversation practice in another language.', '✍️', 1);
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('citation-referencing', 'Citation & Referencing', 'citation-referencing', 'writing-languages', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('creative-writing', 'Creative Writing', 'creative-writing', 'writing-languages', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('essay-structure', 'Essay Structure', 'essay-structure', 'writing-languages', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('korean-beginner', 'Korean — Beginner', 'korean-beginner', 'writing-languages', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('mandarin-conversation', 'Mandarin Conversation', 'mandarin-conversation', 'writing-languages', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('public-speaking', 'Public Speaking', 'public-speaking', 'writing-languages', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('research-papers', 'Research Papers', 'research-papers', 'writing-languages', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('spanish-conversation', 'Spanish Conversation', 'spanish-conversation', 'writing-languages', '2026-01-01T00:00:00.000Z');

INSERT OR IGNORE INTO skill_categories (id, name, slug, blurb, icon, sort_order)
VALUES ('code-tech', 'Code & Tech', 'code-tech', 'Programming, data and the tools that break the night before a deadline.', '💻', 2);
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('data-analysis-with-pandas', 'Data Analysis with Pandas', 'data-analysis-with-pandas', 'code-tech', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('excel-spreadsheets', 'Excel & Spreadsheets', 'excel-spreadsheets', 'code-tech', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('git-github', 'Git & GitHub', 'git-github', 'code-tech', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('javascript-react', 'JavaScript & React', 'javascript-react', 'code-tech', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('latex', 'LaTeX', 'latex', 'code-tech', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('machine-learning-intro', 'Machine Learning Intro', 'machine-learning-intro', 'code-tech', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('python-basics', 'Python Basics', 'python-basics', 'code-tech', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('sql-databases', 'SQL & Databases', 'sql-databases', 'code-tech', '2026-01-01T00:00:00.000Z');

INSERT OR IGNORE INTO skill_categories (id, name, slug, blurb, icon, sort_order)
VALUES ('design-visual', 'Design & Visual', 'design-visual', 'Making things look like someone meant them.', '🎨', 3);
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('figma', 'Figma', 'figma', 'design-visual', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('illustration', 'Illustration', 'illustration', 'design-visual', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('photography-basics', 'Photography Basics', 'photography-basics', 'design-visual', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('portfolio-reviews', 'Portfolio Reviews', 'portfolio-reviews', 'design-visual', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('poster-print-design', 'Poster & Print Design', 'poster-print-design', 'design-visual', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('video-editing', 'Video Editing', 'video-editing', 'design-visual', '2026-01-01T00:00:00.000Z');

INSERT OR IGNORE INTO skill_categories (id, name, slug, blurb, icon, sort_order)
VALUES ('music-audio', 'Music & Audio', 'music-audio', 'Instruments, theory and recording.', '🎧', 4);
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('audio-recording', 'Audio Recording', 'audio-recording', 'music-audio', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('djing', 'DJing', 'djing', 'music-audio', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('guitar-beginner', 'Guitar — Beginner', 'guitar-beginner', 'music-audio', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('music-theory', 'Music Theory', 'music-theory', 'music-audio', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('piano-beginner', 'Piano — Beginner', 'piano-beginner', 'music-audio', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('singing-technique', 'Singing Technique', 'singing-technique', 'music-audio', '2026-01-01T00:00:00.000Z');

INSERT OR IGNORE INTO skill_categories (id, name, slug, blurb, icon, sort_order)
VALUES ('exams-applications', 'Exams & Applications', 'exams-applications', 'Standardised tests, grad school and the forms nobody explains.', '🎯', 5);
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('gre-quantitative', 'GRE Quantitative', 'gre-quantitative', 'exams-applications', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('grad-school-applications', 'Grad School Applications', 'grad-school-applications', 'exams-applications', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('interview-practice', 'Interview Practice', 'interview-practice', 'exams-applications', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('lsat-logic-games', 'LSAT Logic Games', 'lsat-logic-games', 'exams-applications', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('mcat-biology', 'MCAT Biology', 'mcat-biology', 'exams-applications', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('scholarship-essays', 'Scholarship Essays', 'scholarship-essays', 'exams-applications', '2026-01-01T00:00:00.000Z');

INSERT OR IGNORE INTO skill_categories (id, name, slug, blurb, icon, sort_order)
VALUES ('health-movement', 'Health & Movement', 'health-movement', 'Training, nutrition basics and sports taught by people who do them.', '🏃', 6);
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('climbing-technique', 'Climbing Technique', 'climbing-technique', 'health-movement', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('meal-prep-on-a-budget', 'Meal Prep on a Budget', 'meal-prep-on-a-budget', 'health-movement', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('running-form', 'Running Form', 'running-form', 'health-movement', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('strength-training-basics', 'Strength Training Basics', 'strength-training-basics', 'health-movement', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('swimming-technique', 'Swimming Technique', 'swimming-technique', 'health-movement', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('yoga-beginner', 'Yoga — Beginner', 'yoga-beginner', 'health-movement', '2026-01-01T00:00:00.000Z');

INSERT OR IGNORE INTO skill_categories (id, name, slug, blurb, icon, sort_order)
VALUES ('life-practical', 'Life & Practical', 'life-practical', 'The useful, unglamorous things that make a semester easier.', '🔧', 7);
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('bike-repair', 'Bike Repair', 'bike-repair', 'life-practical', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('budgeting-student-finance', 'Budgeting & Student Finance', 'budgeting-student-finance', 'life-practical', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('cv-cover-letters', 'CV & Cover Letters', 'cv-cover-letters', 'life-practical', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('cooking-fundamentals', 'Cooking Fundamentals', 'cooking-fundamentals', 'life-practical', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('driving-theory', 'Driving Theory', 'driving-theory', 'life-practical', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('sewing-repairs', 'Sewing & Repairs', 'sewing-repairs', 'life-practical', '2026-01-01T00:00:00.000Z');
INSERT OR IGNORE INTO skills (id, name, slug, category_id, created_at) VALUES ('time-management', 'Time Management', 'time-management', 'life-practical', '2026-01-01T00:00:00.000Z');
