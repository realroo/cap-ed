ClipForge desktop
1. Install Node.js LTS from nodejs.org
2. Open a terminal in this folder and run:  npm install
3. Run the app:  npm start
4. Make a Windows installer:  npm run dist   (output goes to the dist folder)

Captions: the first run downloads the Whisper model (about 250 MB) and then works offline.
For better Hindi accuracy, change WHISPER in renderer/desktop.js to 'Xenova/whisper-medium'.
