import { StatusPage } from "@/components/reservation/StatusPage";

export function AccessDenied() {
  return (
    <StatusPage
      variant="error"
      title="Acceso denegado"
      message="Ese código no es válido. Si sos del estudio y perdiste el link del panel, pedilo de nuevo."
    />
  );
}
