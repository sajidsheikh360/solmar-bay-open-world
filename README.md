# solmar-bay-open-world
[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/sajidsheikh360/solmar-bay-open-world/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/sajidsheikh360/solmar-bay-open-world/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Solmar Bay** is an original open-world crime game that plays offline in a desktop browser. You are Mara Voss, back in a sun-soaked coastal city after five years away. Lena Kaur needs a driver, the Dockside crew wants its money back, and Inspector Hale's police watch every street. Explore the city on foot and by car, steal vehicles, outrun the police, and finish five story missions to take the Bay back.

The city is all original — Solmar Bay, its districts (Marina, Old Town, Palm Heights, Dockside, Neon Strip, Beachfront), its people and its story. Nothing here comes from any commercial game.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080

No build step, no network requests: the game is static files under `game/`, with Three.js vendored under `game/vendor/`.

## Controls

- **WASD / arrows** — walk or drive
- **Mouse** — look and aim (click to shoot)
- **E** — enter / steal a car, or get out
- **F** — punch
- **Shift** — run
- **M** — start the next story mission
- **P / Esc** — pause

## Features

- A full 3D city to explore on foot and by car, with a beach, marina, palms and the Neon Strip
- Traffic cars and pedestrians with simple AI — they drive, stroll, cross streets and flee from gunfire
- Wanted level (0–5 stars) with police cars that chase, ram and arrest, and officers on foot; hide to let the heat decay
- Five story missions with dialogue, markers and rewards: a courier delivery, a getaway drive, a rescue, a turf pickup, and the final Solmar heist — plus taxi fares and collectible sun-coins
- Combat on foot (punch and shoot), car damage, health, wasted / busted screens
- HUD with health, money, wanted stars, mission objective, clock, speed and a live minimap
- Start screen, pause, save and continue (progress is kept in localStorage), day lighting and night neon, and synthesised WebAudio sound (engine, sirens, shots, pickup jingles) — no audio files

Entered on [make.fun](https://make.fun/?ref=ewxcv4y7&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards
