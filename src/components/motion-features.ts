/**
 * Motion's DOM animation feature set, alone in its own module.
 *
 * This file exists purely to give the bundler something to split on. Importing
 * `domAnimation` directly into the provider — even to hand it to `LazyMotion` —
 * leaves it in the first chunk, and the whole point is to keep it out of it.
 */
export { domAnimation } from "motion/react";
