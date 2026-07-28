import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import mongoose from "mongoose";
import { connectMongoDB } from "@/libs/dbConfig";
import Reminder from "@/models/Reminder";
import { publishReminderDueEvent } from "@/libs/ablyServer";
import { isReminderDue } from "@/lib/reminderDueAt";

const BATCH_SIZE = 50;
/** Cap work per cron tick so Netlify functions stay within time limits. */
const MAX_BATCHES_PER_PATH = 10;
/**
 * Claim lease TTL. Longer than a typical function run; shorter than a few
 * cron intervals so a crashed worker's claims become reclaimable.
 */
const DISPATCH_LEASE_MS = 2 * 60 * 1000;

type ReminderLean = {
  _id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  reminderDate: Date;
  reminderTime: string;
  dueAt?: Date;
  timezone?: string;
  type: "CALL" | "EMAIL" | "TASK" | "MEETING";
  status: "PENDING" | "COMPLETED" | "SNOOZED" | "DISMISSED";
  leadId:
    | mongoose.Types.ObjectId
    | {
        _id: mongoose.Types.ObjectId;
        firstName?: string;
        lastName?: string;
        email?: string;
      };
  assignedTo:
    | mongoose.Types.ObjectId
    | { _id: mongoose.Types.ObjectId; firstName?: string; lastName?: string };
  adminId: mongoose.Types.ObjectId;
  snoozedUntil?: Date;
  soundEnabled: boolean;
  notificationSent?: boolean;
  dispatchClaimedAt?: Date;
  dispatchClaimId?: string;
};

const REMINDER_SELECT =
  "_id title description reminderDate reminderTime dueAt timezone type status leadId assignedTo adminId snoozedUntil soundEnabled notificationSent dispatchClaimedAt dispatchClaimId";

type ClaimKind = "pending_due" | "pending_legacy" | "snoozed";

function resolveObjectId(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "object" && value !== null && "_id" in value) {
    const nested = (value as { _id?: mongoose.Types.ObjectId })._id;
    return nested ? String(nested) : null;
  }
  return String(value);
}

/** Unclaimed, or lease expired (crash / timeout after claim). */
function leaseAvailableClause(
  leaseExpiredBefore: Date,
): Record<string, unknown> {
  return {
    $or: [
      { dispatchClaimedAt: { $exists: false } },
      { dispatchClaimedAt: null },
      { dispatchClaimedAt: { $lte: leaseExpiredBefore } },
    ],
  };
}

function claimDuePredicate(
  kind: ClaimKind,
  now: Date,
): Record<string, unknown> {
  if (kind === "pending_due") {
    return { dueAt: { $lte: now } };
  }
  if (kind === "snoozed") {
    return { snoozedUntil: { $lte: now } };
  }
  // Legacy: no dueAt — due-ness re-checked in memory after claim
  return {
    $or: [{ dueAt: { $exists: false } }, { dueAt: null }],
  };
}

/**
 * Atomically claim with fresh due/snooze predicates + lease timestamp.
 * Claim clock is generated per attempt so a long run cannot write an
 * already-expired dispatchClaimedAt.
 */
async function claimReminderForDispatch(
  id: mongoose.Types.ObjectId,
  kind: ClaimKind,
  claimId: string,
): Promise<ReminderLean | null> {
  const claimAt = new Date();
  const leaseExpiredBefore = new Date(claimAt.getTime() - DISPATCH_LEASE_MS);
  const expectedStatus = kind === "snoozed" ? "SNOOZED" : "PENDING";
  const duePredicate = claimDuePredicate(kind, claimAt);

  const claimed = (await Reminder.findOneAndUpdate(
    {
      _id: id,
      status: expectedStatus,
      notificationSent: false,
      $and: [duePredicate, leaseAvailableClause(leaseExpiredBefore)],
    },
    {
      $set: {
        dispatchClaimedAt: claimAt,
        dispatchClaimId: claimId,
      },
    },
    { new: true },
  )
    .select(REMINDER_SELECT)
    .populate("leadId", "firstName lastName email")
    .populate("assignedTo", "firstName lastName")
    .lean()) as ReminderLean | null;

  return claimed;
}

