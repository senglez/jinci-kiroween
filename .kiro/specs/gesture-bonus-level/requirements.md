# Requirements: Hidden Level 鬼手营造 (Ghost-Hand Builder)

## Introduction

A hidden bonus level for the Jinci game. A player who rebuilds the Hall of the Holy Mother within 2 minutes on their first try in this browser unlocks it. Each browser gets exactly one chance. In the bonus level the player rebuilds the hall again, but this time without mouse or touch: the computer's webcam tracks one hand, pinching thumb and index finger together grabs a piece, and opening the pinch drops it. The building rules, pieces, and fact cards are the same as in the main puzzle (spec `jinci-hall-game`, Requirement 4).

The level must protect the player's privacy: video is processed only in the browser and never leaves the device.

## Glossary

- **First completion**: the first time the main puzzle is ever finished in this browser. It is remembered in `localStorage`, so reloading the page, replaying, or opening a new tab does not give another chance.
- **Completion time**: the game timer value at the moment the 9th piece is placed, measured from when the pieces finish scattering (same value the success dialog shows).
- **Unlock threshold**: 120 seconds.
- **Ghost hand**: the on-screen cursor that follows the player's tracked hand.
- **Grab gesture**: a pinch, thumb tip and index fingertip brought together.
- **Release gesture**: ending the pinch, thumb tip and index fingertip moved apart.
- **Pinch point**: the midpoint between the thumb tip and the index fingertip; the cursor follows this point.
- **Hand tracker**: the in-browser hand-landmark model that reads webcam frames.

## Requirements

### Requirement 1: Unlocking the hidden level

**User Story:** As a fast player, I want a secret reward for finishing quickly, so that replaying feels worth it.

#### Acceptance Criteria

1. WHEN the player finishes the first completion AND the completion time is under 120 seconds THEN the success dialog SHALL reveal a hidden-level entrance with a spooky reveal effect and the text "隐藏关卡已解锁：鬼手营造".
2. WHEN the first completion takes 120 seconds or longer THEN the success dialog SHALL NOT show the entrance, and SHALL NOT hint that a hidden level exists.
3. WHEN any completion after the first is under 120 seconds THEN the hidden level SHALL stay locked, even after a page reload.
4. WHEN the level is unlocked THEN it SHALL stay unlocked in this browser across reloads, and the title screen SHALL show a hidden-level entrance as well as the success dialog.
5. The game SHALL record the first completion and the unlock result in `localStorage` as soon as the 9th piece is placed.
6. IF `localStorage` cannot be read or written (for example, a private window that blocks storage) THEN the game SHALL apply the same rule for the current page load only.
7. The unlock rule SHALL be implemented as a pure function of (stored progress, completion time) that returns the new stored progress, so it can be tested on its own.

### Requirement 2: Camera permission and privacy

**User Story:** As a player, I want to know what the camera is used for and stay in control, so that I can trust the game.

#### Acceptance Criteria

1. WHEN the player chooses the hidden level THEN the game SHALL first show an explanation screen that says the camera is used only to track one hand, video stays on this device, and nothing is recorded or uploaded; and SHALL offer "开启摄像头" and "返回" buttons.
2. The game SHALL NOT request camera access until the player presses "开启摄像头".
3. The game SHALL NOT send video frames, images, or hand data over the network, and SHALL NOT store them.
4. WHILE the camera is on THE game SHALL show a small mirrored live preview with a visible camera indicator, so the player always knows it is active.
5. WHEN the player leaves the hidden level, finishes it, or closes or hides the page THEN the game SHALL stop every camera track.

### Requirement 3: Hand tracking start-up and failure handling

**User Story:** As a player whose device or browser may not cooperate, I want a clear message and a way out, so that I am never stuck.

#### Acceptance Criteria

1. WHILE the hand tracker is loading THE game SHALL show a loading message.
2. IF the browser has no camera API, no camera is found, the camera is in use by another app, or the player denies permission THEN the game SHALL explain the cause in plain words and offer only "返回".
3. IF the hand tracker fails to load (for example, the browser lacks WebAssembly SIMD) THEN the game SHALL explain this and offer only "返回".
4. The bonus level SHALL NOT accept mouse, touch, or keyboard input for moving pieces. (Buttons such as "退出" and the hint stay clickable.)

### Requirement 4: Gesture tutorial

**User Story:** As a first-time gesture player, I want to practise the gestures, so that I can play without frustration.

