# THE BUTTON — Implementation Specification v2.0

## Product definition

The Button is an English-language anonymous ethical dilemma game for students aged 13–18. Each round presents ten value conflicts. Every dilemma offers a meaningful benefit and a serious trade-off, with no correct answer. The product should be understandable within three seconds, calm before a choice, tense during it and satisfying after results appear.

## Release contract

The first production release must provide:

1. A public, responsive website requiring no installation or player account.
2. Ten distinct, category-varied questions per round.
3. A tactile red 3D button and an equally usable Walk Away control.
4. Results hidden until voting, then real PRESS/WALK AWAY percentages, total real votes, majority position and controversy score.
5. A final round summary with buttons pressed, minority choices, most divisive topic, average agreement and a clearly non-scientific choice reflection.
6. A Supabase database designed for 5,000+ questions and many thousands of votes.
7. Persistent anonymous browser IDs and database-enforced duplicate-vote protection.
8. An authenticated admin dashboard for question lifecycle and quality analysis.
9. A 100–200 question launch bank; this implementation begins with 100 reviewed questions.
10. PWA metadata, accessible interaction, error states and reduced-motion support.

## Truthful data states

The app has exactly two visible data states:

- **LIVE · REAL RESULTS:** Supabase is configured and every displayed total is calculated from non-test votes.
- **DEMO MODE · LOCAL RESULTS:** Supabase is unavailable or unconfigured. Results are stored only on the device and are never described as school-player or real results.

Test votes use `is_test = true` and are excluded from public totals. A production question with `optional_test_mode = true` is not returned to normal players.

## Player flow

1. **Landing:** product name, one-sentence premise, large red Start button and short privacy statement.
2. **Question:** category, position in round, progress, white dilemma card and two neutral controls.
3. **Decision:** controls lock immediately; the selected physical control confirms.
4. **Reveal:** choice, both percentages, split bar, real total, majority/minority position and controversy score animate into view in 0.8–1.4 seconds.
5. **Advance:** the player chooses Next Question; the app never auto-advances.
6. **Summary:** the app calculates round statistics locally from the ten revealed real results and offers Play Again or an identity-free text copy.

## Question model and quality gate

Every question contains:

```text
id, benefit_text, consequence_text, category, active, version,
real_votes_enabled, optional_test_mode, press_value, walk_value,
created_at, updated_at
```

Editorial acceptance checks:

- The benefit matters and the consequence threatens a different legitimate value.
- Neither option is framed as good, evil, correct or foolish.
- A student can understand the trade-off without specialist knowledge.
- The wording does not target real classmates or protected groups.
- It avoids explicit sexual material, graphic violence, self-harm and humiliation.
- Benefit and consequence stay under 240 characters each.
- After sufficient real votes, aim for 40/60–60/40. Revise one-sided wording rather than inventing votes.

Controversy score:

```text
100 - 2 × absolute(PRESS percentage - 50)
```

Player labels: 90–100 Extremely Divisive; 80–89 Highly Divisive; 70–79 Divisive; 50–69 One-Sided; below 50 Very One-Sided.

Admin labels: 90–100 Excellent; 80–89 Strong; 70–79 Usable; 50–69 Needs Revision; below 50 Too One-Sided. The dashboard must show vote count beside the score so tiny samples are not overinterpreted.

## Data and security architecture

`questions` stores published content and lifecycle state. `votes` stores anonymous user ID, question ID, enum choice, test flag and timestamp. A unique constraint on `(anonymous_user_id, question_id)` is the final duplicate-vote guard. Index question, anonymous user and timestamp fields.

Normal browsers receive only the public Supabase anon key. Row Level Security blocks direct public table access. Security-definer RPCs expose two narrow actions:

- `get_game_questions(10)` returns active, real-vote questions with category variety.
- `submit_vote(user, question, choice)` validates input, inserts once, returns the earlier choice after a duplicate, and aggregates non-test results.

Admins sign in through Supabase Auth. Membership in `admin_users` controls question and vote access. Knowing `/admin/` is insufficient. Never ship the Supabase service-role key.

## Visual and interaction system

- Deep blue gradient base (`#071C4A`, `#0B4DDB`, `#1478FF`) with restrained glow and faint grid.
- White elevated cards with 24–30px radii and wide soft shadows.
- Red is reserved for the physical button and PRESS result (`#F02B36`, `#FF4550`, `#A91320`).
- Inter or a metrically similar sans-serif; body text at least 16px where space allows, regular controls at least 14px, compact metadata never below 10px.
- Mobile support begins at 360px, with large tap targets, no horizontal page scrolling and a focused single-column result layout.
- Semantic buttons, keyboard focus, screen-reader labels, text alternatives to colour, and `prefers-reduced-motion` are required.

## Failure behaviour

- Question loading: “We couldn't load the next dilemma.” + Try Again.
- Vote submission: “Your choice couldn't be submitted.” + Try Again.
- Never show raw database errors to players; log useful technical details to the development console.
- Do not manufacture long loading sequences.

## Acceptance test

A release passes when a new browser can start without an account, receive a stable anonymous ID, play ten non-repeating questions on a 360px phone and a desktop, vote once per question, see results only after voting, revisit a question without creating a second vote, finish the summary, and use keyboard navigation. Live mode must show database totals only. Demo mode must remain visibly labelled. An unapproved user must not read or edit admin data. The project must build as static assets and be deployable through a normal HTTPS URL.
