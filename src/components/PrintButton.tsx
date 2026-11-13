"use client";

// Opens the browser's print dialog; choose "Save as PDF" to export the page as a PDF.
export function PrintButton({ label = "Print or save as PDF" }: { label?: string }) {
  return <button type="button" className="no-print" onClick={() => window.print()}>{label}</button>;
}
