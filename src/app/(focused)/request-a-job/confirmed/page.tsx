// /request-a-job/confirmed -- Feature 3001, enquiry form to job created.
// AC4: the JOB reference and "we'll call you shortly". Feature 3004 adds the one Caption
// line under the reference: "Want to track this online? Set a password" -> /set-password.
// The reference travels in the
// query string from the form's own POST response; nothing here is fetched
// by job reference, so there is no way to enumerate someone else's job.
import Link from "next/link";
import { Container } from "@/components/frame/container";
import { MessageCard } from "@/components/ui/message-card";

export const metadata = {
  title: "Request received",
};

export default async function RequestAJobConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;

  return (
    <Container width="narrow">
      <MessageCard title="We've got it." success>
        <p>We&apos;ll call you shortly to confirm a time.</p>
        {ref ? (
          <p className="mt-3 inline-block rounded-small-box border border-hairline bg-ground px-3 py-1.5 font-heading text-name font-extrabold tracking-[0.02em] text-ink">
            {ref}
          </p>
        ) : null}
        <p className="mt-3 text-caption text-muted-text" data-testid="set-password-offer">
          Want to track this online?{" "}
          <Link href="/set-password" className="underline underline-offset-2">
            Set a password
          </Link>
        </p>
      </MessageCard>
    </Container>
  );
}
