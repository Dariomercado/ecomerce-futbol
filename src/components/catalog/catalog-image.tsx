"use client";

import Image from "next/image";
import { useState } from "react";

type CatalogImageProps = {
  alt: string;
  className?: string;
  fallbackLabel?: string;
  priority?: boolean;
  sizes: string;
  src: string | null | undefined;
};

function isLocalCatalogAsset(src: string | null | undefined): src is string {
  return typeof src === "string" && src.startsWith("/catalog/");
}

export function CatalogImage({
  alt,
  className = "object-cover",
  fallbackLabel = alt,
  priority = false,
  sizes,
  src,
}: CatalogImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!isLocalCatalogAsset(src) || hasError) {
    return (
      <div
        aria-label={alt}
        className="flex size-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.18),transparent_35%),linear-gradient(135deg,hsl(var(--muted)),hsl(var(--surface)))] text-center"
        role="img"
      >
        <span className="px-6 font-heading text-lg font-bold text-muted-foreground/70">
          {fallbackLabel}
        </span>
      </div>
    );
  }

  return (
    <Image
      alt={alt}
      className={className}
      fill
      onError={() => setHasError(true)}
      priority={priority}
      sizes={sizes}
      src={src}
    />
  );
}
