import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const defaults = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function ArrowRightIcon(props: IconProps) {
  return <svg {...defaults} {...props}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}

export function BookIcon(props: IconProps) {
  return <svg {...defaults} {...props}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13Z" /><path d="M4 19.5V6.5M8 8h8" /></svg>;
}

export function CheckIcon(props: IconProps) {
  return <svg {...defaults} {...props}><path d="m5 12 4 4L19 6" /></svg>;
}

export function ClockIcon(props: IconProps) {
  return <svg {...defaults} {...props}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
}

export function ChartIcon(props: IconProps) {
  return <svg {...defaults} {...props}><path d="M4 19V9M10 19V5M16 19v-7M22 19V3" /></svg>;
}

export function MenuIcon(props: IconProps) {
  return <svg {...defaults} {...props}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
}

export function SparkIcon(props: IconProps) {
  return <svg {...defaults} {...props}><path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4L12 3Z" /><path d="m18.5 14 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" /></svg>;
}

export function TargetIcon(props: IconProps) {
  return <svg {...defaults} {...props}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></svg>;
}

export function HomeIcon(props: IconProps) {
  return <svg {...defaults} {...props}><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></svg>;
}

export function LayersIcon(props: IconProps) {
  return <svg {...defaults} {...props}><path d="m12 3-9 5 9 5 9-5-9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></svg>;
}

export function PencilIcon(props: IconProps) {
  return <svg {...defaults} {...props}><path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" /><path d="m14 7 3 3M5.5 16.5l3 3" /></svg>;
}

export function AwardIcon(props: IconProps) {
  return <svg {...defaults} {...props}><circle cx="12" cy="8" r="5" /><path d="M8.5 12 7 21l5-3 5 3-1.5-9" /><path d="m10 8 1.2 1.2L14 6.5" /></svg>;
}

export function UserIcon(props: IconProps) {
  return <svg {...defaults} {...props}><circle cx="12" cy="8" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></svg>;
}
