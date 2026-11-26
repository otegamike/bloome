import "server-only";

import { Types } from "mongoose";

import { conflict, notFound, unprocessable } from "@/lib/apiErrors";
import { connectDB } from "@/lib/db";
import PillPackModel, { type PillPackDoc } from "@/models/PillPack";
import UserModel from "@/models/User";
import { addDays, compareDays, todayInTz } from "@/lib/shared/dates";
import type { PackCreateInput, PackUpdateInput } from "@/lib/shared/schemas";
import type { PackDTO, PackLike } from "@/types/api";

void PillPackModel;
void UserModel;

export function toPackDTO(doc: PillPackDoc): PackDTO {
  return {
    id: doc._id.toString(),
    name: doc.name,
    activeDays: doc.activeDays,
    placeboDays: doc.placeboDays,
    startDay: doc.startDay,
    isCurrent: doc.isCurrent,
  };
}

export function toPackLike(doc: PillPackDoc): PackLike {
  return {
    id: doc._id.toString(),
    name: doc.name,
    startDay: doc.startDay,
    activeDays: doc.activeDays,
    placeboDays: doc.placeboDays,
  };
}

async function userTimezone(userId: Types.ObjectId): Promise<string> {
  const user = await UserModel.findById(userId).select("timezone").lean();
  if (!user) throw notFound("Account not found");
  return user.timezone;
}

function checkStartDay(startDay: string, today: string): void {
  const latest = addDays(today, 30);
  if (compareDays(startDay, latest) > 0) {
    throw unprocessable("Pack start must be within 30 days after today");
  }
}

export async function listPacks(userId: string): Promise<PackDTO[]> {
  await connectDB();
  const id = new Types.ObjectId(userId);
  const packs = await PillPackModel.find({ userId: id }).sort({ startDay: -1 });
  return packs.map(toPackDTO);
}

export async function createPack(userId: string, input: PackCreateInput): Promise<PackDTO> {
  await connectDB();
  const id = new Types.ObjectId(userId);
  const today = todayInTz(await userTimezone(id));
  checkStartDay(input.startDay, today);
  const clash = await PillPackModel.findOne({ userId: id, startDay: input.startDay }).lean();
  if (clash) {
    throw conflict("A pack already starts on that day");
  }
  // No transaction (unsupported on lower Atlas tiers): unset first, then
  // create. The partial unique index guards the race.
  await PillPackModel.updateMany({ userId: id, isCurrent: true }, { isCurrent: false });
  const pack = await PillPackModel.create({ ...input, userId: id, isCurrent: true });
  return toPackDTO(pack);
}

export async function updatePack(
  userId: string,
  packId: Types.ObjectId,
  input: PackUpdateInput,
): Promise<PackDTO> {
  await connectDB();
  const id = new Types.ObjectId(userId);
  const pack = await PillPackModel.findOne({ _id: packId, userId: id });
  if (!pack) throw notFound("Pack not found");
  if (input.startDay !== undefined && input.startDay !== pack.startDay) {
    const today = todayInTz(await userTimezone(id));
    checkStartDay(input.startDay, today);
    const clash = await PillPackModel.findOne({ userId: id, startDay: input.startDay }).lean();
    if (clash) {
      throw conflict("A pack already starts on that day");
    }
    pack.startDay = input.startDay;
  }
  if (input.name !== undefined) pack.name = input.name;
  if (input.activeDays !== undefined) pack.activeDays = input.activeDays;
  if (input.placeboDays !== undefined) pack.placeboDays = input.placeboDays;
  await pack.save();
  return toPackDTO(pack);
}

export async function deletePack(userId: string, packId: Types.ObjectId): Promise<void> {
  await connectDB();
  const id = new Types.ObjectId(userId);
  const pack = await PillPackModel.findOne({ _id: packId, userId: id });
  if (!pack) throw notFound("Pack not found");
  const wasCurrent = pack.isCurrent;
  await pack.deleteOne();
  if (wasCurrent) {
    const next = await PillPackModel.findOne({ userId: id }).sort({ startDay: -1 });
    if (next) {
      next.isCurrent = true;
      await next.save();
    }
  }
}
