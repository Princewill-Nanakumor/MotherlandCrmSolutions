// src/components/ui/use-toast.ts

"use client";

import * as React from "react";
import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

const TOAST_LIMIT = 1;
const TOAST_DURATION = 4200;
const TOAST_REMOVE_DELAY = 480;

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

// Replace const actionTypes with enum
enum ActionType {
  ADD_TOAST = "ADD_TOAST",
  UPDATE_TOAST = "UPDATE_TOAST",
  DISMISS_TOAST = "DISMISS_TOAST",
  REMOVE_TOAST = "REMOVE_TOAST",
}

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_VALUE;
  return count.toString();
}

type Action =
  | {
      type: ActionType.ADD_TOAST;
      toast: ToasterToast;
    }
  | {
      type: ActionType.UPDATE_TOAST;
      toast: Partial<ToasterToast>;
    }
  | {
      type: ActionType.DISMISS_TOAST;
      toastId?: ToasterToast["id"];
    }
  | {
      type: ActionType.REMOVE_TOAST;
      toastId?: ToasterToast["id"];
    };

interface State {
  toasts: ToasterToast[];
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
const autoDismissTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

const clearAutoDismiss = (toastId: string) => {
  const timeout = autoDismissTimeouts.get(toastId);
  if (timeout) {
    clearTimeout(timeout);
    autoDismissTimeouts.delete(toastId);
  }
};

const scheduleAutoDismiss = (toastId: string, duration: number) => {
  clearAutoDismiss(toastId);

  if (!Number.isFinite(duration) || duration <= 0) {
    return;
  }

  const timeout = setTimeout(() => {
    autoDismissTimeouts.delete(toastId);
    dispatch({
      type: ActionType.DISMISS_TOAST,
      toastId,
    });
  }, duration);

  autoDismissTimeouts.set(toastId, timeout);
};

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return;
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({
      type: ActionType.REMOVE_TOAST,
      toastId: toastId,
    });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case ActionType.ADD_TOAST: {
      state.toasts.forEach((toast) => clearAutoDismiss(toast.id));

      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };
    }

    case ActionType.UPDATE_TOAST: {
      const updatedToasts = state.toasts.map((t) =>
        t.id === action.toast.id ? { ...t, ...action.toast } : t,
      );
      const updatedToast = updatedToasts.find((t) => t.id === action.toast.id);

      if (
        updatedToast &&
        typeof action.toast.duration === "number" &&
        updatedToast.open !== false
      ) {
        scheduleAutoDismiss(
          updatedToast.id,
          action.toast.duration ?? TOAST_DURATION,
        );
      }

      return {
        ...state,
        toasts: updatedToasts,
      };
    }

    case ActionType.DISMISS_TOAST: {
      const { toastId } = action;
      const toDismiss = state.toasts.filter((t) =>
        toastId ? t.id === toastId && t.open !== false : t.open !== false,
      );

      if (toDismiss.length === 0) {
        return state;
      }

      toDismiss.forEach((toast) => {
        clearAutoDismiss(toast.id);
        addToRemoveQueue(toast.id);
      });

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          toDismiss.some((dismissed) => dismissed.id === t.id)
            ? {
                ...t,
                open: false,
              }
            : t,
        ),
      };
    }
    case ActionType.REMOVE_TOAST:
      if (action.toastId === undefined) {
        state.toasts.forEach((toast) => clearAutoDismiss(toast.id));
        return {
          ...state,
          toasts: [],
        };
      }
      clearAutoDismiss(action.toastId);
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
  }
};

const listeners: Array<(state: State) => void> = [];

let memoryState: State = { toasts: [] };

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

type Toast = Omit<ToasterToast, "id">;

function toast({ ...props }: Toast) {
  const id = genId();

  const update = (props: ToasterToast) =>
    dispatch({
      type: ActionType.UPDATE_TOAST,
      toast: { ...props, id },
    });
  const dismiss = () =>
    dispatch({ type: ActionType.DISMISS_TOAST, toastId: id });

  dispatch({
    type: ActionType.ADD_TOAST,
    toast: {
      ...props,
      id,
      duration: props.duration ?? TOAST_DURATION,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
    },
  });

  scheduleAutoDismiss(id, props.duration ?? TOAST_DURATION);

  return {
    id: id,
    dismiss,
    update,
  };
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    setState(memoryState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) =>
      dispatch({ type: ActionType.DISMISS_TOAST, toastId }),
  };
}

export { useToast, toast };

/** Clears toast state between tests. */
export function resetToastsForTests() {
  toastTimeouts.forEach((timeout) => clearTimeout(timeout));
  toastTimeouts.clear();
  autoDismissTimeouts.forEach((timeout) => clearTimeout(timeout));
  autoDismissTimeouts.clear();
  memoryState = { toasts: [] };
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}
