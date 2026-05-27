# Shadepad

A small Electron + React drawing app with fixed brush sizes, 10% opacity steps, eyedropper, project save/load, PNG export, and a unique movable mask system for isolating parts of the canvas and reference image while drawing.

## Run in dev mode

```bash
npm install
npm run electron
```

## Build Windows portable EXE

```bash
npm run dist:win
```

The EXE will appear in the `release` folder.


## Windows symlink build error

If Windows says electron-builder cannot create a symbolic link, either enable Windows Developer Mode or run PowerShell as Administrator.

This project also sets `signAndEditExecutable: false` in `package.json` to avoid the winCodeSign step for this simple local app.


## Performance note

The undo stack now uses raw canvas snapshots instead of compressed PNG/base64 data URLs. This should make brush-size shortcut changes feel much faster during longer drawings.


## Focus mask

Press `F` to show/hide the focus mask. Press `M` to toggle move mode, then drag the visible focus rectangle. The mask is only a visual cover; it is not exported and it does not change the drawing.


## Floating reference panel

Load a reference image from the sidebar. The reference appears as a floating window that can be dragged by its top bar. The reference has its own independent mask. Press `R` to show/hide the reference panel.


## Themes

The app shell has multiple background themes. They change the surrounding interface only; exported canvas images stay unchanged.


## Reference resize update

The reference window can be resized with the sidebar buttons or the bottom-right handle. The reference mask can be resized separately. `Match canvas mask` copies the canvas mask position and size to the reference mask as percentages.


## Reference mask correction

The reference mask is applied to the actual visible reference image, not to the whole floating window. This keeps the mask from being distorted by black letterbox space. The reference mask also has separate wider/narrower/taller/shorter controls.


## Same-size masks

The canvas mask and reference mask now use one shared visible Width × Height in screen pixels. They can move independently, but they stay the same size and shape.


## Mask hole fix

The mask is now built from four dark cover pieces around the visible rectangle. The inside of the rectangle stays visible.


## Canvas zoom

The canvas can now be zoomed from 25% to 600%. Use the sidebar zoom controls or keyboard shortcuts: `+` zoom in, `-` zoom out, `0` reset to 100%.


## Fixed viewport masks

Canvas and reference masks now use one shared visible Width × Height in screen pixels. Zooming the canvas does not resize or move either mask. The image changes underneath the mask, while the mask itself stays fixed until you drag it or nudge it.


## Reference zoom

The floating reference panel now has its own zoom controls. Zoom changes the reference image underneath the fixed mask, while the mask itself keeps the same size and position until moved.


## Cursor fix

The drawing surface now forces the OS cursor hidden across the canvas, masks, and overlays. Pointer capture is enabled during strokes so the cursor should no longer flicker back to the normal pointer while drawing.


## Fill bucket

The fill bucket uses the current color and opacity. Shortcut: `G`. It fills a contiguous similar-color area; the tolerance is intentionally modest so it behaves more like a simple Shadepad bucket than a complex paint-program selection tool.


## Fill fix + paper color

The fill bucket works again now. The missing `hexToRgb` helper was added, fill tolerance was improved a bit, and fill undo is stored properly.

There is also now a paper color option. You can pick a paper color, apply it to the current canvas, and that same paper color is used for new canvas, clear, and the eraser.


## Shape tools

Two simple Gartic-like shape tools were added: a straight line tool and a filled rectangle tool. The line uses the current brush size, color, and opacity. The rectangle uses the current color and opacity and is filled instantly. Shortcuts: `L` for line and `U` for rectangle.


## Build a Windows installer

Install dependencies first:

```powershell
npm install
```

Run the development app:

```powershell
npm run electron
```

Build a normal Windows installer:

```powershell
npm run dist:win:setup
```

Build a portable `.exe`:

```powershell
npm run dist:win:portable
```

The finished files will appear in the `release` folder.

## Uploading to GitHub

1. Create a new repository on GitHub.
2. Put this project folder in Git.
3. Commit the files.
4. Push the repo.
5. On GitHub, create a Release and upload the installer/portable `.exe` from the `release` folder.

Suggested repository contents:
- source code
- README
- license file
- screenshots
- installer/portable builds only attached to Releases, not committed into the main repo

Suggested license for a simple open-source release: MIT License.


## App icon

The Windows app icon is stored at `build/icon.ico`. Electron Builder uses it for the `.exe`, installer, and uninstaller icons.


## Output names

Installer builds should now use a clearer name like:

`Shadepad-Setup-1.0.0-x64.exe`

Portable builds should use the general artifact name. To avoid confusing outputs, delete the `release` folder before switching between setup and portable builds.


## Naming

The app has been renamed to **Shadepad**.

The installer should now build as something like:

`Shadepad-Setup-1.0.0-x64.exe`

Saved project files now default to:

`shadepad-project.shadepad.json`

PNG exports default to:

`shadepad-drawing.png`


## Update

Themes are now collapsed behind a Theme button. Paper color applies immediately and the obsolete reapply text/button was removed. A Move/Pan tool was added for dragging around a zoomed canvas; default shortcut is `H`. Shortcut settings are available in the Settings section.


## Brush size update

Brush sizes were adjusted to better match the lighter Gartic-style set shown by the reference image:

`1, 4, 8, 14, 24`

The first brush is now a true 1 px line.


## Custom brush presets

You can now add your own brush sizes as presets and remove presets you do not want.

- add a custom size in pixels
- keep it as a preset
- remove presets with the `×` button

Number keys now select the first 9 visible presets.


## Paper color preservation fix

Changing the paper color now shifts the whole canvas by the paper-color difference instead of replacing only exact background pixels. This keeps low-opacity drawings visible instead of making them disappear when the paper changes.


## Fullscreen and canvas workspace update

The Electron window now starts fullscreen and is also maximized where supported. The canvas workspace no longer shows scrollbars, but scrolling still exists internally so the Move/Pan tool can drag around a zoomed canvas.

The canvas display is no longer capped to 1000 px wide, so the drawing area can use more of the available window.


## Paper color safety fix

Paper color changes now only replace pixels that exactly match the old blank paper color. Drawn pixels are no longer shifted or recolored, so changing the paper color should not erase or wash out the drawing.


## Separate paper layer

Paper color is now a separate visual background layer underneath the drawing canvas. The drawing canvas itself stays transparent.

This means:
- changing paper color cannot erase the drawing
- eraser clears to transparent so the paper shows through
- PNG export composites the selected paper color behind the transparent drawing
- project files keep the transparent drawing plus the selected paper color
