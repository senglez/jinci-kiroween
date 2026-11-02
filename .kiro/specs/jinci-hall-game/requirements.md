# Requirements: 夜穿千年 · Jinci Hall of the Holy Mother

## Introduction

A browser game for Kiroween 2026 about the Hall of the Holy Mother (圣母殿) at Jinci, Taiyuan, Shanxi, a Northern Song timber hall first built in 1023–1032 and rebuilt in 1102. The player travels back in time in first person, arrives at today's hall, watches a "ghost wind" scatter it, and rebuilds it part by part in true structural order. The tone is Halloween night (moon, bats, ghost fire, jack-o'-lanterns) while staying respectful of a heritage site and its worship context.

## Glossary

- **Milestone**: a dated stop in the time tunnel with bilingual text and an optional photo.
- **Piece**: one of 9 structural parts of the hall (platform, walls, dragon columns, lower brackets, lower roof, upper brackets, plaque, upper roof, ridge).
- **Ghost outline**: the dashed outline showing where a piece belongs.
- **Supports**: the pieces listed in a piece's `needs`; they must be placed first.
- **Tray**: the grid of cells under the hall that holds unplaced pieces.

## Requirements

### Requirement 1: Title screen

**User Story:** As a player, I want a clear starting point, so that I know what the game is and can begin when ready.

#### Acceptance Criteria

1. WHEN the page loads THEN the game SHALL show the title, subtitle, and a start button over an animated night sky with moon, stars, fog, and bats. The moon SHALL be drawn in the game's flat illustration style, with soft maria placed after the real near side, including Mare Tranquillitatis (静海). *(A real photo was tried and dropped after review: it looked out of place in the illustrated scene.)*
2. WHEN the player presses the start button THEN the game SHALL start audio from that user gesture and begin the time travel.
3. The game SHALL NOT play any sound before the player's first gesture.

### Requirement 2: First-person time travel

**User Story:** As a player, I want to fly back through the hall's history, so that I understand what the building has lived through before I rebuild it.

#### Acceptance Criteria

1. WHEN time travel starts THEN the game SHALL show a full-screen first-person tunnel with stars and rings rushing toward the viewer.
2. The game SHALL visit milestones in strictly descending year order from 2026 to 1023.
3. WHEN moving between milestones THEN the year counter SHALL roll from the previous year to the next, and the tunnel SHALL speed up and shift from violet toward amber as the year gets older.
4. WHEN a milestone is reached THEN the game SHALL show a card with its era, event text, a photo, and the photo's caption and credit. Every milestone SHALL have a freely licensed photo; where no photo of the event itself is free to use, the caption SHALL say what is shown instead (for example, today's view or a nearby year).
5. WHEN the player clicks a card THEN the game SHALL move on to the next milestone.
6. WHEN the player presses Skip THEN the game SHALL end the time travel and go straight to the arrival.
7. WHEN the last milestone is done THEN the game SHALL accelerate, flash to white, and stop the tunnel.

### Requirement 3: Arrival and scatter

**User Story:** As a player, I want to see the real hall before I play, so that the puzzle connects to a real place.

#### Acceptance Criteria

1. WHEN time travel ends THEN the game SHALL fade in a credited photo of the hall's front, slowly zooming in, with the line "千年之后，它依然在这里。".
2. AFTER the photo has been shown THEN the game SHALL darken it into night and play a wind sound.
3. WHEN the puzzle scene opens THEN the game SHALL first show the fully assembled hall, then blow every piece into a random tray cell with a lift-then-fly animation. The random layout SHALL follow Requirement 9 of the `gesture-bonus-level` spec (uniform shuffle, different from the previous scatter, random tilt and offset).
4. The game SHALL NOT accept input on pieces until the scatter animation has finished.

### Requirement 4: Rebuilding the hall

**User Story:** As a player, I want to rebuild the hall the way it was really built, so that I learn how a Song-dynasty timber hall stands up.

#### Acceptance Criteria

1. WHEN the player drags a piece THEN the piece SHALL follow the pointer at full size and its ghost outline SHALL glow.
2. WHEN a piece is dropped within 90 stage units of its own position AND all its supports are placed THEN the game SHALL snap it into place, play a knock and bell, burst sparks, and show its fact card.
3. WHEN a piece is dropped at its own position BUT one or more supports are missing THEN the game SHALL return it to the tray, shake it, and name every missing support in the message.
4. WHEN a piece is dropped on another unplaced piece's position THEN the game SHALL return it to the tray and say that is not where it goes.
5. WHEN a piece is dropped anywhere else THEN the game SHALL return it to the tray without counting an attempt.
6. WHEN the player presses the hint button THEN the game SHALL highlight one unplaced piece whose supports are all placed, and its ghost outline.
7. The HUD SHALL show placed count out of 9 and elapsed time.
8. The support rules SHALL form an acyclic graph with at least one piece that needs nothing.

