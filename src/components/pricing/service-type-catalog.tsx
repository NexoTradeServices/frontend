// The catalog list -- Feature 1007, ServiceType catalog screen.
//
// Card anatomy (frontend-conventions.md): one shape reused everywhere. One
// row per trade -- name, then the rates summary. "Add a trade" is the one
// loud button the screen exists for (Components / Buttons); each row's own
// action is a text-style link (button ladder: alternatives/trivial actions
// are never a second filled button).
import Link from "next/link";
import { PrimaryLink } from "@/components/auth/buttons";
import type { ServiceTypeDto } from "./service-type-form";

function dollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function ServiceTypeCatalog({ serviceTypes }: { serviceTypes: ServiceTypeDto[] }) {
  return (
    <div className="max-w-[720px]">
      <div className="mb-4.5 flex justify-end">
        <PrimaryLink href="/ops/pricing/new">Add a trade</PrimaryLink>
      </div>

      {serviceTypes.length === 0 ? (
        <div className="rounded-[10px] border border-hairline bg-surface p-5 text-sm text-muted-text">
          No trades yet. Add one to get started.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {serviceTypes.map((serviceType) => (
            <div
              key={serviceType.id}
              className="flex items-center justify-between rounded-[10px] border border-hairline bg-surface p-4"
            >
              <div>
                <b className="block font-heading text-[15px] font-extrabold text-ink">{serviceType.trade}</b>
                <span className="text-xs text-muted-text">
                  Call-out ${dollars(serviceType.customerCalloutRate)} / standard $
                  {dollars(serviceType.customerStandardRate)} per hour
                </span>
              </div>
              <Link
                href={`/ops/pricing/${serviceType.id}`}
                aria-label={`Edit ${serviceType.trade}`}
                className="text-[13px] font-semibold text-secondary-text underline underline-offset-2"
              >
                Edit
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