async function releaseClaim(
  id: mongoose.Types.ObjectId,
  claimId: string,
): Promise<void> {
  await Reminder.updateOne(
    {
      _id: id,
      notificationSent: false,
      dispatchClaimId: claimId,
    },
    {
      $unset: { dispatchClaimedAt: 1, dispatchClaimId: 1 },
    },
  );
}

async function finalizeSuccessfulDispatch(
  id: mongoose.Types.ObjectId,
  claimId: string,
): Promise<void> {
  await Reminder.updateOne(
    {
      _id: id,
      dispatchClaimId: claimId,
      notificationSent: false,
    },
    {
      $set: { notificationSent: true },
      $unset: { dispatchClaimedAt: 1, dispatchClaimId: 1 },
    },
  );
}

async function publishClaimedReminder(
  reminder: ReminderLean,
  claimId: string,
): Promise<boolean> {
  const adminId = resolveObjectId(reminder.adminId);
  const assignedToId = resolveObjectId(reminder.assignedTo);
  const leadObjRaw =
    typeof reminder.leadId === "object" &&
    reminder.leadId !== null &&
    "_id" in reminder.leadId
      ? reminder.leadId
      : null;
  const leadObj = leadObjRaw as
    | {
        _id: mongoose.Types.ObjectId;
        firstName?: string;
        lastName?: string;
        email?: string;
      }
    | null;

  if (!adminId || !assignedToId) {
    await releaseClaim(reminder._id, claimId);
    return false;
  }

  try {
    await publishReminderDueEvent(adminId, assignedToId, {
      reminderId: String(reminder._id),
      title: reminder.title,
      description: reminder.description ?? "",
      type: reminder.type,
      reminderTime: reminder.reminderTime,
      reminderDate: reminder.reminderDate,
      soundEnabled: reminder.soundEnabled ?? true,
      lead: leadObj
        ? {
            _id: String(leadObj._id),
            firstName: leadObj.firstName ?? "",
            lastName: leadObj.lastName ?? "",
            email: leadObj.email ?? "",
          }
        : null,
    });
    await finalizeSuccessfulDispatch(reminder._id, claimId);
    return true;
  } catch (error) {
    console.error(
      "Ably publish failed for reminder; releasing claim:",
      reminder._id,
      error,
    );
    await releaseClaim(reminder._id, claimId);
    return false;
  }
}

async function processIdBatch(
  ids: mongoose.Types.ObjectId[],
  kind: ClaimKind,
  claimId: string,
): Promise<number> {
  let sent = 0;
  for (const id of ids) {
    const claimed = await claimReminderForDispatch(id, kind, claimId);
    if (!claimed) continue;

    // Legacy rows: re-validate due-ness after claim with current time
    if (kind === "pending_legacy") {
      const stillDue = isReminderDue(
        {
          status: claimed.status,
          dueAt: claimed.dueAt,
          reminderDate: claimed.reminderDate,
          reminderTime: claimed.reminderTime,
          snoozedUntil: claimed.snoozedUntil,
          timezone: claimed.timezone,
        },
        new Date(),
      );
      if (!stillDue) {
        await releaseClaim(claimed._id, claimId);
        continue;
      }
    }

    if (await publishClaimedReminder(claimed, claimId)) {
      sent += 1;
    }
  }
  return sent;
}

async function drainPath(options: {
  kind: ClaimKind;
  claimId: string;
  buildFilter: (now: Date, leaseExpiredBefore: Date) => Record<string, unknown>;
  sort: Record<string, 1 | -1>;
}): Promise<{ scanned: number; sent: number; batches: number }> {
  let scanned = 0;
  let sent = 0;
  let batches = 0;

  while (batches < MAX_BATCHES_PER_PATH) {
    const now = new Date();
    const leaseExpiredBefore = new Date(now.getTime() - DISPATCH_LEASE_MS);
    const rows = (await Reminder.find(
      options.buildFilter(now, leaseExpiredBefore),
    )
      .select("_id")
      .sort(options.sort)
      .limit(BATCH_SIZE)
      .lean()) as unknown as Array<{ _id: mongoose.Types.ObjectId }>;

    if (rows.length === 0) break;
    batches += 1;
    scanned += rows.length;

    sent += await processIdBatch(
      rows.map((r) => r._id),
      options.kind,
      options.claimId,
    );

    if (rows.length < BATCH_SIZE) break;
  }

  return { scanned, sent, batches };
}

