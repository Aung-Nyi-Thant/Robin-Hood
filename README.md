# Sheriff of Nottingham — Live

A mobile-first real-time social deduction game built with React, Tailwind CSS, Express, and Socket.io.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The web app runs on port 3000 and the authoritative game server runs on port 4000. Open three browser windows, create a room in one, and join with the four-letter code in the others.

## Game flow

- The host starts a 3–5 player game; everyone receives 50 gold and builds an opening hand by drawing six cards, one at a time, from the main deck.
- The host chooses a 1–8 round match when creating the room.
- Every merchant may keep a full six-card hand and skip trading, or trade up to five cards and draw replacements one card at a time from any pile.
- At the start of a new round, the incoming Sheriff draws from the main deck until their hand is back to six before merchant trading begins.
- Merchants then submit a sealed 1–5 card bag with one declared good.
- The Sheriff handles bags clockwise, negotiating an offer and demand before passing or inspecting.
- Pass and inspection outcomes are broadcast to every player: sealed bags return to merchants, inspected bags reveal their cards, and resolved goods remain visible beside each player profile.
- Inspection payouts and card placement are calculated on the server.
- After the configured final round, scores are sorted by total points and then gold.

## Scripts

- `npm run dev` — run the web and Socket.io servers together
- `npm run build` — build the web client
- `npm test` — run game-engine rule tests
- `npm run lint` — lint the project

Use `NEXT_PUBLIC_GAME_URL`, `GAME_PORT`, and `CLIENT_ORIGIN` to point the web client and game server at deployed origins.
