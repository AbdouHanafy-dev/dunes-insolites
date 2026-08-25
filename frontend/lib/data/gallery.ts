import type { GalleryItem } from "@/lib/types";

export const galleryItems: GalleryItem[] = [
  { src: "/images/hero-combined.jpg", alt: "Desert adventure scene", tag: "All", tall: true },
  { src: "/images/camel.jpg", alt: "Camel at sunset", tag: "Camel Trek" },
  { src: "/images/sandboard.jpg", alt: "Sandboarding", tag: "Sandboarding" },
  { src: "/images/quad.jpg", alt: "Quad riders", tag: "Quad Safari" },
  { src: "/images/gate.jpg", alt: "Desert gate", tag: "The Gate" },
];

/** The full-page gallery repeats the set with varied spans for a denser mosaic. */
export const fullGallery: GalleryItem[] = [
  { src: "/images/hero-combined.jpg", alt: "Camel, quads and sandboarding on one dune", tag: "All", tall: true },
  { src: "/images/camel.jpg", alt: "Camel trek at golden hour", tag: "Camel Trek" },
  { src: "/images/quad.jpg", alt: "Quad bikes crossing the sand sea", tag: "Quad Safari" },
  { src: "/images/gate.jpg", alt: "The lantern-lit Sabria gate", tag: "The Gate", tall: true },
  { src: "/images/sandboard.jpg", alt: "Sandboarder carving a dune face", tag: "Sandboarding" },
  { src: "/images/hero-combined.jpg", alt: "The sand sea at dusk", tag: "All" },
  { src: "/images/quad.jpg", alt: "Lead rider on the ridge", tag: "Quad Safari" },
  { src: "/images/camel.jpg", alt: "Caravan silhouetted against the sunset", tag: "Camel Trek", tall: true },
  { src: "/images/sandboard.jpg", alt: "Boards waxed and waiting", tag: "Sandboarding" },
  { src: "/images/gate.jpg", alt: "Lanterns at the gate after dark", tag: "The Gate" },
];

export const galleryTags = ["All", "Camel Trek", "Quad Safari", "Sandboarding", "The Gate"];
