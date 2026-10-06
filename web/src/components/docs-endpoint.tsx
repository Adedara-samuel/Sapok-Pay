"use client";

import type { ReactNode } from "react";

const METHOD_STYLE: Record<string, string> = {
  GET: "bg-[#3b82f6]/15 text-[#3b82f6]",
  POST: "bg-success/15 text-success",
  PUT: "bg-[#f5c542]/20 text-[#b8860b] dark:text-[#f5c542]",
  PATCH: "bg-[#f5c542]/20 text-[#b8860b] dark:text-[#f5c542]",
  DELETE: "bg-danger/15 text-danger",
};

export function MethodBadge({ method }: { method: string }) {
  return <span className={`inline-flex h-6 items-center rounded px-2 font-mono text-xs font-bold ${METHOD_STYLE[method] ?? "bg-muted text-muted-foreground"}`}>{method}</span>;
}

export function Pill({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "primary" | "warning" }) {
  const toneClass = tone === "primary" ? "bg-primary/10 text-primary" : tone === "warning" ? "bg-[#f5c542]/15 text-[#b8860b] dark:text-[#f5c542]" : "bg-muted text-muted-foreground";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold ${toneClass}`}>{children}</span>;
}

/**
 * A regex-based colorizer, not a real tokenizer — fine for the static,
 * developer-authored example payloads this page renders. HTML-escapes
 * before colorizing, but this is NOT a sanitizer: never pass live API
 * responses or any other user/externally-controlled data through this or
 * through JsonBlock below. Every call site in this codebase must stay a
 * literal object defined in source.
 */
function colorizeJson(json: string): string {
  return json
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"([^"]+)":/g, '<span class="text-foreground font-semibold">"$1"</span>:')
    .replace(/: "([^"]*)"/g, ': <span class="text-accent">"$1"</span>')
    .replace(/: (-?\d+\.?\d*)/g, ': <span class="text-primary">$1</span>')
    .replace(/: (true|false|null)/g, ': <span class="text-[#f5c542]">$1</span>');
}

export function JsonBlock({ data, title }: { data: unknown; title?: string }) {
  const json = JSON.stringify(data, null, 2);
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-card">
      {title && (
        <div className="border-b border-border px-3.5 py-2">
          <span className="font-mono text-[0.7rem] font-medium text-muted-foreground">{title}</span>
        </div>
      )}
      {/* eslint-disable-next-line react/no-danger */}
      <pre className="overflow-x-auto px-3.5 py-3 text-[0.78rem] leading-relaxed" dangerouslySetInnerHTML={{ __html: colorizeJson(json) }} />
    </div>
  );
}

export function CurlBlock({ code, title }: { code: string; title?: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-card">
      {title && (
        <div className="border-b border-border px-3.5 py-2">
          <span className="font-mono text-[0.7rem] font-medium text-muted-foreground">{title}</span>
        </div>
      )}
      <pre className="overflow-x-auto px-3.5 py-3 text-[0.78rem] leading-relaxed">
        <code className="text-foreground">{code}</code>
      </pre>
    </div>
  );
}

export interface ParamDef {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export function ParamsTable({ title, params }: { title: string; params: ParamDef[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="border-b border-border bg-surface px-3.5 py-2">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</span>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {params.map((param) => (
            <tr key={param.name} className="border-b border-border last:border-0">
              <td className="whitespace-nowrap px-3.5 py-2.5 align-top">
                <code className="text-xs font-semibold text-foreground">{param.name}</code>
                {!param.required && <span className="ml-1.5 text-[0.65rem] text-muted-foreground">optional</span>}
              </td>
              <td className="whitespace-nowrap px-3.5 py-2.5 align-top text-xs text-muted-foreground">{param.type}</td>
              <td className="px-3.5 py-2.5 align-top text-xs text-muted-foreground">{param.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EndpointCard({
  method,
  path,
  auth,
  idempotent,
  description,
  params,
  request,
  response,
}: {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  auth: "public" | "bearer";
  idempotent?: boolean;
  description: string;
  params?: ParamDef[];
  request?: unknown;
  response: unknown;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      <div className="flex flex-wrap items-center gap-2.5 border-b border-border bg-surface/60 px-4 py-3">
        <MethodBadge method={method} />
        <code className="text-sm font-medium text-foreground">{path}</code>
        <div className="ml-auto flex gap-1.5">
          <Pill tone={auth === "public" ? "default" : "primary"}>{auth === "public" ? "Public" : "Bearer token"}</Pill>
          {idempotent && <Pill tone="warning">Idempotency-Key required</Pill>}
        </div>
      </div>
      <div className="flex flex-col gap-4 p-4">
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        {params && <ParamsTable title="Request body" params={params} />}
        <div className={`grid grid-cols-1 gap-3 ${request ? "lg:grid-cols-2" : ""}`}>
          {request !== undefined && <JsonBlock title="Request body" data={request} />}
          <JsonBlock title="Response" data={response} />
        </div>
      </div>
    </div>
  );
}
