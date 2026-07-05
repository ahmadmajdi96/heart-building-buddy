// Lightweight motion shim used on marketing pages to keep the API surface
// of framer-motion (motion.div/section/... with initial/animate/whileInView/
// variants/transition props) while rendering plain DOM elements without any
// runtime animation cost. Massive landing-page perf win.
import React, { forwardRef } from "react";

const FRAMER_PROPS = new Set([
  "initial", "animate", "exit", "transition", "variants",
  "whileInView", "whileHover", "whileTap", "whileFocus", "whileDrag",
  "viewport", "layout", "layoutId", "drag", "dragConstraints",
  "onAnimationStart", "onAnimationComplete", "onViewportEnter", "onViewportLeave",
  "custom",
]);

function strip(props: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const k in props) if (!FRAMER_PROPS.has(k)) out[k] = props[k];
  return out;
}

type AnyProps = React.HTMLAttributes<HTMLElement> & Record<string, any>;

const factory = new Proxy(
  {},
  {
    get: (_t, tag: string) => {
      const Comp = forwardRef<HTMLElement, AnyProps>((props, ref) =>
        React.createElement(tag as any, { ...strip(props), ref }),
      );
      Comp.displayName = `m.${tag}`;
      return Comp;
    },
  },
) as any;

export const motion: any = factory;
export const m: any = factory;
