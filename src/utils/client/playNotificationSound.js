let audio;

export function playNotificationSound() {
  try {
    if (!audio) {
      audio = new Audio("/sounds/notify.wav");
      audio.preload = "auto";
      audio.load();
    }

    // rewind if already playing
    audio.currentTime = 0;

    audio.play().catch(() => {});
  } catch (err) {
    console.error("Sound play error", err);
  }
}
