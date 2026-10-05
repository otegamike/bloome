import type { DayString } from "@/types";

// Plain shared shape for a pill pack (string ids). The Mongoose model
// derives from this with ObjectId forms.

export interface SharedPack {
  id: string;
  userId: string;
  name: string;
  activeDays: number;
  placeboDays: number;
  startDay: DayString;
  isCurrent: boolean;
}
