import { BenefitsSection } from "@/components/home/benefits-section";
import { BrandStatement } from "@/components/home/brand-statement";
import { FeaturedCategories } from "@/components/home/featured-categories";
import { FeaturedProducts } from "@/components/home/featured-products";
import { HomeHero } from "@/components/home/home-hero";
import { NewsletterSection } from "@/components/home/newsletter-section";

export default function Home() {
  return (
    <main>
      <HomeHero />
      <FeaturedCategories />
      <FeaturedProducts />
      <BrandStatement />
      <BenefitsSection />
      <NewsletterSection />
    </main>
  );
}
