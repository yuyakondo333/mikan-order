"use client";

import { useState } from "react";

type HelpAccordionProps = {
  title: string;
  children: React.ReactNode;
};

export function HelpAccordion({ title, children }: HelpAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-lg border bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        aria-expanded={isOpen}
      >
        <span className="text-sm font-semibold text-gray-800">{title}</span>
        <svg
          className={`h-5 w-5 shrink-0 text-orange-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {isOpen && (
        <div className="border-t border-gray-100 px-4 py-3">{children}</div>
      )}
    </div>
  );
}
