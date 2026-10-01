import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import {
  buildStalePendingApprovalBulkOps,
  pendingApprovalResolutionFields,
} from "@/lib/resolvePendingApprovalNotifications";

describe("buildStalePendingApprovalBulkOps", () => {
  const now = new Date("2026-10-01T10:00:00.000Z");

  it("batches updates only for COMPLETED/FAILED payments", () => {
    const completedId = new mongoose.Types.ObjectId();
    const failedId = new mongoose.Types.ObjectId();
    const pendingId = new mongoose.Types.ObjectId();
    const noteCompleted = new mongoose.Types.ObjectId();
    const noteFailed = new mongoose.Types.ObjectId();
    const noteStillPending = new mongoose.Types.ObjectId();

    const ops = buildStalePendingApprovalBulkOps(
      [
        {
          _id: noteCompleted,
          paymentId: String(completedId),
          amount: 100,
          currency: "USDT",
        },
        {
          _id: noteFailed,
          paymentId: String(failedId),
          amount: 50,
          currency: "USDT",
        },
        {
          _id: noteStillPending,
          paymentId: String(pendingId),
          amount: 25,
          currency: "USDT",
        },
      ],
      [
        { _id: completedId, status: "COMPLETED", amount: 100, currency: "USDT" },
        { _id: failedId, status: "FAILED", amount: 50, currency: "USDT" },
        { _id: pendingId, status: "PENDING", amount: 25, currency: "USDT" },
      ],
      now,
    );

    expect(ops).toHaveLength(2);
    expect(ops[0]).toEqual({
      updateOne: {
        filter: { _id: noteCompleted, type: "PAYMENT_PENDING_APPROVAL" },
        update: {
          $set: pendingApprovalResolutionFields(
            "APPROVED",
            100,
            "USDT",
            now,
          ),
        },
      },
    });
    expect(ops[1]).toEqual({
      updateOne: {
        filter: { _id: noteFailed, type: "PAYMENT_PENDING_APPROVAL" },
        update: {
          $set: pendingApprovalResolutionFields("REJECTED", 50, "USDT", now),
        },
      },
    });
  });

  it("skips missing payments and invalid paymentIds", () => {
    const ops = buildStalePendingApprovalBulkOps(
      [
        { _id: new mongoose.Types.ObjectId(), paymentId: "not-an-id" },
        { _id: new mongoose.Types.ObjectId(), paymentId: null },
        {
          _id: new mongoose.Types.ObjectId(),
          paymentId: String(new mongoose.Types.ObjectId()),
        },
      ],
      [],
      now,
    );

    expect(ops).toHaveLength(0);
  });

  it("falls back to notification amount/currency when payment lacks them", () => {
    const paymentId = new mongoose.Types.ObjectId();
    const noteId = new mongoose.Types.ObjectId();

    const ops = buildStalePendingApprovalBulkOps(
      [
        {
          _id: noteId,
          paymentId: String(paymentId),
          amount: 77,
          currency: "USD",
        },
      ],
      [{ _id: paymentId, status: "COMPLETED" }],
      now,
    );

    expect(ops).toHaveLength(1);
    expect(ops[0]).toMatchObject({
      updateOne: {
        update: {
          $set: pendingApprovalResolutionFields("APPROVED", 77, "USD", now),
        },
      },
    });
  });
});
