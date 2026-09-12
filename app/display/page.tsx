"use client";

import { WaitingRoomScreen } from "@/components/display/WaitingRoomScreen";
import { useQueueStore } from "@/lib/useQueueStore";

export default function DisplayPage() {
  const { activePatients, settings } = useQueueStore();
  return <WaitingRoomScreen patients={activePatients} message={settings.displayMessage} />;
}
