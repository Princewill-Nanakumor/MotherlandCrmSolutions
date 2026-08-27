/**
 * @vitest-environment jsdom
 */
import React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { Reminder } from "@/types/leads";
import Reminders from "@/components/leads/leadDetailsPanel/Reminders";
import ReminderForm from "@/components/leads/leadDetailsPanel/ReminderForm";
import ReminderCard from "@/components/leads/leadDetailsPanel/ReminderCard";
import RemindersList from "@/components/leads/leadDetailsPanel/RemindersList";
import RemindersTab from "@/components/leads/leadDetailsPanel/RemindersTab";
import { formatLocalDateYmd } from "@/lib/reminderDueAt";

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: {
      user: { id: "user-1", role: "ADMIN", firstName: "Ada", lastName: "Lovelace" },
    },
    status: "authenticated",
  }),
}));

vi.mock("@/lib/notificationSound", () => ({
  stopNotificationSound: vi.fn(),
  alarmSound: { start: vi.fn(), stop: vi.fn() },
}));

const toastMock = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

const apiCallMock = vi.fn();
vi.mock("@/lib/apiUtils", () => ({
  apiCallWithSessionRefresh: (...args: unknown[]) => apiCallMock(...args),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = () => {};
  HTMLElement.prototype.releasePointerCapture = () => {};
  HTMLElement.prototype.scrollIntoView = () => {};
});

function makeReminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    _id: "rem-1",
    title: "Follow-up call",
    description: "Ask about budget",
    reminderDate: "2026-08-25T00:00:00.000Z",
    reminderTime: "14:30",
    type: "CALL",
    status: "PENDING",
    leadId: "lead-1",
    createdBy: { _id: "user-1", firstName: "Ada", lastName: "Lovelace" },
    assignedTo: { _id: "user-1", firstName: "Ada", lastName: "Lovelace" },
    adminId: "admin-1",
    notificationSent: false,
    soundEnabled: true,
    createdAt: "2026-08-24T10:00:00.000Z",
    updatedAt: "2026-08-24T10:00:00.000Z",
    timezone: "UTC",
    dueAt: "2026-08-25T14:30:00.000Z",
    ...overrides,
  };
}

const emptyForm = {
  title: "",
  description: "",
  reminderDate: "2026-08-25",
  reminderTime: "09:00",
  type: "" as const,
  soundEnabled: true,
};

function reminderHandlers() {
  return {
    onAddReminder: vi.fn(),
    onUpdateReminder: vi.fn(),
    onDeleteReminder: vi.fn(),
    onCompleteReminder: vi.fn(),
    onSnoozeReminder: vi.fn(),
  };
}

describe("ReminderForm", () => {
  it("keeps Create Reminder disabled until title and type are set", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const setFormData = vi.fn();

    const { rerender } = render(
      <ReminderForm
        editingId={null}
        formData={emptyForm}
        setFormData={setFormData}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        isSaving={false}
      />,
    );

    const createBtn = screen.getByRole("button", { name: /create reminder/i });
    expect(createBtn).toBeDisabled();

    rerender(
      <ReminderForm
        editingId={null}
        formData={{ ...emptyForm, title: "Call back", type: "CALL" }}
        setFormData={setFormData}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        isSaving={false}
      />,
    );

    expect(screen.getByRole("button", { name: /create reminder/i })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: /create reminder/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("shows Update Reminder when editing", () => {
    render(
      <ReminderForm
        editingId="rem-1"
        formData={{ ...emptyForm, title: "Call back", type: "CALL" }}
        setFormData={vi.fn()}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        isSaving={false}
      />,
    );

    expect(screen.getByText("Edit Reminder")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /update reminder/i }),
    ).toBeInTheDocument();
  });

  it("toggles notification sound", async () => {
    const user = userEvent.setup();
    const setFormData = vi.fn();

    render(
      <ReminderForm
        editingId={null}
        formData={emptyForm}
        setFormData={setFormData}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        isSaving={false}
      />,
    );

    await user.click(screen.getByText("Notification Sound").closest("div")!
      .parentElement!.querySelector("button")!);

    expect(setFormData).toHaveBeenCalledWith({
      ...emptyForm,
      soundEnabled: false,
    });
  });
});