async function drainLegacyPendingWithoutDueAt(
  claimId: string,
): Promise<{ scanned: number; sent: number; batches: number }> {
  const limit = BATCH_SIZE * MAX_BATCHES_PER_PATH;
  const now = new Date();
  const leaseExpiredBefore = new Date(now.getTime() - DISPATCH_LEASE_MS);
  const rows = (await Reminder.find({
    status: "PENDING",
    notificationSent: false,
    $and: [
      { $or: [{ dueAt: { $exists: false } }, { dueAt: null }] },
      leaseAvailableClause(leaseExpiredBefore),
    ],
  })
    .select(REMINDER_SELECT)
    .sort({ reminderDate: 1, reminderTime: 1 })
    .limit(limit)
    .lean()) as unknown as ReminderLean[];

  if (rows.length === 0) {
    return { scanned: 0, sent: 0, batches: 0 };
  }

  const eligibleIds = rows
    .filter((row) =>
      isReminderDue(
        {
          status: row.status,
          dueAt: row.dueAt,
          reminderDate: row.reminderDate,
          reminderTime: row.reminderTime,
          snoozedUntil: row.snoozedUntil,
          timezone: row.timezone,
        },
        now,
      ),
    )
    .map((r) => r._id);

  const sent =
    eligibleIds.length > 0
      ? await processIdBatch(eligibleIds, "pending_legacy", claimId)
      : 0;

  return {
    scanned: rows.length,
    sent,
    batches: 1,
  };
}

export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json(
        { error: "CRON_SECRET is not configured" },
        { status: 500 },
      );
    }

    const authHeader = request.headers.get("authorization");
    const headerSecret = request.headers.get("x-cron-secret");
    const isAuthorized =
      authHeader === `Bearer ${cronSecret}` || headerSecret === cronSecret;
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongoDB();
    const claimId = crypto.randomUUID();

    // 1) PENDING with dueAt set and due
    const pendingDue = await drainPath({
      kind: "pending_due",
      claimId,
      sort: { dueAt: 1 },
      buildFilter: (now, leaseExpiredBefore) => ({
        status: "PENDING",
        notificationSent: false,
        dueAt: { $lte: now },
        ...leaseAvailableClause(leaseExpiredBefore),
      }),
    });

    // 2) Legacy PENDING without dueAt
    const pendingLegacy = await drainLegacyPendingWithoutDueAt(claimId);

    // 3) SNOOZED whose snooze window has ended
    const snoozedDue = await drainPath({
      kind: "snoozed",
      claimId,
      sort: { snoozedUntil: 1 },
      buildFilter: (now, leaseExpiredBefore) => ({
        status: "SNOOZED",
        notificationSent: false,
        snoozedUntil: { $lte: now },
        ...leaseAvailableClause(leaseExpiredBefore),
      }),
    });

    const scanned =
      pendingDue.scanned + pendingLegacy.scanned + snoozedDue.scanned;
    const sent = pendingDue.sent + pendingLegacy.sent + snoozedDue.sent;

    return NextResponse.json({
      ok: true,
      scanned,
      sent,
      claimId,
      leaseMs: DISPATCH_LEASE_MS,
      // At-least-once: Ably may deliver twice if finalize dies after publish.
      delivery: "at-least-once",
      paths: {
        pendingDue,
        pendingLegacy,
        snoozedDue,
      },
    });
  } catch (error) {
    console.error("Error running reminders dispatcher:", error);
    return NextResponse.json(
      { error: "Failed to run reminders dispatcher" },
      { status: 500 },
    );
  }
}
