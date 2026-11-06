import { useState } from 'react';
import { Button, Drawer, Dropdown, Label, ListBox, Select, useOverlayState } from '@heroui/react';
import type { PassageRef } from '@/lib/types';
import { activeCount, EMPTY_FILTERS, optionsFor, type Filters, type SortF, type StatusF, type WordsF } from '@/lib/filters';
import { shortBook } from '@/hooks/useStats';
import { ChipSelect, FilterSelect, Icon, SearchInput } from './ui';

type Field = 'book' | 'test' | 'passage' | 'status' | 'words' | 'sort' | 'q';
interface Props {
  index: PassageRef[];
  value: Filters;
  onChange: (f: Filters) => void;
  /** which controls to show (Practice / Search use fewer) */
  fields?: Field[];
  placeholder?: string;
  /** shown on the left of the phone's Filters button (e.g. "6 passages · 688 words") */
  summary?: React.ReactNode;
}
const SORTS: { id: SortF; label: string }[] = [{ id: 'book', label: 'Book order' }, { id: 'recent', label: 'Most recent' }, { id: 'least', label: 'Least progress' }, { id: 'difficult', label: 'Most difficult' }];
const ALL: Field[] = ['book', 'test', 'passage', 'status', 'words', 'sort', 'q'];

/** The controls themselves — used inline on desktop and inside the bottom sheet on mobile. */
function Controls({ index, value, onChange, fields = ALL, placeholder }: Props) {
  const has = (f: Field) => fields.includes(f);
  const books = [...new Map(index.map((r) => [String(r.bookNumber), shortBook(r.bookName)])).entries()];
  const { tests, passages } = optionsFor(index, value);
  // keep dependent filters valid when a parent changes
  const change = (next: Filters) => {
    const o = optionsFor(index, next);
    onChange({
      ...next,
      test: next.test && o.tests.includes(Number(next.test)) ? next.test : '',
      passage: next.passage && o.passages.includes(Number(next.passage)) ? next.passage : '',
    });
  };
  return <div className="filter-controls">
    {has('q') && <SearchInput value={value.q} onChange={(q) => change({ ...value, q })} placeholder={placeholder ?? 'Search passages or words…'}/>}
    <div className="filter-selects">
      {has('book') && <Select className="filter-select" aria-label="Book" selectionMode="multiple" placeholder="All books"
        value={value.books} onChange={(v) => change({ ...value, books: (v as unknown as (string | number)[]).map(String) })}>
        <Label>Book</Label>
        <Select.Trigger><Select.Value/><Select.Indicator/></Select.Trigger>
        <Select.Popover><ListBox selectionMode="multiple">{books.map(([id, name]) => <ListBox.Item key={id} id={id} textValue={name}>{name}<ListBox.ItemIndicator/></ListBox.Item>)}</ListBox></Select.Popover>
      </Select>}
      {has('test') && <FilterSelect label="Test" value={value.test || 'all'} onChange={(v) => change({ ...value, test: v === 'all' ? '' : v })}
        options={[{ id: 'all', label: 'All tests' }, ...tests.map((t) => ({ id: String(t), label: `Test ${t}` }))]}/>}
      {has('passage') && <FilterSelect label="Passage" value={value.passage || 'all'} onChange={(v) => change({ ...value, passage: v === 'all' ? '' : v })}
        options={[{ id: 'all', label: 'All passages' }, ...passages.map((p) => ({ id: String(p), label: `Passage ${p}` }))]}/>}
      {has('sort') && <Dropdown>
        <Button isIconOnly variant="secondary" className="sort-btn round" aria-label={`Sort: ${SORTS.find((x) => x.id === value.sort)?.label}`}><Icon name="sort" size={22}/>{value.sort !== 'book' && <span className="dot"/>}</Button>
        <Dropdown.Popover><Dropdown.Menu aria-label="Sort passages" selectionMode="single" selectedKeys={new Set([value.sort])}
          onSelectionChange={(keys) => { const k = [...(keys as Set<string>)][0]; if (k) change({ ...value, sort: k as SortF }); }}>
          {SORTS.map((o) => <Dropdown.Item key={o.id} id={o.id} textValue={o.label}>{o.label}<Dropdown.ItemIndicator/></Dropdown.Item>)}
        </Dropdown.Menu></Dropdown.Popover>
      </Dropdown>}
    </div>
    {has('status') && <ChipSelect<StatusF> label="Status" value={value.status} onChange={(status) => change({ ...value, status })}
      options={[{ id: 'all', label: 'All' }, { id: 'new', label: 'Not started' }, { id: 'progress', label: 'In progress' }, { id: 'done', label: 'Completed' }]}/>}
    {has('words') && <ChipSelect<WordsF> label="Words" value={value.words} onChange={(words) => change({ ...value, words })}
      options={[{ id: 'all', label: 'All' }, { id: 'learned', label: 'Learned' }, { id: 'difficult', label: <><Icon name="star" size={16} filled/> Difficult</> }, { id: 'new', label: 'New' }]}/>}
  </div>;
}

