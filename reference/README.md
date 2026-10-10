# Visual references

This folder is reserved for user-provided or otherwise authorized reference
images and recordings. Do not add copied site assets unless their use and
redistribution are authorized.

## Capturing the reconstruction

Install the project dependencies and the Playwright Chromium browser, then run:

```sh
npm run test:visual
```

The suite captures the loader, intro, Home, the pre-dive frame, a fixed
transition midpoint, Projects entry and mid-scroll, Contact, and World at
1440×900. Deterministic captures are written to `artifacts/visual/` and are
excluded from Git by default.

## Comparing images

Put authorized reference captures in this folder and compare them with the
matching files in `artifacts/visual/` using an image-diff tool. Keep viewport,
browser scale, and the selected quality mode consistent. Screenshots are
evidence for inspection; this workflow does not decide or claim that the
reconstruction is identical.

## Debug URL controls

`?debug=1` enables the test/debug controller and starts directly in the
experience unless `screen=loader` or `screen=intro` is selected. Supported
query controls:

- `pause=1`: disables user-driven scroll and holds scene animation time.
- `homeProgress=0.5`: sets the Home scroll segment.
- `transition=0.5` (or `transitionProgress=0.5`): selects a transition frame.
- `projectsOffset=2`: fixes the Projects gallery offset.
- `hideCursor=1`: hides the custom cursor.
- `freezeParticles=1`: holds particle and petal motion.
- `freezeTime=1`: stops scene/shader animation time.

Only one scroll position can be represented at once; when several progress
parameters are supplied, `projectsOffset` takes precedence, then transition,
then Home.

The same controls are available after load through
`window.__UNSEEN_DEBUG__.setState({...})`, for example:

```js
window.__UNSEEN_DEBUG__.setState({
  transitionProgress: 0.5,
  paused: true,
  hideCursor: true,
});
```
