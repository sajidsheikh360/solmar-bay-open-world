# solmar-bay-open-world

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/sajidsheikh360/solmar-bay-open-world/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/sajidsheikh360/solmar-bay-open-world/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Solmar Bay is an original open-world crime game that plays offline in a desktop browser. You are Mara Voss, a driver-for-hire in a sun-soaked coastal city of six districts — the Marina, Old Town, Palm Heights, Dockside, the Neon Strip and Beachfront. Explore the city on foot and by car, steal cars, dodge the Solmar Bay police, and work your way through five story missions for Lena Kaur and Tomas Reyes, from a first delivery to the Solmar Heist. Taxi fares and sun coins pay between jobs, and your save carries on where you left off.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no network requests — everything the game loads is a file under `game/`.

## Controls

- WASD — move on foot / drive
- Mouse drag — look around
- Click — shoot
- E — enter a car, or steal a parked or traffic car
- F — punch
- Space — brake
- Shift — run
- P or Esc — pause

## Features

- A 3D city built with Three.js (vendored under `game/vendor/`): roads, traffic, pedestrians, palms, the Marina docks and the glowing signs of the Neon Strip
- Driving and car theft, with a wanted level (0–5 stars) and police cars that chase, ram and arrest
- Five story missions with objectives, dialogue and rewards, plus taxi fares and 12 sun-coin collectibles
- Combat on foot, car damage, health, and police who shoot back at high wanted levels
- A live HUD with health, money, wanted stars, clock, speed, mission objective and a minimap
- Start, pause, wasted and busted screens, and a save that continues your game
- Synthesised sound: engine hum, sirens, gunshots and mission jingles — no audio files

---

Entered on [make.fun](https://make.fun/?ref=ewxcv4y7&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards
