import {
  Wifi,
  UtensilsCrossed,
  WashingMachine,
  Wind,
  Car,
  Snowflake,
  Flame,
  Briefcase,
  Tv,
  Dumbbell,
  Waves,
  Dog,
  Cigarette,
  Coffee,
  ShowerHead,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  wifi: Wifi,
  kitchen: UtensilsCrossed,
  washer: WashingMachine,
  dryer: Wind,
  "free parking": Car,
  "paid parking": Car,
  "air conditioning": Snowflake,
  heating: Flame,
  workspace: Briefcase,
  tv: Tv,
  "hair dryer": Wind,
  iron: ShowerHead,
  pool: Waves,
  "hot tub": Waves,
  gym: Dumbbell,
  "bbq grill": Flame,
  breakfast: Coffee,
  fireplace: Flame,
  "smoking allowed": Cigarette,
  "pets allowed": Dog,
};

export function iconForAmenity(name: string): LucideIcon {
  return MAP[name.toLowerCase()] ?? Sparkles;
}
