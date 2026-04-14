import {
  getDatabase,
  ref,
  onValue,
  set,
  onDisconnect,
  serverTimestamp,
} from "firebase/database";

const rtdb = getDatabase();

export function setupPresence(userId) {
  if (!userId) return;

  const statusRef = ref(rtdb, `/status/${userId}`);
  const connectedRef = ref(rtdb, ".info/connected");

  onValue(connectedRef, (snapshot) => {
    if (snapshot.val() === true) {
      // ✅ Mark ONLINE in RTDB
      set(statusRef, {
        state: "online",
        last_changed: serverTimestamp(),
      });

      // ✅ Auto OFFLINE on disconnect
      onDisconnect(statusRef).set({
        state: "offline",
        last_changed: serverTimestamp(),
      });
    }
  });
}
