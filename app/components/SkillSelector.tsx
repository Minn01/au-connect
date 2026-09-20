"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Plus, X } from "lucide-react";

import { SKILL_SEARCH_API_PATH } from "@/lib/constants";

export type SkillOption = { id: string; name: string };

export default function SkillSelector({
  selected,
  onChange,
  maxSelected,
  label = "Search skills",
  layout = "dropdown",
}: {
  selected: SkillOption[];
  onChange: (skills: SkillOption[]) => void;
  maxSelected?: number;
  label?: string;
  layout?: "dropdown" | "suggestions";
}) {
  const listId = useId();
  const requestId = useRef(0);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SkillOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(layout === "suggestions");
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    if (!open || query.trim().length === 1) {
      setResults([]);
      return;
    }
    const currentRequest = ++requestId.current;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        const params = new URLSearchParams({ q: query.trim(), limit: "10" });
        const response = await fetch(`${SKILL_SEARCH_API_PATH}?${params}`, {
          credentials: "include",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Search failed");
        const data = (await response.json()) as { skills?: SkillOption[] };
        if (currentRequest === requestId.current) {
          const selectedIds = new Set(selected.map((skill) => skill.id));
          setResults(
            (data.skills ?? []).filter((skill) => !selectedIds.has(skill.id)),
          );
          setActiveIndex(-1);
        }
      } catch (searchError) {
        if (
          currentRequest === requestId.current &&
          !(searchError instanceof DOMException && searchError.name === "AbortError")
        ) {
          setError(true);
          setResults([]);
        }
      } finally {
        if (currentRequest === requestId.current) setLoading(false);
      }
    }, 275);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query, selected]);

  const atLimit = maxSelected !== undefined && selected.length >= maxSelected;
  const choose = (skill: SkillOption) => {
    if (atLimit || selected.some(({ id }) => id === skill.id)) return;
    onChange([...selected, skill]);
    setQuery("");
    setOpen(layout === "suggestions");
  };

  const selectedChips = selected.map((skill) => (
    <span
      key={skill.id}
      className={
        layout === "suggestions"
          ? "inline-flex items-center gap-1.5 rounded-full bg-red-700 px-3 py-1.5 text-sm font-semibold text-white shadow-sm"
          : "inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-800"
      }
    >
      {skill.name}
      <button
        type="button"
        onClick={() => onChange(selected.filter(({ id }) => id !== skill.id))}
        aria-label={`Remove ${skill.name}`}
        className="rounded-full p-0.5 hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-white/80"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </span>
  ));

  const resultContent = loading ? (
    <p className="px-3 py-2 text-sm text-slate-500">Searching…</p>
  ) : error ? (
    <p role="alert" className="px-3 py-2 text-sm text-red-600">
      Skill search is unavailable. Please try again.
    </p>
  ) : query.trim().length === 1 ? (
    <p className="px-3 py-2 text-sm text-slate-500">
      Enter at least two characters to search.
    </p>
  ) : results.length === 0 ? (
    <p className="px-3 py-2 text-sm text-slate-500">
      {query.trim()
        ? "No skills match your search."
        : "Popular skills will appear here."}
    </p>
  ) : (
    results.map((skill, index) => (
      <button
        id={`${listId}-${index}`}
        role="option"
        aria-selected={activeIndex === index}
        key={skill.id}
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => choose(skill)}
        className={
          layout === "suggestions"
            ? `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                activeIndex === index
                  ? "border-red-600 bg-red-50 text-red-800"
                  : "border-slate-300 bg-white text-slate-700 hover:border-red-400 hover:bg-red-50 hover:text-red-800"
              }`
            : `block w-full rounded-lg px-3 py-2 text-left text-sm ${
                activeIndex === index
                  ? "bg-blue-50 text-blue-800"
                  : "text-slate-700 hover:bg-slate-50"
              }`
        }
      >
        {skill.name}
        {layout === "suggestions" && (
          <Plus size={15} aria-hidden="true" className="shrink-0" />
        )}
      </button>
    ))
  );

  return (
    <div className="space-y-3">
      {layout === "dropdown" && selected.length > 0 && (
        <div className="flex flex-wrap gap-2">{selectedChips}</div>
      )}

      <div className="relative">
        <label className="sr-only" htmlFor={`${listId}-input`}>
          {label}
        </label>
        <div
          className={`flex min-h-12 flex-wrap items-center gap-2 rounded-xl border bg-white px-3 py-2 transition focus-within:ring-2 ${
            layout === "suggestions"
              ? "focus-within:border-red-600 focus-within:ring-red-100"
              : "focus-within:border-blue-500 focus-within:ring-blue-100"
          } ${
            open
              ? layout === "suggestions"
                ? "border-red-400"
                : "border-blue-400"
              : "border-slate-300"
          }`}
        >
          {layout === "suggestions" && selectedChips}
          <input
            id={`${listId}-input`}
            role="combobox"
            aria-controls={listId}
            aria-expanded={open}
            aria-activedescendant={
              activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined
            }
            autoComplete="off"
            disabled={atLimit}
            value={query}
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((index) =>
                  Math.min(index + 1, results.length - 1),
                );
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((index) => Math.max(index - 1, 0));
              } else if (event.key === "Enter" && activeIndex >= 0) {
                event.preventDefault();
                choose(results[activeIndex]);
              } else if (event.key === "Escape" && layout === "dropdown") {
                setOpen(false);
              }
            }}
            placeholder={
              atLimit ? "Skill limit reached" : "Search skills, tools, or roles"
            }
            className="min-w-44 flex-1 bg-transparent py-1 text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
          />
        </div>

        {open && !atLimit && layout === "dropdown" && (
          <div
            id={listId}
            role="listbox"
            className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
          >
            {resultContent}
          </div>
        )}
      </div>

      {layout === "suggestions" && !atLimit && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">
              {query.trim() ? "Search results" : "Suggested skills"}
            </p>
            {!query.trim() && (
              <span className="text-xs text-slate-500">
                Based on popular skills
              </span>
            )}
          </div>
          <div
            id={listId}
            role="listbox"
            className="flex min-h-10 flex-wrap gap-2"
          >
            {resultContent}
          </div>
        </div>
      )}
    </div>
  );
}