#### Acceptance Criteria

1. WHEN tracking starts THEN the game SHALL show a short tutorial: show your hand, pinch thumb and index finger to grab, open them to drop.
2. The tutorial SHALL confirm each step when the player performs it (hand seen, pinch seen, release seen), then start the level.
3. The tutorial SHALL offer a "跳过" button.

### Requirement 5: Ghost-hand cursor

**User Story:** As a gesture player, I want to see where my hand points, so that I can aim at pieces.

#### Acceptance Criteria

1. WHILE a hand is tracked THE game SHALL show a glowing ghost-hand cursor on the puzzle stage at the pinch point, mirrored so that moving the hand right moves the cursor right.
2. The cursor SHALL be smoothed so that it does not jitter when the hand is still.
3. The cursor SHALL show its state: open (idle), hovering over a grabbable piece, and pinched (holding).
4. WHEN no hand is tracked THEN the cursor SHALL fade out and the game SHALL show "看不到你的手".
5. The usable hand area SHALL map to the whole stage, so the player can reach every tray cell and every piece position without leaving the camera's view.

### Requirement 6: Grab and drop

**User Story:** As a gesture player, I want to pick up and put down pieces with my hand, so that I can rebuild the hall like a builder.

#### Acceptance Criteria

1. WHEN the cursor is over an unplaced piece AND the player makes the grab gesture THEN that piece SHALL be picked up and follow the cursor, as in a mouse drag.
2. WHEN the player makes the grab gesture over empty space THEN nothing SHALL be picked up.
3. WHILE a piece is held THE game SHALL keep holding it until the release gesture, even if the pinch distance briefly wavers. The release distance SHALL be larger than the grab distance (hysteresis).
3a. The pinch distance SHALL be measured relative to the hand's size in the image, so that grabbing works whether the hand is near or far from the camera.
4. WHEN the player makes the release gesture while holding a piece THEN the game SHALL drop it and apply exactly the main puzzle's drop rules (snap within 90 stage units, support check, messages, attempt counting).
5. A gesture SHALL only count after it has been seen steadily for a short time, so that a single misread frame does not grab or drop.
6. IF the hand is lost for more than 1 second while holding a piece THEN the piece SHALL return to its tray cell and the game SHALL say the hand was lost.
7. The hint button, progress counter, timer, and fact cards SHALL work as in the main puzzle.

### Requirement 7: Bonus level flow and success

**User Story:** As a player, I want the bonus level to feel special, so that unlocking it is rewarding.

#### Acceptance Criteria

1. WHEN the bonus level starts THEN the game SHALL skip the time travel and the arrival photo, show the assembled hall, and scatter it with the ghost wind.
2. The bonus level SHALL have a distinct look (for example, ghost-green glow and the title "鬼手营造") while keeping the same hall and pieces.
3. WHEN the 9th piece is placed THEN the game SHALL stop the camera, light the lanterns, and show a bonus success dialog with the title "鬼手匠师 · 隐藏关卡完成！", the time, and the attempt count.
4. The bonus success dialog SHALL offer "再玩一次隐藏关卡" and "回到开始".
5. The player SHALL be able to quit the bonus level at any time with a visible "退出" button or the Escape key.

### Requirement 8: Language, performance, and scope

**User Story:** As any player, I want the bonus level to be as polished as the rest of the game.

#### Acceptance Criteria

1. Every new piece of text SHALL have Chinese and English versions (checked by `tools/check.mjs`).
2. The hand tracker library, its WebAssembly files, and the model SHALL be stored in this repository and served from the same site, with no requests to other hosts. They SHALL be loaded only when the player opens the hidden level, so that the main game's load time does not change.
3. On a typical laptop, the cursor SHALL update at 20 frames per second or more.
4. The hand tracker library and model SHALL be under an open-source licence compatible with publishing this repository. Their licence text SHALL be included next to the vendored files and they SHALL be credited in `NOTICE.md` and the in-game credits.
5. The main game's behaviour, including mouse, touch, and keyboard play, SHALL NOT change.

## Decisions from review

1. Unlock is one chance per browser, remembered in `localStorage` (Requirement 1).
2. Grab is a thumb–index pinch, not a fist (Requirements 4–6).
3. Without a usable camera or tracker the only option is "返回"; there is no mouse fallback (Requirement 3).
4. The hand tracker library and model are vendored into the repository, not loaded from a CDN (Requirement 8).
