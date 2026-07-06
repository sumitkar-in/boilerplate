import React from 'react';

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  collapsible?: 'icon' | 'offcanvas' | 'none';
  side?: 'left' | 'right';
  state?: 'expanded' | 'collapsed';
}

export function Sidebar({
  collapsible = 'icon',
  side = 'left',
  state = 'expanded',
  className = '',
  ...props
}: SidebarProps): React.ReactElement {
  return (
    <aside
      className={cx('ui-sidebar', className)}
      data-collapsible={collapsible}
      data-side={side}
      data-state={state}
      {...props}
    />
  );
}

export function SidebarHeader({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return <div className={cx('ui-sidebar__header', className)} {...props} />;
}

export function SidebarContent({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return <div className={cx('ui-sidebar__content', className)} {...props} />;
}

export const SidebarFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = '', ...props }, ref) => (
    <div ref={ref} className={cx('ui-sidebar__footer', className)} {...props} />
  ),
);

SidebarFooter.displayName = 'SidebarFooter';

export function SidebarGroup({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return <div className={cx('ui-sidebar__group', className)} {...props} />;
}

export function SidebarGroupLabel({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return <div className={cx('ui-sidebar__group-label', className)} {...props} />;
}

export function SidebarGroupContent({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return <div className={cx('ui-sidebar__group-content', className)} {...props} />;
}

export function SidebarMenu({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLUListElement>): React.ReactElement {
  return <ul className={cx('ui-sidebar__menu', className)} {...props} />;
}

export function SidebarMenuItem({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLLIElement>): React.ReactElement {
  return <li className={cx('ui-sidebar__menu-item', className)} {...props} />;
}

type SidebarMenuButtonChildProps = {
  className?: string;
  title?: string;
  'data-active'?: boolean;
};

export interface SidebarMenuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  isActive?: boolean;
  tooltip?: string;
}

export function SidebarMenuButton({
  asChild = false,
  isActive = false,
  tooltip,
  className = '',
  children,
  ...props
}: SidebarMenuButtonProps): React.ReactElement {
  const classes = cx('ui-sidebar__menu-button', isActive && 'is-active', className);

  if (asChild && React.isValidElement<SidebarMenuButtonChildProps>(children)) {
    return React.cloneElement(children, {
      className: cx(classes, children.props.className),
      title: tooltip ?? children.props.title,
      'data-active': isActive || undefined,
    });
  }

  return (
    <button
      type="button"
      className={classes}
      title={tooltip}
      data-active={isActive || undefined}
      {...props}
    >
      {children}
    </button>
  );
}
