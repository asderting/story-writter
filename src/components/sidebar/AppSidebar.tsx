import { useState } from 'react';
import {
  FolderOpen,
  PenTool,
  Sparkles,
  Wand2,
  BookOpen,
  Users,
  SlidersHorizontal,
  Server,
  Clock,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type SidebarSection =
  | 'projects'
  | 'editor'
  | 'generate'
  | 'edit'
  | 'lorebook'
  | 'characters'
  | 'presets'
  | 'models'
  | 'history'
  | 'settings';

interface NavItem {
  id: SidebarSection;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { id: 'projects', label: 'Projects', icon: FolderOpen },
  { id: 'editor', label: 'Editor', icon: PenTool },
  { id: 'generate', label: 'Generate', icon: Sparkles },
  { id: 'edit', label: 'Edit / Rewrite', icon: Wand2 },
  { id: 'lorebook', label: 'Lorebook', icon: BookOpen },
  { id: 'characters', label: 'Characters', icon: Users },
  { id: 'presets', label: 'Presets', icon: SlidersHorizontal },
  { id: 'models', label: 'Models', icon: Server },
  { id: 'history', label: 'History', icon: Clock },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface AppSidebarProps {
  activeSection: SidebarSection;
  onSectionChange: (section: SidebarSection) => void;
}

export function AppSidebar({ activeSection, onSectionChange }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-zinc-950 border-r border-zinc-800 transition-all duration-200',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Branding */}
      <div className="flex items-center gap-2 px-4 h-14 border-b border-zinc-800 shrink-0">
        <Sparkles className="h-5 w-5 text-violet-400 shrink-0" />
        {!collapsed && (
          <span className="text-sm font-semibold text-zinc-100 whitespace-nowrap tracking-wide">
            Story Studio
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                'hover:bg-zinc-800/70 hover:text-zinc-100',
                isActive
                  ? 'bg-violet-600/15 text-violet-400 border border-violet-500/20'
                  : 'text-zinc-400 border border-transparent',
                collapsed && 'justify-center px-0'
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && (
                <span className="truncate">{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-zinc-800 p-2 shrink-0">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm text-zinc-500 transition-colors',
            'hover:bg-zinc-800/70 hover:text-zinc-300',
            collapsed && 'justify-center px-0'
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 shrink-0" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
