# Requirements: 晋祠美景 Seasonal Photo Gallery

## Introduction

A photo gallery of Jinci's buildings and gardens across the four seasons, opened from a button that is always on screen. The player pages through the photos with previous / next. Every photo is freely licensed and credited.

Requested by the user during the gesture-level work ("添加一个按钮，点击查看晋祠美景……不同季节……上一页，下一页"). The request was concrete, so requirements, design, and tasks were written together and implemented straight away; review happens on the pull request.

## Glossary

- **Season**: spring (Mar–May), summer (Jun–Aug), autumn (Sep–Nov), winter (Dec–Feb), from the photo's recorded shooting date.
- **Viewer**: the gallery dialog that shows one photo at a time.

## Requirements

### Requirement 1: Opening and closing

**User Story:** As a visitor, I want to look at real photos of Jinci at any time, so that I can see the place the game is about.

#### Acceptance Criteria

1. The game SHALL show a "晋祠美景" button in the top controls on every screen.
2. WHEN the player presses it THEN the viewer SHALL open on the first photo of the current season of the year (by the device's date), and focus SHALL move into the viewer.
3. WHEN the player presses the close button, presses Escape, or clicks outside the photo panel THEN the viewer SHALL close and focus SHALL return to the "晋祠美景" button.
4. WHILE the viewer is open THE game behind it SHALL NOT react to clicks or keys.
5. WHILE the hidden gesture level is running THE "晋祠美景" button SHALL be hidden, so that the camera is never left running behind the gallery.

### Requirement 2: Paging

**User Story:** As a visitor, I want to step through the photos, so that I can browse them one by one.

#### Acceptance Criteria

1. The viewer SHALL show one photo with its caption, its season, and a position counter such as "3 / 24".
2. WHEN the player presses "上一张" / "下一张", the left / right arrow keys, or swipes left / right on a touch screen THEN the viewer SHALL show the previous / next photo.
3. The photos SHALL be ordered spring → summer → autumn → winter, and paging SHALL wrap around from the last photo to the first and back.
4. The viewer SHALL show season tabs (春 夏 秋 冬) with the number of photos in each; WHEN the player picks a tab THEN the viewer SHALL jump to the first photo of that season, and the tab of the current photo SHALL always be highlighted.
5. WHEN a photo is shown THEN the viewer SHALL already be loading the photos before and after it, so that paging feels instant.
6. WHILE a photo is loading THE viewer SHALL show a loading state instead of a broken image.

### Requirement 3: Content and licensing

**User Story:** As a judge or visitor, I want to trust where the photos come from, so that the project respects photographers.

#### Acceptance Criteria

1. The gallery SHALL contain at least 5 photos for each of the four seasons, of Jinci's buildings and gardens.
2. Each photo's season SHALL match the shooting date recorded in its source metadata.
3. Each photo SHALL be public domain or CC-licensed, and the viewer SHALL show its author and licence with a link to its source page.
4. Every gallery photo SHALL appear in the in-game credits and `assets/photos/credits.json`.
5. Every caption SHALL have Chinese and English text.

### Requirement 4: Style and access

**User Story:** As any player, I want the gallery to fit the game and work with my device.

#### Acceptance Criteria

1. The viewer SHALL use the game's night-and-lantern style.
2. The viewer SHALL work with mouse, touch, and keyboard, and every control SHALL have an accessible label.
3. The photo SHALL fit the screen without cropping on both landscape and portrait screens.
4. Gallery images SHALL NOT be downloaded until the viewer is opened.