### Requirement 5: Success

**User Story:** As a player, I want a satisfying ending, so that finishing feels like an achievement.

#### Acceptance Criteria

1. WHEN the 9th piece is placed THEN the game SHALL light the jack-o'-lanterns under the eaves, play a pentatonic fanfare, and launch fireworks.
2. AFTER the celebration starts THEN the game SHALL show a success dialog titled "功德圆满 · 圣母殿重现！" with elapsed time, attempt count, and a gallery of real photos.
3. WHEN the player chooses to travel again THEN the game SHALL restart from the time travel.

### Requirement 6: Language

**User Story:** As a Chinese or English speaker, I want the game in my language, so that I can follow the history.

#### Acceptance Criteria

1. The game SHALL default to English, unless the player chose Chinese before (remembered in `localStorage`). *(Changed after submission: most judges and players read English.)*
2. WHEN the URL has `?lang=zh` or `?lang=en`, OR the player presses the language button THEN the game SHALL show all text in that language, including a card already on screen; the page title SHALL follow the language.
3. Every milestone, piece, and UI string SHALL have non-empty Chinese and English text.

### Requirement 7: Input, devices, and accessibility

**User Story:** As a player on any device, I want the game to work with my input method, so that I can finish it.

#### Acceptance Criteria

1. The puzzle SHALL work with mouse and touch through pointer events.
2. WHEN a piece has keyboard focus AND the player presses Enter or Space THEN the game SHALL try to place it under the same support rules.
3. WHEN the viewport is portrait (height > 1.2 × width) THEN the tray SHALL use 2 columns of taller cells; WHEN the orientation changes THEN loose pieces SHALL move into the new layout.
4. WHEN the user prefers reduced motion THEN the game SHALL shorten or stop decorative animation.
5. The player SHALL be able to mute sound.

### Requirement 8: Accuracy and licensing

**User Story:** As a judge or visitor, I want to trust the history and the images, so that the game is fair to its sources.

#### Acceptance Criteria

1. Every historical claim in the game SHALL have a source in `research/SOURCES.md`; where sources disagree, the game SHALL use the mainstream date and the alternative SHALL be recorded.
2. The game SHALL only bundle images that are public domain or CC-licensed.
3. Every image the game shows SHALL have an entry with author, licence, and source link in the in-game credits.
4. All sound SHALL be synthesized in the browser; the project SHALL NOT include music files.

### Requirement 9: Timeline navigation

**User Story:** As a player, I want to jump back and forth between the eras, both during the time travel and afterwards, so that I can revisit a moment without starting over. *(Added after player feedback on the live game.)*

#### Acceptance Criteria

1. WHILE the time travel is running THE game SHALL show a timeline with one marker per milestone, in travel order (2026 first), each labelled with its year; the current milestone SHALL be highlighted and visited milestones marked.
2. WHEN the player picks a marker THEN the game SHALL fly to that milestone: the year counter rolls to its year and the tunnel speeds up, flowing backwards when moving towards the present. The flight SHALL take about 1 second, regardless of distance.
3. WHEN the player picks a marker or presses ← / → during the time travel THEN automatic advancing SHALL pause, and a "继续" button SHALL appear that resumes automatic advancing from the current milestone. Clicking the card SHALL still move on to the next milestone (Requirement 2.5) without changing whether advancing is automatic or paused.
4. WHEN the player picks a marker or presses a key while a flight is still running THEN the game SHALL go to the newest target; earlier flights SHALL stop and not show their cards.
5. WHEN the player continues from the last milestone, or automatic advancing finishes it THEN the game SHALL end the time travel as before. "跳过" SHALL still end it at any time.
6. The game SHALL show a "时间线" button in the top controls on every screen except during the time travel and the hidden level. WHEN pressed THEN a timeline viewer SHALL open on the most recently shown milestone (or 2026) showing the same card content, with the same markers, previous / next buttons, ← / → keys, Escape and backdrop to close, and focus returned to the button on close.
7. Paging in the viewer SHALL stop at the first and last milestone (no wrap-around), with the unavailable button disabled.
8. All new text SHALL have Chinese and English versions, and every control SHALL have an accessible label.

