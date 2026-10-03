import { Text as RNText, type TextProps } from "react-native";

type Props = TextProps & { className?: string };

// Defaults only apply when the caller didn't set that property, because two
// conflicting utilities (e.g. text-[15px] and text-2xl) don't resolve by class order.
const HAS_SIZE = /(^|\s)text-(xs|sm|base|lg|[2-9]?xl|\[\d)/;
const HAS_FONT = /(^|\s)font-(serif|serif-italic|sans|medium|semibold)(\s|$)/;
const HAS_COLOR = /(^|\s)text-(ink|muted|rose|rose-ink|gold|gold-ink|white|black|on-ink|red-\d+|emerald-\d+|\[#)/;

function withDefaults(className: string, size: string, font: string, color: string) {
  return [HAS_FONT.test(className) ? "" : font, HAS_SIZE.test(className) ? "" : size, HAS_COLOR.test(className) ? "" : color, className]
    .filter(Boolean)
    .join(" ");
}

/** Body text: Jost, ink colour. */
export function Text({ className = "", ...props }: Props) {
  return <RNText className={withDefaults(className, "text-[15px]", "font-sans", "text-ink")} {...props} />;
}

/** Display serif (Cormorant Garamond), like the website's headings. */
export function Heading({ className = "", ...props }: Props) {
  return <RNText className={withDefaults(className, "text-3xl leading-tight", "font-serif", "text-ink")} {...props} />;
}

/** Small spaced-out label ("NEW ARRIVALS"). */
export function Eyebrow({ className = "", ...props }: Props) {
  return <RNText className={withDefaults(className, "text-[11px]", "font-medium", "text-rose-ink") + " uppercase tracking-[2px]"} {...props} />;
}
