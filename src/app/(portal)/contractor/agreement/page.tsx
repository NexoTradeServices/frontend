// The contractor agreement page -- Feature 2006, contractor agreement
// acceptance. Architecture & Routing / Page inventory: `/contractor/agreement`
// -- a Record page in the Portal shell, in no menu: it is reached from the
// dashboard's readiness row and the update email, never a gate. The agreement
// itself loads in the browser (AgreementPanel), so the page shell stays light.
import { AgreementPanel } from "@/components/agreement/agreement-panel";
import { Container } from "@/components/frame/container";
import { PageHeader } from "@/components/ui/page-header";


export default async function ContractorAgreementPage() {
  return (
    <Container width="medium">
      <PageHeader
        title="Contractor agreement"
        subtitle="Read it in your own time, then accept."
        breadcrumb={{ label: "Dashboard", href: "/contractor" }}
      />
      <AgreementPanel />
    </Container>
  );
}
