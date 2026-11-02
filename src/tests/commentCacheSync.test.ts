import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { patchLeadListCachesFromComments } from "@/lib/commentCacheSync";
import type { Lead } from "@/types/leads";
import type { Comment } from "@/components/leads/leadDetailsPanel/commentsAndActivities/types";

function leadStub(partial: Partial<Lead> & { _id: string }): Lead {
  return {
    firstName: "A",
    lastName: "B",
    email: "a@b.c",
    source: "Manual",
    status: "NEW",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("patchLeadListCachesFromComments", () => {
  it("updates comment fields and re-sorts the cached page", () => {
    const queryClient = new QueryClient();
    const key = [
      "leads",
      1,
      80,
      "all",
      ["Australia"],
      [],
      [],
      "include",
      "exclude",
      "include",
      "include",
      "",
      "lastActivityAt",
      "desc",
    ] as const;

    queryClient.setQueryData(key, {
      leads: [
        leadStub({
          _id: "lead-stay",
          lastActivityAt: "2024-05-01T00:00:00.000Z",
        }),
        leadStub({
          _id: "lead-commented",
          lastActivityAt: "2024-01-01T00:00:00.000Z",
        }),
      ],
      total: 2,
      totalAll: 2,
    });

    const comments: Comment[] = [
      {
        _id: "c1",
        content: "fresh note",
        createdAt: "2024-06-01T12:00:00.000Z",
        createdBy: { _id: "u1", firstName: "Ada", lastName: "Lovelace" },
      },
    ];

    patchLeadListCachesFromComments(queryClient, "lead-commented", comments);

    const next = queryClient.getQueryData<{ leads: Lead[] }>(key);
    expect(next?.leads.map((l) => l._id)).toEqual([
      "lead-commented",
      "lead-stay",
    ]);
    expect(next?.leads[0]?.lastComment).toBe("fresh note");
    expect(next?.leads[0]?.lastCommentDate).toBe("2024-06-01T12:00:00.000Z");
    expect(next?.leads[0]?.lastActivityAt).toBe("2024-06-01T12:00:00.000Z");
  });
});