describe("ReminderCard", () => {
  it("renders reminder details and action handlers", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const onEdit = vi.fn();
    const onToggleSound = vi.fn();
    const onSnooze = vi.fn();
    const onDelete = vi.fn();
    const reminder = makeReminder();

    render(
      <ReminderCard
        reminder={reminder}
        onComplete={onComplete}
        onEdit={onEdit}
        onToggleSound={onToggleSound}
        onSnooze={onSnooze}
        onDelete={onDelete}
      />,
    );

    expect(screen.getByText("Follow-up call")).toBeInTheDocument();
    expect(screen.getByText("Ask about budget")).toBeInTheDocument();
    expect(screen.getByText("CALL")).toBeInTheDocument();
    expect(screen.getByText(/Created by Ada Lovelace/)).toBeInTheDocument();

    await user.click(screen.getByTitle("Mark as complete"));
    expect(onComplete).toHaveBeenCalledWith("rem-1");

    await user.click(screen.getByTitle("Edit reminder"));
    expect(onEdit).toHaveBeenCalledWith(reminder);

    await user.click(screen.getByTitle("Mute sound"));
    expect(onToggleSound).toHaveBeenCalledWith("rem-1", true);
  });

  it("snoozes and deletes from the overflow menu", async () => {
    const user = userEvent.setup();
    const onSnooze = vi.fn();
    const onDelete = vi.fn();

    render(
      <ReminderCard
        reminder={makeReminder()}
        onComplete={vi.fn()}
        onEdit={vi.fn()}
        onToggleSound={vi.fn()}
        onSnooze={onSnooze}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getAllByRole("button").at(-1)!);
    await user.click(await screen.findByText("Snooze 15 min"));
    expect(onSnooze).toHaveBeenCalledWith("rem-1", 15);

    await user.click(screen.getAllByRole("button").at(-1)!);
    await user.click(await screen.findByText("Delete"));
    expect(onDelete).toHaveBeenCalledWith("rem-1");
  });

  it("shows a spinner on the card while deleting", () => {
    render(
      <ReminderCard
        reminder={makeReminder()}
        onComplete={vi.fn()}
        onEdit={vi.fn()}
        onToggleSound={vi.fn()}
        onSnooze={vi.fn()}
        onDelete={vi.fn()}
        isDeleting
      />,
    );

    expect(screen.getByTitle("Deleting reminder")).toBeInTheDocument();
  });

  it("shows a spinner on the complete button while completing", () => {
    render(
      <ReminderCard
        reminder={makeReminder()}
        onComplete={vi.fn()}
        onEdit={vi.fn()}
        onToggleSound={vi.fn()}
        onSnooze={vi.fn()}
        onDelete={vi.fn()}
        isCompleting
      />,
    );

    expect(screen.getByTitle("Marking as complete")).toBeInTheDocument();
    expect(screen.queryByTitle("Mark as complete")).not.toBeInTheDocument();
  });
});

