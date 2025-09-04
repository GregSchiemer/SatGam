// portrait-lock.js
// Enforces portrait mode and prevents device sleep if possible

let appInitialized = false;
let wakeLock = null;

export async function enforcePortraitAndWakeLock(initApp) {
  // 1. Fullscreen blocker if rotated
  createOrientationBlocker();

  // 2. Attempt to lock orientation (best effort)
  try {
    await screen.orientation.lock("portrait");
    console.log("🔒 Orientation lock successful");
  } catch (e) {
    console.warn("⚠️ Orientation lock failed:", e);
  }

  // 3. Listen for orientation changes (backup blocker)
  window.addEventListener("resize", checkOrientation);
  checkOrientation();

  // 4. Try to prevent screen sleep (if supported)
  try {
    if ("wakeLock" in navigator) {
      wakeLock = await navigator.wakeLock.request("screen");
      console.log("💤 WakeLock acquired");
    }
  } catch (err) {
    console.warn("⚠️ WakeLock request failed", err);
  }

  // 5. Launch app only once
  if (!appInitialized) {
    appInitialized = true;
    initApp();
  }
}

function checkOrientation() {
  const blocker = document.getElementById("blocker");
  if (window.innerWidth > window.innerHeight) {
    blocker.style.display = "flex";
  } else {
    blocker.style.display = "none";
  }
}

function createOrientationBlocker() {
  const blocker = document.createElement("div");
  blocker.id = "blocker";
  blocker.style = `
    display: none;
    position: fixed;
    top: 0; left: 0;
    width: 100vw; height: 100vh;
    background: black;
    color: white;
    font-family: sans-serif;
    font-size: 1.5em;
    text-align: center;
    padding: 2em;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `;
  blocker.innerHTML = `
    🔒 <strong>This app runs only in portrait mode.</strong><br/>
    Please rotate your device.
  `;
  document.body.appendChild(blocker);
} 
