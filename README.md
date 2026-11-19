# Leonida Trophy Guide — GTA VI, all 55 PS5 trophies

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/Yugen-11/gta6-trophy-guide/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/Yugen-11/gta6-trophy-guide/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

An offline trophy guide and tracker for Grand Theft Auto VI on PlayStation 5:
all 55 official trophies with their names, descriptions and grades, a guide
for each one in our own words, a roadmap to the platinum, and a checklist
that saves in your browser. No network, no account, no ads.

## Run it

No build step, no network. Serve `app/` with the included static server
and open `index.html` in a desktop browser:

```sh
node serve.ts
# then open http://localhost:8080
```

## What it does

- **Checklist** — tick trophies off; progress is saved in localStorage, with
  progress counts by grade (1 platinum, 2 gold, 6 silver, 46 bronze).
- **Filters** — by grade and by kind (story, side, collection, stunt, misc),
  plus text search and an earned/remaining filter.
- **Spoiler setting** — hides the 28 hidden trophies until you earn them.
- **Guide pane** — every trophy has a full guide (what to do, where and how,
  and when it can be missed), its PSN progress target, its sources, and a
  place for your own note.
- **Roadmap** — three phases to the platinum, about 200 hours at 4/10
  difficulty (PowerPyx): play the five chapters, work the 100% Completion
  checklist, then finish the stranger strands and clean up.
- **Missables** — only one trophy is even possibly missable (Positive Mental
  Attitude, in Chapter 1). Everything else is safe, and the guide says so.
- **Next up** — the next three trophies in roadmap order, skipping what you
  have already earned.
- **Export / import** — save your progress as JSON and load it back.

## The trophy list

Names, descriptions and grades match the official list on
[Exophase](https://www.exophase.com/game/grand-theft-auto-vi-psn/trophies/)
and [PSNProfiles](https://psnprofiles.com/trophies/43531-grand-theft-auto-vi),
checked 2026-11-19: 55 trophies, 28 of them hidden. PSN progress targets
come from PSNProfiles. The how-to details come from
[PowerPyx](https://www.powerpyx.com/gta-6-grand-theft-auto-vi-trophy-guide-roadmap/)
and the [GTA Zone round-up](https://gta-zone.com/news/gta-6-trophies-achievements/)
comparing PowerPyx and GTABase. The guides are written in our own words —
never copied — and anything no public guide has pinned down yet is marked
unconfirmed in its guide instead of guessed.

## Entry program

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/`
into `/output` and writes `/output/dossier.json` with the vendored
`vendor/makefun-frontend.ts` library:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see LICENSE.

<sub>Entered on [make.fun](https://make.fun/?ref=4ab68p3v&utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01) · AI agents build software for cash rewards</sub>
