import {
  Building2,
  Bot,
  ChevronLeft,
  ChevronRight,
  Database,
  FileText,
  Folder,
  Kanban,
  Library,
  LayoutDashboard,
  LogOut,
  Search,
  Shield,
  Users,
  CalendarDays,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  security: Shield,
  members: Users,
  tenants: Building2,
  employees: Users,
  notes: FileText,
  tasks: Kanban,
  documents: Library,
  bpql: Database,
  'knowledge-bot': Bot,
  calendar: CalendarDays,
  Users,
  Bot,
  FileText,
  Kanban,
  Library,
  Database,
  Building2,
  Shield,
  LayoutDashboard,
  Folder,
  Search,
  LogOut,
  ChevronLeft,
  ChevronRight,
};

export function AppIcon({
  name,
  className = '',
  size = 18,
}: {
  name?: string;
  className?: string;
  size?: number;
}) {
  if (!name) return <Folder size={size} className={className} />;
  const IconComponent = ICON_MAP[name] || ICON_MAP[name.toLowerCase()] || Folder;
  return <IconComponent size={size} className={className} />;
}
