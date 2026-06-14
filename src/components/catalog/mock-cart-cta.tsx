import { Button } from "@/components/ui/button";

export function MockCartCTA() {
  return (
    <div className="space-y-3 rounded-3xl border border-border bg-card p-5">
      <Button className="h-11 w-full" disabled size="lg" type="button">
        Agregar al carrito
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Carrito disponible en una próxima fase.
      </p>
    </div>
  );
}
