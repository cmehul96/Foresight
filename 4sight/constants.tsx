
import React from 'react';
import { AppStep, LANGUAGE_OPTIONS } from './types';

export const APP_NAME = "Foresight";
export const APP_TAGLINE = "Your AI Research Partner";

export const GEMINI_TEXT_MODEL = "gemini-2.5-flash-preview-04-17";

interface IconProps {
  className?: string;
  style?: React.CSSProperties; // Added for more flexible styling if needed
}

// Default icon size classes for Material Symbols (font-size based)
const defaultIconSize = "text-xl"; // Corresponds to 24px, typical for w-6 h-6
const smallIconSize = "text-lg"; // Corresponds to 20px, typical for w-5 h-5

export const Icons = {
  // General & UI
  AIInsight: ({ className, style }: IconProps) => ( // Was brain/chip, using 'psychology' or 'tips_and_updates'
    <span className={`material-symbols-outlined ${className || defaultIconSize}`} style={style}>tips_and_updates</span>
  ),
  ClipboardList: ({ className, style }: IconProps) => ( // For plans, methods
    <span className={`material-symbols-outlined ${className || defaultIconSize}`} style={style}>list_alt</span>
  ),
  ChartBar: ({ className, style }: IconProps) => ( // For reports, summaries
    <span className={`material-symbols-outlined ${className || defaultIconSize}`} style={style}>bar_chart</span>
  ),
  LightBulb: ({ className, style }: IconProps) => ( // For themes, ideas
    <span className={`material-symbols-outlined ${className || defaultIconSize}`} style={style}>lightbulb</span>
  ),
  Eye: ({ className, style }: IconProps) => ( // App Logo Icon
    <span className={`material-symbols-outlined ${className || defaultIconSize}`} style={style}>visibility</span>
  ),
  ChevronRight: ({ className, style }: IconProps) => (
    <span className={`material-symbols-outlined ${className || smallIconSize}`} style={style}>chevron_right</span>
  ),
  ChevronLeft: ({ className, style }: IconProps) => (
    <span className={`material-symbols-outlined ${className || smallIconSize}`} style={style}>chevron_left</span>
  ),
  CheckCircle: ({ className, style }: IconProps) => (
    <span className={`material-symbols-outlined ${className || defaultIconSize}`} style={style}>check_circle</span>
  ),
  ArrowPath: ({ className, style }: IconProps) => ( // For reset, timeline, sync
    <span className={`material-symbols-outlined ${className || smallIconSize}`} style={style}>autorenew</span>
  ),
  Edit: ({ className, style }: IconProps) => (
    <span className={`material-symbols-outlined ${className || smallIconSize}`} style={style}>edit</span>
  ),
  Star: ({ className, style }: IconProps) => (
    <span className={`material-symbols-outlined ${className || defaultIconSize}`} style={style}>star</span>
  ),
  MagicSparkle: ({ className, style }: IconProps) => ( // Was 4-point sparkle
    <span className={`material-symbols-outlined ${className || defaultIconSize}`} style={style}>auto_awesome</span>
  ),

  // Company Background
  Industry: ({ className, style }: IconProps) => (
    <span className={`material-symbols-outlined ${className || defaultIconSize}`} style={style}>domain</span>
  ),
  ProductsServices: ({ className, style }: IconProps) => (
    <span className={`material-symbols-outlined ${className || defaultIconSize}`} style={style}>widgets</span>
  ),
  MissionVision: ({ className, style }: IconProps) => ( // Was target-like
    <span className={`material-symbols-outlined ${className || defaultIconSize}`} style={style}>track_changes</span>
  ),
  TargetMarkets: ({ className, style }: IconProps) => ( // Was multiple users
    <span className={`material-symbols-outlined ${className || defaultIconSize}`} style={style}>groups</span>
  ),
  Competitors: ({ className, style }: IconProps) => ( // Was warning triangle
    <span className={`material-symbols-outlined ${className || defaultIconSize}`} style={style}>report_problem</span>
  ),

  // Interview & Report
  Microphone: ({ className, style }: IconProps) => (
    <span className={`material-symbols-outlined ${className || defaultIconSize}`} style={style}>mic</span>
  ),
  MicrophoneSlash: ({ className, style }: IconProps) => (
    <span className={`material-symbols-outlined ${className || defaultIconSize}`} style={style}>mic_off</span>
  ),
  VolumeUp: ({ className, style }: IconProps) => (
    <span className={`material-symbols-outlined ${className || smallIconSize}`} style={style}>volume_up</span>
  ),
  Translate: ({ className, style }: IconProps) => (
    <span className={`material-symbols-outlined ${className || defaultIconSize}`} style={style}>translate</span>
  ),
  ShieldCheck: ({ className, style }: IconProps) => ( // For guardrails, ethical considerations, policy
    <span className={`material-symbols-outlined ${className || defaultIconSize}`} style={style}>policy</span>
  ),
  Quotation: ({ className, style }: IconProps) => ( // For illustrative quotes
    <span className={`material-symbols-outlined ${className || defaultIconSize}`} style={style}>format_quote</span>
  ),
};

export const STEP_DESCRIPTIONS: Record<AppStep, string> = {
  [AppStep.WELCOME]: "Welcome",
  [AppStep.COMPANY_BACKGROUND_INPUT]: "Company Input",
  [AppStep.COMPANY_BACKGROUND_LOADING]: "Analyzing Company...",
  [AppStep.COMPANY_BACKGROUND_DISPLAY]: "Company Background",
  [AppStep.RESEARCH_DEFINITION_OBJECTIVES]: "Define Objectives",
  [AppStep.RESEARCH_DEFINITION_AUDIENCE]: "Define Audience",
  [AppStep.RESEARCH_DEFINITION_ASSUMPTIONS]: "Define Assumptions",
  [AppStep.RESEARCH_PLAN_GENERATING]: "Generating Plan...",
  [AppStep.RESEARCH_PLAN_DISPLAY_EDIT]: "Research Plan",
  [AppStep.INTERVIEW_PREPARATION]: "Interview Setup",
  [AppStep.INTERVIEW_SESSION]: "Conduct Interview",
  [AppStep.REPORT_GENERATING]: "Generating Report...",
  [AppStep.REPORT_DISPLAY]: "Research Report",
  [AppStep.DASHBOARD_SUMMARY]: "Project Summary"
};

export { LANGUAGE_OPTIONS };
