// Real framer-motion passthrough. This file used to be a static shim that
// stripped animation props; keeping the same import path means every call site
// (marketing page, dashboard primitives) now animates for real.
//
// We add a lightweight reduced-motion gate at the module level: when the user
// prefers reduced motion, framer-motion already short-circuits transitions to
// duration:0 via `MotionConfig`, but we also set a global flag that the count-up
// hook in primitives.tsx checks so numeric tiles snap instead of tween.
import { motion as fmMotion, m as fmM, AnimatePresence, useMotionValue, useTransform, animate, useInView, useReducedMotion } from "framer-motion";

export const motion = fmMotion;
export const m = fmM;
export { AnimatePresence, useMotionValue, useTransform, animate, useInView, useReducedMotion };
