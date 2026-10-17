import { Link } from 'react-router-dom';
import { Wrench } from 'lucide-react';
import { useSiteConfig } from '../lib/siteConfig';

export default function Maintenance() {
  const { config } = useSiteConfig();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="glass max-w-lg rounded-lg p-10 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
          <Wrench className="h-7 w-7" />
        </span>
        <p className="eyebrow mt-6">scheduled_maintenance</p>
        <h1 className="h-display mt-2 text-2xl">We&rsquo;ll be right back</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">{config.maintenanceMessage}</p>
        <Link to="/status" className="btn-ghost mt-8 w-full">
          Back to status page
        </Link>
      </div>
    </div>
  );
}