describe("RemindersList", () => {
  it("shows empty state when there are no reminders", () => {
    render(
      <RemindersList
        reminders={[]}
        isLoading={false}
        onCompleteReminder={vi.fn()}
        onEditReminder={vi.fn()}
        onToggleSound={vi.fn()}
        onSnoozeReminder={vi.fn()}
        onDeleteReminder={vi.fn()}
      />,
    );

    expect(screen.getByText("No Reminders Set")).toBeInTheDocument();
  });

  it("shows a create skeleton instead of empty state while creating", () => {
    render(
      <RemindersList
        reminders={[]}
        isLoading={false}
        isCreating
        onCompleteReminder={vi.fn()}
        onEditReminder={vi.fn()}
        onToggleSound={vi.fn()}
        onSnoozeReminder={vi.fn()}
        onDeleteReminder={vi.fn()}
      />,
    );

    expect(screen.queryByText("No Reminders Set")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Creating reminder")).toBeInTheDocument();
    expect(screen.getByText("Upcoming")).toBeInTheDocument();
  });

  it("splits pending and completed reminders", () => {
    render(
      <RemindersList
        reminders={[
          makeReminder(),
          makeReminder({
            _id: "rem-2",
            title: "Done task",
            status: "COMPLETED",
            completedAt: "2026-08-24T12:00:00.000Z",
          }),
        ]}
        isLoading={false}
        onCompleteReminder={vi.fn()}
        onEditReminder={vi.fn()}
        onToggleSound={vi.fn()}
        onSnoozeReminder={vi.fn()}
        onDeleteReminder={vi.fn()}
      />,
    );

    expect(screen.getByText("Upcoming")).toBeInTheDocument();
    expect(screen.getByText("Follow-up call")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Done task")).toBeInTheDocument();
  });
});

describe("Reminders create flow", () => {
  it("creates a reminder from the form", async () => {
    const user = userEvent.setup();
    const handlers = reminderHandlers();

    render(
      <Reminders
        reminders={[]}
        isLoading={false}
        leadId="lead-1"
        isSaving={false}
        {...handlers}
      />,
    );

    expect(screen.getByText("No Reminders Set")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /add reminder/i }));
    expect(screen.getByText("New Reminder")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create reminder/i })).toBeDisabled();

    await user.type(
      screen.getByPlaceholderText("e.g., Call for follow-up"),
      "Call the client",
    );
    await user.type(
      screen.getByPlaceholderText("Additional details..."),
      "Confirm next meeting",
    );
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Call" }));

    await user.click(screen.getByRole("button", { name: /create reminder/i }));

    expect(handlers.onAddReminder).toHaveBeenCalledTimes(1);
    expect(handlers.onAddReminder).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Call the client",
        description: "Confirm next meeting",
        type: "CALL",
        soundEnabled: true,
        reminderDate: formatLocalDateYmd(),
        timezone: expect.any(String),
      }),
    );
    expect(screen.queryByText("No Reminders Set")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Creating reminder")).toBeInTheDocument();
  });

  it("opens edit form from an existing reminder", async () => {
    const user = userEvent.setup();
    const handlers = reminderHandlers();

    render(
      <Reminders
        reminders={[makeReminder()]}
        isLoading={false}
        leadId="lead-1"
        isSaving={false}
        {...handlers}
      />,
    );

    await user.click(screen.getByTitle("Edit reminder"));
    expect(screen.getByText("Edit Reminder")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Follow-up call")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /update reminder/i }));
    expect(handlers.onUpdateReminder).toHaveBeenCalledWith(
      "rem-1",
      expect.objectContaining({
        title: "Follow-up call",
        type: "CALL",
      }),
    );
  });

  it("asks for confirmation before deleting a reminder", async () => {
    const user = userEvent.setup();
    const handlers = reminderHandlers();

    render(
      <Reminders
        reminders={[makeReminder()]}
        isLoading={false}
        leadId="lead-1"
        isSaving={false}
        {...handlers}
      />,
    );

    await user.click(screen.getByTitle("More actions"));
    await user.click(await screen.findByRole("menuitem", { name: /delete/i }));

    const dialog = await screen.findByRole("alertdialog");
    expect(
      within(dialog).getByText("Delete this reminder?"),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Follow-up call")).toBeInTheDocument();
    expect(handlers.onDeleteReminder).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(handlers.onDeleteReminder).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("deletes a reminder only after confirmation", async () => {
    const user = userEvent.setup();
    const handlers = reminderHandlers();

    render(
      <Reminders
        reminders={[makeReminder()]}
        isLoading={false}
        leadId="lead-1"
        isSaving={false}
        {...handlers}
      />,
    );

    await user.click(screen.getByTitle("More actions"));
    await user.click(await screen.findByRole("menuitem", { name: /delete/i }));

    const dialog = await screen.findByRole("alertdialog");
    await user.click(
      within(dialog).getByRole("button", { name: "Delete reminder" }),
    );

    expect(handlers.onDeleteReminder).toHaveBeenCalledTimes(1);
    expect(handlers.onDeleteReminder).toHaveBeenCalledWith("rem-1");
  });

  it("confirms delete from a completed reminder", async () => {
    const user = userEvent.setup();
    const handlers = reminderHandlers();

    render(
      <Reminders
        reminders={[
          makeReminder({
            _id: "rem-done",
            title: "Done task",
            status: "COMPLETED",
            completedAt: "2026-08-24T12:00:00.000Z",
          }),
        ]}
        isLoading={false}
        leadId="lead-1"
        isSaving={false}
        {...handlers}
      />,
    );

    await user.click(screen.getByTitle("Delete reminder"));

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Done task")).toBeInTheDocument();
    expect(handlers.onDeleteReminder).not.toHaveBeenCalled();

    await user.click(
      within(dialog).getByRole("button", { name: "Delete reminder" }),
    );
    expect(handlers.onDeleteReminder).toHaveBeenCalledWith("rem-done");
  });

  it("shows creating skeleton while saving a new reminder", () => {
    const handlers = reminderHandlers();

    render(
      <Reminders
        reminders={[]}
        isLoading={false}
        leadId="lead-1"
        isSaving
        {...handlers}
      />,
    );

    expect(screen.queryByText("No Reminders Set")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Creating reminder")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add reminder/i })).toBeDisabled();
  });
});

describe("RemindersTab", () => {
  function renderTab() {
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    return render(
      <QueryClientProvider client={client}>
        <RemindersTab leadId="lead-1" />
      </QueryClientProvider>,
    );
  }

  it("loads reminders then creates one via the API", async () => {
    const user = userEvent.setup();
    const created = makeReminder({ _id: "rem-new", title: "Call the client" });

    apiCallMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return {
          ok: true,
          json: async () => created,
        };
      }
      return {
        ok: true,
        json: async () => [] as Reminder[],
      };
    });

    renderTab();

    expect(await screen.findByText("No Reminders Set")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /add reminder/i }));
    await user.type(
      screen.getByPlaceholderText("e.g., Call for follow-up"),
      "Call the client",
    );
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Call" }));
    await user.click(screen.getByRole("button", { name: /create reminder/i }));

    await waitFor(() => {
      expect(apiCallMock).toHaveBeenCalledWith(
        "/api/leads/lead-1/reminders",
        expect.objectContaining({ method: "POST" }),
      );
    });

    const postCall = apiCallMock.mock.calls.find(
      (call: unknown[]) => (call[1] as RequestInit | undefined)?.method === "POST",
    );
    expect(postCall).toBeTruthy();
    const body = JSON.parse(String((postCall![1] as RequestInit).body));
    expect(body).toEqual(
      expect.objectContaining({
        title: "Call the client",
        type: "CALL",
        soundEnabled: true,
      }),
    );

    expect(await screen.findByText("Call the client")).toBeInTheDocument();
    expect(screen.queryByText("No Reminders Set")).not.toBeInTheDocument();
  });

  it("shows a spinner on mark as complete until the update finishes", async () => {
    const user = userEvent.setup();
    const reminder = makeReminder();
    let releasePut: (value: unknown) => void = () => {};
    const putGate = new Promise((resolve) => {
      releasePut = resolve;
    });

    apiCallMock.mockImplementation(async (_url: string, init?: RequestInit) => {
      if (init?.method === "PUT") {
        await putGate;
        return {
          ok: true,
          json: async () => ({ ...reminder, status: "COMPLETED" as const }),
        };
      }
      return {
        ok: true,
        json: async () => [reminder],
      };
    });

    renderTab();
    expect(await screen.findByText("Follow-up call")).toBeInTheDocument();

    await user.click(screen.getByTitle("Mark as complete"));
    expect(await screen.findByTitle("Marking as complete")).toBeInTheDocument();

    releasePut({});

    await waitFor(() => {
      expect(screen.queryByTitle("Marking as complete")).not.toBeInTheDocument();
    });
  });
});
