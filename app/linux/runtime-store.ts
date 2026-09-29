"use client";

import { useSyncExternalStore } from "react";
import { readAuth } from "../components/auth-panel";
import { createMockTerminalState, type MockTerminalState } from "./mock-terminal-engine";

export type TerminalReport = {
  moduleId: string;
  labTitle: string;
  command: string;
  output: string;
  error: string | null;
  debugHint: string | null;
  matchedExpectedOutput: boolean;
};

export type RuntimeRecord = {
  version: 1;
  terminal: MockTerminalState;
  report: TerminalReport | null;
  completedModuleIds: string[];
  validatedQuizModuleIds: string[];
};

export const RUNTIME_CHANGE_EVENT = "cyberteka-runtime-change";
const DEFAULT_RUNTIME: RuntimeRecord = {
  version: 1,
  terminal: createMockTerminalState(),
  report: null,
  completedModuleIds: [],
  validatedQuizModuleIds: [],
};
const DEFAULT_RUNTIME_SNAPSHOT = JSON.stringify(DEFAULT_RUNTIME);

const getRuntimeStorageKey = () => {
  const auth = readAuth();
  return `cyberteka-linux-runtime-${auth.isLoggedIn && auth.email ? auth.email : "guest"}`;
};

const getValidatedSnapshot = () => {
  if (typeof window === "undefined") return DEFAULT_RUNTIME_SNAPSHOT;
  try {
    const stored = window.localStorage.getItem(getRuntimeStorageKey());
    if (!stored) return DEFAULT_RUNTIME_SNAPSHOT;
    const record = JSON.parse(stored) as Partial<RuntimeRecord>;
    if (record.version !== 1 || !record.terminal || !Array.isArray(record.terminal.directories) || !record.terminal.files || !Array.isArray(record.completedModuleIds) || !Array.isArray(record.validatedQuizModuleIds)) {
      return DEFAULT_RUNTIME_SNAPSHOT;
    }
    return stored;
  } catch {
    return DEFAULT_RUNTIME_SNAPSHOT;
  }
};

const subscribeToRuntime = (onStoreChange: () => void) => {
  window.addEventListener(RUNTIME_CHANGE_EVENT, onStoreChange);
  window.addEventListener("cyberteka-auth-change", onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(RUNTIME_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("cyberteka-auth-change", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
};

const getServerSnapshot = () => DEFAULT_RUNTIME_SNAPSHOT;

export const useRuntimeRecord = () => {
  const snapshot = useSyncExternalStore(subscribeToRuntime, getValidatedSnapshot, getServerSnapshot);
  try {
    return JSON.parse(snapshot) as RuntimeRecord;
  } catch {
    return DEFAULT_RUNTIME;
  }
};

export const readRuntimeRecord = (): RuntimeRecord => {
  try {
    return JSON.parse(getValidatedSnapshot()) as RuntimeRecord;
  } catch {
    return {
      ...DEFAULT_RUNTIME,
      terminal: createMockTerminalState(),
      completedModuleIds: [],
      validatedQuizModuleIds: [],
    };
  }
};

export const writeRuntimeRecord = (next: RuntimeRecord) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getRuntimeStorageKey(), JSON.stringify(next));
    window.dispatchEvent(new Event(RUNTIME_CHANGE_EVENT));
  } catch {
    window.dispatchEvent(new Event(RUNTIME_CHANGE_EVENT));
  }
};

export const updateRuntimeRecord = (update: (current: RuntimeRecord) => RuntimeRecord) => {
  writeRuntimeRecord(update(readRuntimeRecord()));
};