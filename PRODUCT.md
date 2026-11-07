# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Visitors to Bill Huang's personal resume site (recruiters, peers, friends), usually on a phone, who open a project from the resume to try it. The arcade games and the Palette tool are live demos of resume projects.

## Product Purpose
A Pokémon-themed resume with playable side projects. Success is a visitor trying a project and coming away with an "oh, that's neat" moment.

## Capabilities and Constraints
- Next.js static export (`output: "export"`): no server, no accounts. Anything saved lives in the visitor's browser; anything shared travels in the URL.
- Offline-capable through `public/sw.js`; new routes must be added to its route list.
- Palette (`/palette`): extracts a colour palette from a photo taken with the camera or uploaded; saves palettes on the device, shares them as a link, exports them as a PNG. The photo never leaves the device. It is the web version of a 2019 Kotlin/Android app (github.com/billykeyss/color-picker-android).

## Brand Commitments
- The resume and arcade share a Pokémon/pixel identity.
- Palette is deliberately a standalone tool, not part of the arcade world; it keeps only a link back to the resume (user decision, 2026-11-06).

## Product Principles
- Palette: the colour reveal is the moment that matters most — snap a photo and watch the palette come out of it (user decision, 2026-11-06).
- Every project must work on a phone first.