export default function FilterBar(props: Props) {
  const { value, onChange, summary } = props;
  const drawer = useOverlayState();
  const [draft, setDraft] = useState(value);
  const n = activeCount(value);
  const chips: { label: string; clear: Partial<Filters> }[] = [
    ...value.books.map((b) => ({ label: `Book ${b}`, clear: { books: value.books.filter((x) => x !== b) } })),
    ...(value.test ? [{ label: `Test ${value.test}`, clear: { test: '', passage: '' } }] : []),
    ...(value.passage ? [{ label: `Passage ${value.passage}`, clear: { passage: '' } }] : []),
    ...(value.status !== 'all' ? [{ label: `Status: ${value.status === 'new' ? 'Not started' : value.status === 'progress' ? 'In progress' : 'Completed'}`, clear: { status: 'all' as StatusF } }] : []),
    ...(value.words !== 'all' ? [{ label: `Words: ${value.words}`, clear: { words: 'all' as WordsF } }] : []),
    ...(value.q ? [{ label: `“${value.q}”`, clear: { q: '' } }] : []),
  ];
  return <div className="filter-bar">
    <div className="filter-desktop"><Controls {...props}/></div>
    <div className="filter-mobile">
      <div className="filter-mobile-row">
      {summary && <strong className="mobile-summary">{summary}</strong>}
      <Button variant="secondary" onPress={() => { setDraft(value); drawer.open(); }}><Icon name="filter" size={18}/>Filters{n ? ` (${n})` : ''}</Button>
      </div>
      <Drawer state={drawer}><Drawer.Backdrop><Drawer.Content placement="bottom"><Drawer.Dialog>
        <Drawer.Header><Drawer.Heading>Filters</Drawer.Heading></Drawer.Header>
        <Drawer.Body><Controls {...props} value={draft} onChange={setDraft}/></Drawer.Body>
        <Drawer.Footer>
          <Button variant="secondary" onPress={() => setDraft({ ...EMPTY_FILTERS, sort: draft.sort })}>Reset</Button>
          <Button onPress={() => { onChange(draft); drawer.close(); }}>Apply</Button>
        </Drawer.Footer>
      </Drawer.Dialog></Drawer.Content></Drawer.Backdrop></Drawer>
    </div>
    {chips.length > 0 && <div className="active-filters" aria-label="Active filters">
      {chips.map((c) => <Button key={c.label} size="sm" variant="secondary" className="pill" aria-label={`Remove ${c.label}`} onPress={() => onChange({ ...value, ...c.clear })}>{c.label}<Icon name="close" size={14}/></Button>)}
      <Button size="sm" variant="ghost" onPress={() => onChange({ ...EMPTY_FILTERS, sort: value.sort })}>Clear all</Button>
    </div>}
  </div>;
}
