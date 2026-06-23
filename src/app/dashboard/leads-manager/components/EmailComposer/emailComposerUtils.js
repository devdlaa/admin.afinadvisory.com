// emailComposerUtils.js

import {
  File,
  Image,
  FileText,
  FileSpreadsheet,
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Quote,
  Outdent,
  Indent,
} from "lucide-react";

// ── File helpers ──────────────────────────────────────────────────────────────
export const getMimeIcon = (mimeType) => {
  if (!mimeType) return File;
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType.includes("spreadsheet") || mimeType.includes("csv"))
    return FileSpreadsheet;
  if (mimeType.includes("pdf") || mimeType.includes("word")) return FileText;
  return File;
};

export const getExtension = (name = "") => {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop().toUpperCase() : "FILE";
};

export const formatFileSize = (bytes) => {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ── Toolbar actions config ────────────────────────────────────────────────────
export const TOOLBAR_ACTIONS = [
  { icon: Undo2, cmd: "undo", title: "Undo" },
  { icon: Redo2, cmd: "redo", title: "Redo" },
  null,
  { icon: Bold, cmd: "bold", title: "Bold" },
  { icon: Italic, cmd: "italic", title: "Italic" },
  { icon: Underline, cmd: "underline", title: "Underline" },
  null,
  { icon: AlignLeft, cmd: "justifyLeft", title: "Align left" },
  { icon: AlignCenter, cmd: "justifyCenter", title: "Center" },
  { icon: AlignRight, cmd: "justifyRight", title: "Align right" },
  null,
  { icon: List, cmd: "insertUnorderedList", title: "Bullet list" },
  { icon: ListOrdered, cmd: "insertOrderedList", title: "Numbered list" },
  { icon: Quote, cmd: "formatBlock", title: "Blockquote", value: "blockquote" },
  null,
  { icon: Outdent, cmd: "outdent", title: "Outdent" },
  { icon: Indent, cmd: "indent", title: "Indent" },
];

// ── Validation ────────────────────────────────────────────────────────────────
export const validateEmailForm = ({ to_email, subject, bodyText }) => {
  const errors = {};
  if (!to_email) errors.to_email = "Please select a recipient.";
  if (!subject?.trim()) errors.subject = "Subject is required.";
  if (!bodyText?.trim()) errors.body = "Email body cannot be empty.";
  return errors;
};

// ── Constants ─────────────────────────────────────────────────────────────────
export const MAX_ATTACHMENTS = 3;
