# 💌 Tartufo Ristorante · Date Invitation

A mobile-first date invitation styled as a wine-red envelope with a gold wax seal. Slide up (or tap "Open invitation") and the flap unfolds while the itinerary card slides out. Includes a soft synthesized piano toggle.

Plain HTML, CSS and JavaScript. No build step, no dependencies.

## Files

```
index.html   page structure and itinerary content
style.css    envelope, flap, seal, card and typography
script.js    date setting, gestures, flap animation and music
```

## Personalise it

- **Date:** open `script.js` and change `date` in `dateDetails` (e.g. `"SATURDAY, NOVEMBER 14TH"`).
- **Itinerary:** edit the three `<article class="stop">` blocks in `index.html` (time, title, description, map link). Copy a block to add more stops.
- **Restaurant name / cover text:** edit the `<h1>` and `.cover-subtitle` in `index.html`.
- **Colours:** change the variables at the top of `style.css` (`--wine`, `--gold`, `--ivory`, ...).
- **Map links:** replace the `maps.google.com/?q=...` URLs with the real places.

## Try it locally

Open `index.html` in a browser (use the mobile device toolbar for the phone view), or run:

```bash
python3 -m http.server 8000
```

then visit `http://localhost:8000`. On Windows, use `python -m http.server 8000` if `python3` is not recognized.

## Deploy

1. Create a GitHub repo and push these files to the repo root.
2. In Netlify choose **Add new site → Import an existing project** and select the repo.
3. Leave the build command empty and set the publish directory to `.`, then deploy.

You can also drag the folder onto <https://app.netlify.com/drop>.

## Controls

- Slide up on the envelope (or tap **Open invitation**) to open
- Tap **Slide down to close** to seal it again
- Music button (top right) toggles the soft piano
- Respects `prefers-reduced-motion`
