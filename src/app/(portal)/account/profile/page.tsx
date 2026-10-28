// Profile -- Feature 6010, customer portal. Portal shell, Medium, Record page with no tabs: her details read-only,
// the call-us line, and the way to change her password.
import Link from "next/link";
import { Container } from "@/components/frame/container";
import { PageHeader } from "@/components/ui/page-header";
import { LoadFailed } from "@/components/ui/load-failed";
import { Card, Fact } from "@/components/account/parts";
import { accountGet } from "@/lib/account-api";

interface ProfileDto {
  name: string;
  email: string;
  phone: string | null;
  businessName: string | null;
  billingAddress: string | null;
  officePhone: string;
}

export const metadata = { title: "Your profile" };

export default async function AccountProfilePage() {
  const { data } = await accountGet<ProfileDto>("/profile");
  if (data === null) return <LoadFailed />;
  return (
    <Container width="medium">
      <PageHeader title="Profile" subtitle="The details we hold for you." />
      <Card title="Your details">
        <div className="grid gap-3">
          <Fact label="Name">{data.name}</Fact>
          <Fact label="Email">
            <span className="break-all">{data.email}</span>
          </Fact>
          <Fact label="Phone">{data.phone ?? <span className="font-normal text-muted-text">None given</span>}</Fact>
          {data.businessName !== null ? <Fact label="Business name">{data.businessName}</Fact> : null}
          <Fact label="Billing address">{data.billingAddress ?? <span className="font-normal text-muted-text">None on file</span>}</Fact>
        </div>
        <p className="mt-4 text-small text-muted-text">
          To change your details, call us on{" "}
          <a href={`tel:${data.officePhone.replace(/[^\d+]/g, "")}`} className="underline underline-offset-2">
            {data.officePhone}
          </a>
        </p>
        <Link href="/forgot-password?from=/account/profile" className="mt-2 inline-flex min-h-11 items-center text-small font-semibold text-secondary-text underline underline-offset-2">
          Change your password
        </Link>
      </Card>
    </Container>
  );
}
