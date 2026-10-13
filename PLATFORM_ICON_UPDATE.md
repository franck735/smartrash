Platform icon update instructions

What I changed:
- Updated iOS `AppIcon.appiconset/Contents.json` to reference `icon-02.png`.
- Removed `lovable-tagger` import from `vite.config.ts` and removed it from `package.json` devDependencies.
- Updated Android embedded `index.html` branding and OG/twitter metadata.

Next steps (required to complete icon replacement):
1. Copy the `public/icon-02.png` into each platform asset folder, scaled appropriately.

  - iOS:
    - Copy `public/icon-02.png` into `ios/App/App/Assets.xcassets/AppIcon.appiconset/` and add the required sizes (e.g. 20x20, 29x29, 40x40, 60x60, 76x76, 83.5x83.5, 1024x1024) with proper filenames as listed in `Contents.json`.
  - Android:
    - Replace the images in `android/app/src/main/res/mipmap-*/ic_launcher.png` and `ic_launcher_foreground.png` with appropriately scaled versions of `icon-02.png`.

2. Update the iOS asset catalog in Xcode (open `ios/App/App.xcodeproj`) to ensure assets are recognized.
3. Run the native sync and builds:

```bash
npm run build
npx cap sync ios
npx cap open ios
# or for Android
npx cap sync android
npx cap open android
```

Notes:
- I did not modify `package-lock.json` or `node_modules`; please run `npm install` to regenerate the lockfile after removing the devDependency.
- If you want, I can attempt to (a) remove `lovable-tagger` from `package-lock.json` and `node_modules`, and (b) create resized icon files automatically if you provide a source high-res PNG. Let me know which you'd like next.
