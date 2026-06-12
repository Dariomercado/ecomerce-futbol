import Link from "next/link";

const footerGroups = [
  {
    title: "Shop",
    links: ["Products", "Categories", "Featured gear", "New arrivals"],
  },
  {
    title: "Support",
    links: ["Size guide", "Shipping info", "Returns", "Contact"],
  },
  {
    title: "Brand",
    links: ["About Verde Arena", "Design system", "Newsletter"],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-premium text-primary-foreground dark:bg-card">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.5fr_2fr] lg:px-8">
        <div className="space-y-4">
          <Link href="/" className="font-heading text-2xl font-bold tracking-tight">
            Verde Arena
          </Link>
          <p className="max-w-md text-sm leading-6 text-primary-foreground/80">
            Verde Arena curates modern football essentials for training, matchday,
            and everyday pitch culture.
          </p>
          <p className="text-xs leading-5 text-primary-foreground/65">
            Portfolio ecommerce concept. Backend, auth, and payments are intentionally
            deferred until the UI foundation is approved.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-3">
          {footerGroups.map((group) => (
            <div key={group.title} className="space-y-3">
              <h2 className="font-heading text-sm font-semibold tracking-wide text-accent">
                {group.title}
              </h2>
              <ul className="space-y-2 text-sm text-primary-foreground/75">
                {group.links.map((link) => (
                  <li key={link}>
                    <span>{link}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}