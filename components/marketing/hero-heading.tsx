"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { Typography } from "../ui/typography";

export function HeroHeading() {
  const t = useTranslations("landingpage");
  return (
    <header className="text-6xl md:text-5xl font-bold mb-6 leading-tight">
      <div className="flex items-center justify-center gap-4 mb-2">
        <div className="relative w-20 lg:w-24 aspect-video">
          <Image
            src="/logos/lifo-logo-icon.svg"
            alt="LIFO AI Logo"
            fill
            className="h-full w-full object-contain"
            priority
            sizes="(max-width: 768px) 80px, 96px"
          />
        </div>
        <Typography
          as="h1"
          className="text-5xl md:text-7xl py-6 bg-clip-text text-transparent bg-gradient-to-r from-violet-700 via-purple-500 via-indigo-400 to-blue-600"
        >
          LIFO.AI
        </Typography>
      </div>
      <Typography as="h2" className="text-4xl md:text-6xl text-foreground/80">
        {t("hero.title", {
          fallback: "The Future of Inventory Management is Here.",
        })}{" "}
      </Typography>
    </header>
  );
}
