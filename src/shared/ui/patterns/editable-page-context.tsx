"use client";

import { createContext, useContext } from "react";

import type { EditablePageMode, UseEditablePageResult } from "./use-editable-page";

export type EditablePageContextValue = UseEditablePageResult;

const EditablePageContext = createContext<EditablePageContextValue | null>(null);

export function EditablePageProvider({
  children,
  value,
}: Readonly<{
  children: React.ReactNode;
  value: EditablePageContextValue;
}>) {
  return <EditablePageContext.Provider value={value}>{children}</EditablePageContext.Provider>;
}

export function useEditablePageContext(): EditablePageContextValue | null {
  return useContext(EditablePageContext);
}

export function useEditablePageMode(): EditablePageMode {
  return useEditablePageContext()?.pageMode ?? "view";
}
