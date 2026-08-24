import { useEffect, useState } from "react";

const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=900",
  "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=900",
  "https://images.unsplash.com/photo-1512428813834-c702c7702b78?w=900",
  "https://images.unsplash.com/photo-1466781783364-36c955e42a7f?w=900",
];

const SLIDE_INTERVAL_MS = 4000;

export default function HeroImageSlider({ alt }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      {HERO_IMAGES.map((src, index) => (
        <img
          key={src}
          src={src}
          alt={alt}
          className={index === activeIndex ? "is-active" : undefined}
        />
      ))}
    </>
  );
}
