import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Food Delivery</h1>
      <p className="text-muted-foreground max-w-md">
        Discover restaurants and get your favourite food delivered.
      </p>
      <Button size="lg">Browse restaurants</Button>
    </main>
  );
}
