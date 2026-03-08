"use client";

import { useSearchParams } from "next/navigation";
import ReminderConnector from "@/app/components/shared/ReminderConnector/ReminderConnector";

const connectors = {
  reminder: ReminderConnector,
};

export default function ExternalConnectorPage() {
  const searchParams = useSearchParams();
  const connectorName = searchParams.get("connector");

  const ConnectorComponent = connectors[connectorName];

  if (!ConnectorComponent) {
    return <div>Unknown connector</div>;
  }

  return <ConnectorComponent />;
}
