import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const EXAMPLES = [
  "1350 Massachusetts Ave, Cambridge, MA",
  "35 Oxford St, Cambridge, MA",
  "440 Huntington Ave, Boston, MA",
  "1600 Pennsylvania Ave NW, Washington, DC",
  "500 S Main St, Flint, MI",
];

export function AddressSearch({ initial = "", showExamples = true }: { initial?: string; showExamples?: boolean }) {
  const [value, setValue] = useState(initial);
  const navigate = useNavigate();
  const go = (address: string) => {
    const a = address.trim();
    if (a) navigate({ to: "/report", search: { address: a, geoid: "" } });
  };
  return (
    <div className="w-full">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go(value);
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <label htmlFor="address" className="sr-only">Enter a U.S. address</label>
        <Input
          id="address"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Enter a U.S. address"
          autoComplete="street-address"
          className="h-12 flex-1 bg-card text-base"
        />
        <Button type="submit" size="lg" className="h-12 px-6 text-base">Explore</Button>
      </form>
      {showExamples && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Try:</span>
          {EXAMPLES.map((ex) => (
            <Button key={ex} type="button" variant="outline" size="sm" className="rounded-full bg-card" onClick={() => go(ex)}>
              {ex}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
