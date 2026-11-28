import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { TOOLS_UPDATED_LABEL } from '../data/tools';

/** The one quiet service CTA every tool page ends with — never a popup,
 *  never a gate. Plus the freshness stamp the research requires. */
export default function ToolCta({ servicePath, serviceLabel }: { servicePath: string; serviceLabel: string }) {
  return (
    <div className="mt-14">
      <div className="glass flex flex-col items-start justify-between gap-4 rounded-xl p-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="h-display text-lg">Rather have this handled for you?</h2>
          <p className="mt-1 max-w-xl text-sm text-slate-400">
            Every tool here is free and ungated. When you want the underlying problem fixed
            properly — measured, deduplicated and verified — that is the studio&apos;s work.
          </p>
        </div>
        <Link to={servicePath} className="btn-primary inline-flex shrink-0 items-center gap-1.5">
          {serviceLabel} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <p className="telemetry mt-4 text-center">tool data last updated · {TOOLS_UPDATED_LABEL}</p>
    </div>
  );
}
