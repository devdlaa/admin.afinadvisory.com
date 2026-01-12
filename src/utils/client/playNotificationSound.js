let audio;

export function playNotificationSound(soundEnabled) {
  try {
    if (!soundEnabled) return;

    if (!audio) {
      audio = new Audio("/sounds/notify.wav");
      audio.preload = "auto";
      audio.load();
    }

    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch (err) {
    console.error("Sound play error", err);
  }
}
