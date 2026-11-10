import { createFileRoute } from "@tanstack/react-router";
import { AddressSearch } from "@/components/AddressSearch";
import { MethodologyFooter, SiteHeader } from "@/components/SiteChrome";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SatisTractory — health profiles for any U.S. address" },
      { name: "description", content: "Enter a U.S. address to see its census tract's health profile compared with the state, explained in plain language." },
      { property: "og:title", content: "SatisTractory" },
      { property: "og:description", content: "See any U.S. neighborhood's health profile vs. the state average, in plain language." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 pb-12 pt-16 sm:px-6 sm:pt-24">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Community health, block by block</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
            What does health look like in your neighborhood?
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Enter any U.S. address to see its census tract's mental health, chronic disease, social needs, and access
            to care — compared with the state average and explained in plain language.
          </p>
          <div className="mt-8">
            <AddressSearch />
          </div>
        </section>
        <section className="mx-auto grid max-w-3xl gap-4 px-4 sm:grid-cols-3 sm:px-6">
          {[
            ["19 measures", "From the CDC PLACES project"],
            ["vs. state average", "With uncertainty ranges"],
            ["Plain language", "Written for organizers"],
          ].map(([a, b]) => (
            <div key={a} className="rounded-xl border border-border bg-card p-4">
              <p className="font-serif text-lg font-semibold text-foreground">{a}</p>
              <p className="text-sm text-muted-foreground">{b}</p>
            </div>
          ))}
        </section>
      </main>
      <MethodologyFooter />
    </div>
  );
}
