// Service status -- Feature 6012. `/ops/status`, ops + owner. Portal shell, Wide container.
// The checks run live in the page itself (the backend's five through GET /api/status, Google
// Places in the browser), so there is nothing to load on the server.
import { Container } from "@/components/frame/container";
import { ServiceStatus } from "@/components/service-status/service-status";

export const metadata = {
  title: "Service status",
};

export default function ServiceStatusPage() {
  return (
    <Container width="wide">
      <ServiceStatus />
    </Container>
  );
}
