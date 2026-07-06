export function FilterButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button type="button" className="notes-filter-tab" aria-selected={active} onClick={onClick}>
      <span>{label}</span>
      <strong>{count}</strong>
    </button>
  );
}
