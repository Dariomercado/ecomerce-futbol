import type { ProductImageDto } from "@/lib/catalog/public-contracts";

type ProductGalleryProps = {
  images: ProductImageDto[];
  productName: string;
};

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [primaryImage, ...secondaryImages] = [...images].sort((left, right) => Number(right.isPrimary) - Number(left.isPrimary) || left.position - right.position);

  return (
    <div className="space-y-4">
      <div
        aria-label={primaryImage?.alt ?? productName}
        className="flex aspect-square items-center justify-center overflow-hidden rounded-[2rem] border border-border bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.18),transparent_35%),linear-gradient(135deg,hsl(var(--muted)),hsl(var(--surface)))] p-8 text-center"
        role="img"
      >
        <span className="font-heading text-3xl font-bold text-muted-foreground/70">
          {productName}
        </span>
      </div>

      {secondaryImages.length > 0 ? (
        <div className="grid grid-cols-3 gap-3">
          {secondaryImages.map((image) => (
            <div
              aria-label={image.alt}
              className="flex aspect-square items-center justify-center rounded-2xl border border-border bg-surface p-3 text-center text-xs font-semibold text-muted-foreground"
              key={image.id}
              role="img"
            >
              Imagen {image.position}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
