import { CodingLayout } from "./CodingLayout";
import { SqlLayout } from "./SqlLayout";
import { SystemDesignLayout } from "./SystemDesignLayout";
import { BehavioralLayout } from "./BehavioralLayout";
import { ResumeLayout } from "./ResumeLayout";
import React from "react";

export type QuestionType = "CODING" | "SQL" | "SYSTEM_DESIGN" | "BEHAVIORAL" | "GENERAL" | "RESUME";

const layoutRegistry: Record<string, React.ComponentType<{ ctx: any }>> = {
  CODING: CodingLayout,
  SQL: SqlLayout,
  SYSTEM_DESIGN: SystemDesignLayout,
  BEHAVIORAL: BehavioralLayout,
  GENERAL: BehavioralLayout,
  RESUME: ResumeLayout,
};

export function getLayout(type: string) {
  const cleanType = type.toUpperCase().replace(/\s+/g, "_");
  const LayoutComponent = layoutRegistry[cleanType];
  
  if (!LayoutComponent) {
    console.warn(`No layout matched for token type: ${type}. Defaulting to Coding.`);
    return CodingLayout;
  }
  return LayoutComponent;
}