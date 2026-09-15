import { CatalogImage } from "@/components/catalog/catalog-image";
import type { ProductImageDto } from "@/lib/catalog/public-contracts";

type ProductGalleryProps = {
  images: ProductImageDto[];
  productName: string;
};

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [primaryImage, ...secondaryImages] = [...images].sort(
    (left, right) =>
      Number(right.isPrimary) - Number(left.isPrimary) ||
      left.position - right.position,
  );

  return (
    <div className="space-y-4">
      <div className="relative aspect-square overflow-hidden rounded-[2rem] border border-border bg-surface">
        <CatalogImage
          alt={primaryImage?.alt ?? productName}
          className="object-cover"
          fallbackLabel={productName}
          priority
          sizes="(min-width: 1024px) 45vw, 100vw"
          src={primaryImage?.url}
        />
      </div>

      {secondaryImages.length > 0 ? (
        <div className="grid grid-cols-3 gap-3">
          {secondaryImages.map((image) => (
            <div
              className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-surface"
              key={image.id}
            >
              <CatalogImage
                alt={image.alt}
                className="object-cover"
                fallbackLabel={`Imagen ${image.position}`}
                sizes="(min-width: 1024px) 15vw, 30vw"
                src={image.url}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
