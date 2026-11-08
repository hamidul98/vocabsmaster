import { Button, Card, Input, Label, ListBox, ProgressBar, Select, Skeleton, TextField } from '@heroui/react';
import type { ReactNode } from 'react';
import { Mascot } from './art';

/** Short names -> Material Symbol names. Any other name is passed straight through as a Material Symbol. */
const ICONS: Record<string, string> = {
  book: 'menu_book', search: 'search', star: 'star', settings: 'settings', check: 'check_circle',
  arrow: 'arrow_forward', back: 'arrow_back', sound: 'volume_up', sun: 'light_mode', moon: 'dark_mode',
  flame: 'local_fire_department', file: 'description', shuffle: 'shuffle',
  home: 'home', library: 'library_books', practice: 'psychology', progress: 'bar_chart', bell: 'notifications',
  cards: 'layers', quiz: 'task_alt', play: 'play_arrow', gem: 'diamond', gift: 'redeem', filter: 'tune',
  close: 'close', info: 'info', refresh: 'refresh', chevron: 'chevron_right', down: 'expand_more', grid: 'grid_view', table: 'table_rows',
  phone: 'install_mobile', wave: 'waving_hand', sparkle: 'auto_awesome', external: 'north_east', offline: 'cloud_done', profile: 'person',
};
/** Google Material Symbols (Outlined) font icon — https://fonts.google.com/icons */
export function Icon({ name, size = 20, filled = false }: { name: string; size?: number; filled?: boolean }) {
  return <span className="material-symbols-outlined" style={{ fontSize: size, fontVariationSettings: filled ? '"FILL" 1' : undefined }} aria-hidden="true">{ICONS[name] ?? name}</span>;
}
export function Meter({ value, label }: { value: number; label: string }) {
  return <ProgressBar value={value} aria-label={label} className="meter"><ProgressBar.Track><ProgressBar.Fill /></ProgressBar.Track></ProgressBar>;
}
/** Two-layer bar: light = seen/engaged (covered), solid = learned. */
export function StackedMeter({ learned, covered, label }: { learned: number; covered: number; label: string }) {
  return <div className="meter stacked" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={learned}>
    <div className="stacked-track"><i className="covered" style={{ width: `${Math.max(covered, learned)}%` }}/><i className="learned" style={{ width: `${learned}%` }}/></div>
  </div>;
}
export function SearchInput({ value, onChange, placeholder = 'Search vocabulary…' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <TextField aria-label={placeholder} value={value} onChange={onChange} className="search-field"><Icon name="search"/><Input placeholder={placeholder}/></TextField>;
}
export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return <Card className="empty"><Mascot size={110} mood="sleepy"/><h2>{title}</h2><p>{children}</p>{action}</Card>;
}
export function Loading() { return <div className="loading-grid" aria-label="Loading vocabulary">{[1,2,3,4].map(n => <Skeleton key={n} className="loading-card" />)}</div>; }
export function Failure({ message, retry }: { message: string; retry?: () => void }) { return <Card className="empty"><Mascot size={110} mood="confused"/><h2>Let’s try that again</h2><p role="alert">{message}</p>{retry && <Button onPress={retry}>Try again</Button>}</Card>; }

/** Skeletons shaped like the dashboard cards. */
export function HomeSkeleton() {
  return <div className="home-skeleton" aria-label="Loading">
    <Skeleton className="sk-hero"/><Skeleton className="sk-wide"/>
    <div className="sk-row">{[1,2,3,4].map(n => <Skeleton key={n} className="sk-tile"/>)}</div>
  </div>;
}

/** Filter dropdown built from HeroUI Select + ListBox. */
export function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { id: string; label: string }[] }) {
  return <Select className="filter-select" aria-label={label} selectedKey={value} onSelectionChange={k => onChange(String(k))}>
    <Label>{label}</Label>
    <Select.Trigger><Select.Value/><Select.Indicator/></Select.Trigger>
    <Select.Popover><ListBox>{options.map(o => <ListBox.Item key={o.id} id={o.id} textValue={o.label}>{o.label}<ListBox.ItemIndicator/></ListBox.Item>)}</ListBox></Select.Popover>
  </Select>;
}

/** Single-choice pill chips (All · Not started · In progress …). */
export function ChipSelect<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: { id: T; label: ReactNode }[] }) {
  return <div className="chip-select" role="group" aria-label={label}><span className="chip-select-label">{label}</span>
    {options.map(o => <Button key={o.id} size="sm" variant={value === o.id ? 'primary' : 'secondary'} aria-pressed={value === o.id} className="pill" onPress={() => onChange(o.id)}>{o.label}</Button>)}
  </div>;
}
