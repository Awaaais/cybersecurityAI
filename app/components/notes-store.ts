"use client";

import { useSyncExternalStore } from "react";

export type SavedNote = {
  id: string;
  title: string;
  category: string;
  content: string;
  createdAt: string;
};

const NOTES_CHANGED = "cyberteka-notes-change";
const getStorageKey = (email: string) => `cyberteka-notes-${email.trim().toLowerCase()}`;

const readNotesSnapshot = (email: string) => {
  if (!email) return "[]";
  try {
    const raw = window.localStorage.getItem(getStorageKey(email));
    if (!raw) return "[]";
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? JSON.stringify(parsed) : "[]";
  } catch {
    return "[]";
  }
};

const subscribeToNotes = (onStoreChange: () => void) => {
  window.addEventListener(NOTES_CHANGED, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(NOTES_CHANGED, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
};

export const saveNote = (email: string, note: Omit<SavedNote, "id" | "createdAt">) => {
  if (typeof window === "undefined" || !email) return;
  const existing = JSON.parse(readNotesSnapshot(email)) as SavedNote[];
  const id = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const next: SavedNote[] = [{ ...note, id, createdAt: new Date().toISOString() }, ...existing];
  window.localStorage.setItem(getStorageKey(email), JSON.stringify(next));
  window.dispatchEvent(new Event(NOTES_CHANGED));
};

export const useSavedNotes = (email: string) => {
  const snapshot = useSyncExternalStore(subscribeToNotes, () => readNotesSnapshot(email), () => "[]");
  try {
    return JSON.parse(snapshot) as SavedNote[];
  } catch {
    return [];
  }
};