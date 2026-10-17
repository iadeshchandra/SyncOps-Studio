import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Inbox,
  KanbanSquare,
  FileText,
  KeyRound,
  Settings,
  ScrollText,
  LogOut,
  ExternalLink,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { cx } from '../lib/format';
import OverviewTab from '../components/console/OverviewTab';
import OrdersTab from '../components/console/OrdersTab';
import ProjectsTab from '../components/console/ProjectsTab';
import ContentTab from '../components/console/ContentTab';
import ApiKeysTab from '../components/console/ApiKeysTab';
import SettingsTab from '../components/console/SettingsTab';
import AuditTab from '../components/console/AuditTab';

interface ConsoleTab {
  id: string;
  label: string;
  icon: LucideIcon;
  node: ReactNode;
}

const TABS: ConsoleTab[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, node: <OverviewTab /> },
  { id: 'orders', label: 'Orders', icon: Inbox, node: <OrdersTab /> },
  { id: 'projects', label: 'Projects', icon: KanbanSquare, node: <ProjectsTab /> },
  { id: 'content', label: 'Content', icon: FileText, node: <ContentTab /> },
  { id: 'api-keys', label: 'API Keys', icon: KeyRound, node: <ApiKeysTab /> },
  { id: 'platform', label: 'Platform', icon: Settings, node: <SettingsTab /> },
  { id: 'audit', label: 'Audit', icon: ScrollText, node: <AuditTab /> },
];

export default function StudioConsole() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState('overview');

  const activeTab = TABS.find((t) => t.id === active) ?? TABS[0];

  const handleSignOut = () => {
    signOut();
    navigate('/');
  };

  const tabButton = (tab: ConsoleTab) => {
    const Icon = tab.icon;
    const selected = tab.id === active;
    return (
      <button
        key={tab.id}
        type="button"
        onClick={() => setActive(tab.id)}
        className={cx(
          'flex items-center gap-3 rounded-md px-4 py-2.5 text-sm font-medium transition-colors',
          selected
            ? 'bg-cyan-500/15 text-cyan-300 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.25)]'
            : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200',
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span>{tab.label}</span>
      </button>
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-950">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-800/80 bg-slate-950/70 md:flex">
        <div className="border-b border-slate-800/80 px-5 py-5">
          <p className="eyebrow">owner_command_center</p>
          <h1 className="h-display mt-1 text-lg">Studio Console</h1>
        </div>
        <nav className="flex flex-col gap-1 p-3">{TABS.map(tabButton)}</nav>
        <div className="mt-auto border-t border-slate-800/80 p-4">
          <p className="telemetry truncate" title={user?.email ?? ''}>
            {user?.email ?? 'signed out'}
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            className="btn-ghost mt-3 w-full !px-3 !py-2 text-xs"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex items-center gap-3 border-b border-slate-800/80 bg-slate-950/70 px-4 py-3 md:px-6">
          <div className="md:hidden">
            <p className="eyebrow">owner_command_center</p>
            <h1 className="h-display text-base">Studio Console</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/" className="btn-ghost !px-3 !py-2 text-xs">
              <ExternalLink className="h-3.5 w-3.5" /> View site
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="btn-ghost !px-3 !py-2 text-xs md:hidden"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </header>

        {/* Mobile tab bar */}
        <nav className="flex gap-1 overflow-x-auto border-b border-slate-800/80 px-3 py-2 md:hidden">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const selected = tab.id === active;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActive(tab.id)}
                className={cx(
                  'flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors',
                  selected
                    ? 'bg-cyan-500/15 text-cyan-300'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Tab content */}
        <main className="flex-1 p-4 md:p-6">{activeTab.node}</main>
      </div>
    </div>
  );
}
