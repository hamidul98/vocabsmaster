import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import type { Word } from '@/lib/types';
import { WordRow } from './WordCard';
import { Icon } from './ui';

function SortableRow({ word, index, hideMeanings }: { word: Word; index: number; hideMeanings: boolean }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: word.id });
  return <WordRow word={word} index={index} hideMeanings={hideMeanings} drag={{
    ref: setNodeRef,
    style: { transform: CSS.Transform.toString(transform), transition },
    dragging: isDragging,
    handle: <button type="button" ref={setActivatorNodeRef} className="drag-handle" aria-label={`Drag to reorder ${word.word}`} {...attributes} {...listeners}><Icon name="drag_indicator" size={20} /></button>,
  }} />;
}

/**
 * List view with drag-to-reorder. `ordered` is the full collection in its current order; `shown` is the
 * visible prefix (paging). Dropping saves the new order of the full collection via `onReorder`.
 */
export function SortableWordList({ ordered, shown, hideMeanings, onReorder }: { ordered: Word[]; shown: Word[]; hideMeanings: boolean; onReorder: (ids: string[]) => void }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const ids = ordered.map((w) => w.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(ids, from, to));
  };
  return <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis, restrictToParentElement]} onDragEnd={onDragEnd}>
    <SortableContext items={shown.map((w) => w.id)} strategy={verticalListSortingStrategy}>
      <ul className="word-list sortable">{shown.map((w, i) => <SortableRow key={w.id} word={w} index={i} hideMeanings={hideMeanings} />)}</ul>
    </SortableContext>
  </DndContext>;
}
