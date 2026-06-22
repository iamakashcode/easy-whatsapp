import { useState } from 'react';
import { VALUE_SOURCES, buildParam, parseParam, resolveTokens, sampleContact as defaultSample } from '../utils/templateVars';

// Per-placeholder dynamic-value picker shared by Send Message, Quick Send and Broadcast.
// Parents should pass key={templateId} so picker state resets when the template changes.
export default function DynamicValueFields({ variables = [], value = [], onChange, sampleContact, bulk = false }) {
  const [entries, setEntries] = useState(() => variables.map((_, i) => parseParam(value[i])));

  const emit = (next) => {
    setEntries(next);
    onChange?.(next.map(buildParam));
  };
  const update = (i, patch) => emit(entries.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));

  const sample = sampleContact || defaultSample;
  if (!variables.length) return null;

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
      <p className="text-sm font-medium">Fill in template values</p>
      {variables.map((v, i) => {
        const entry = entries[i] || { source: 'custom', customText: '', fallback: '' };
        const def = VALUE_SOURCES.find((s) => s.key === entry.source) || VALUE_SOURCES[0];
        const preview = resolveTokens(buildParam(entry), sample);
        return (
          <div key={v} className="space-y-1.5">
            <label className="block text-xs font-medium text-blue-600 dark:text-blue-400">{`{{${v}}}`}</label>
            <div className="flex gap-2 flex-wrap">
              <select
                className="input text-sm flex-1 min-w-[10rem]"
                value={entry.source}
                onChange={(e) => update(i, { source: e.target.value })}
              >
                {VALUE_SOURCES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
              {entry.source === 'custom' && (
                <input
                  className="input text-sm flex-1 min-w-[8rem]"
                  placeholder="Type a value"
                  value={entry.customText}
                  onChange={(e) => update(i, { customText: e.target.value })}
                />
              )}
              {def.allowFallback && (
                <input
                  className="input text-sm w-32"
                  placeholder="Fallback"
                  title="Used if the contact field is empty"
                  value={entry.fallback}
                  onChange={(e) => update(i, { fallback: e.target.value })}
                />
              )}
            </div>
            <p className="text-xs text-gray-400">
              Preview: <span className="text-gray-600 dark:text-gray-300">{preview || '—'}</span>
            </p>
          </div>
        );
      })}
      {bulk && (
        <p className="text-xs text-gray-400">Dynamic values are filled in per recipient when sending.</p>
      )}
    </div>
  );
}

// True when every placeholder has a usable value (field token or non-empty custom text).
export const paramsFilled = (params, count) =>
  Array.from({ length: count }).every((_, i) => (params?.[i] || '').trim().length > 0);
