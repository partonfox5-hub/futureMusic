Hero Slayer download package lives at:
  public/downloads/hero-slayer-alpha.zip (~334 MB obfuscated web+Electron shell)

Do not commit this zip to git. For production:
  1. Upload to GCS bucket (futuremusic) as downloads/hero-slayer-alpha.zip
  2. Or scp onto Cloud Run volume / rebuild image with the file
  3. Local test: keep the file under public/downloads/

Test URLs (after push):
  https://futuremusic.online/test-7qsba2gtr6
  https://futuremusic.online/test-7qsba2gtr6-splash
  https://futuremusic.online/test-7qsba2gtr6-success
