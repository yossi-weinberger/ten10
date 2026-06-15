import { memo, useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  ChromaFlow,
  FilmGrain,
  FlutedGlass,
  Shader,
  Swirl,
} from "shaders/react";
import { HeroCssFallbackBackground } from "./HeroCssFallbackBackground";

function canUseWebGL(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}

const bottomFade =
  "absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#EFEFEF] to-transparent dark:from-background";
const overlayRadial =
  "bg-[radial-gradient(circle_at_50%_38%,rgba(255,255,255,0.82)_0%,rgba(255,255,255,0.35)_42%,transparent_72%)] dark:bg-[radial-gradient(circle_at_50%_38%,rgba(15,23,42,0.72)_0%,rgba(15,23,42,0.28)_42%,transparent_72%)]";
const overlayVertical =
  "bg-gradient-to-b from-white/45 via-white/15 to-transparent dark:from-background/55 dark:via-background/20";

export const HeroShaderBackground = memo(function HeroShaderBackground() {
  const reduceMotion = useReducedMotion();
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    setSupported(!reduceMotion && canUseWebGL());
  }, [reduceMotion]);

  if (supported === null || !supported) {
    return <HeroCssFallbackBackground />;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      <Shader className="h-full w-full">
        <Swirl colorA="#ffffff" colorB="#f0f0f0" detail={1.7} />
        <ChromaFlow
          baseColor="#ffffff"
          downColor="#11676a"
          leftColor="#ffd21f"
          rightColor="#11676a"
          upColor="#ffd21f"
          intensity={1}
          momentum={13}
          radius={3.5}
        />
        <FlutedGlass
          shape="rounded"
          angle={31}
          frequency={8}
          softness={1}
          refraction={4}
          aberration={0.61}
          highlight={0.12}
          highlightSoftness={0}
          lightAngle={-90}
          speed={0.15}
        />
        <FilmGrain strength={0.05} />
      </Shader>

      <div className={`absolute inset-0 ${overlayRadial}`} />
      <div className={`absolute inset-0 ${overlayVertical}`} />
      <div className={bottomFade} />
    </div>
  );
});
