import { useCallback, useMemo, useState } from 'react';
import { find, prop, propEq } from 'ramda'
import {DndContext, useDraggable, useDroppable} from '@dnd-kit/core';
import {CSS} from '@dnd-kit/utilities';

function Draggable(props: any) {
  const {attributes, listeners, setNodeRef, transform} = useDraggable({
    id: props.id,
    data: {
      ...props.data,
    },
  });
  const style = useMemo(() => ({
    // Outputs `translate3d(x, y, 0)`
    transform: CSS.Translate.toString(transform),
    backgroundColor: 'red',
    transition: 'width 0.2s ease-in-out',
    width: props.plusWidth && props.id ? `${props.plusWidth + 100}px` : '100px',
    height: '100px',
  }), [props.plusWidth, transform]);

  return (
    <button ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {props.children}
    </button>
  );
}

function Droppable(props: any) {
  const {isOver, setNodeRef} = useDroppable({
    id: props.id,
    data: {
      containerId: props.id,
      plusWidth: props.plusWidth,
    },
  });
  const style = {
    opacity: isOver ? 1 : 0.5,
    backgroundColor: 'blue',
    width: '300px',
    height: '300px',
  };

  return (
    <div ref={setNodeRef} style={style}>
      {props.children}
    </div>
  );
}

const ListItems = ({
  items = [],
  containerData = null,
  activeItems = [],
  type,
  plusWidth
}:{
  items?: Array<any>,
  containerId?: string,
  activeItems?: Array<any>,
  type:'current' | 'active',
  plusWidth?: number | null,
  containerData?: any | null
}) => {
  const filetedItems = useMemo(() => {
    return items.filter((item) => {
      const draggedItem = find(propEq(item.draggedId, 'draggedId'))(activeItems);
      if (containerData?.containerId) {
        return item.containerId === containerData.containerId;
      }
      return !draggedItem;
    });
  }, [items, activeItems]);
  const filterActiveItems = useMemo(() => {
    return activeItems.filter((item) => {
      if (containerData?.containerId) {
        return item.containerId === containerData.containerId;
      }
      return true;
    });
  }, [activeItems, containerData]);
  const typeItems = type === 'current' ? filetedItems : filterActiveItems;
  return (
    <div className="flex gap-2">
      {typeItems.map((item) => (
        <Draggable id={item.draggedId} key={`${item.draggedId}-${containerData?.containerId}`} data={item} plusWidth={containerData?.plusWidth}>
          {item?.draggedId}
        </Draggable>
      ))}
    </div>
  );
}
const arr = [{draggedId: 1, name: '1', plusWidth: 0}, {draggedId: 2, name: '2', plusWidth: 0}, {draggedId: 3, name: '3', plusWidth: 0}, {draggedId: 4, name: '4', plusWidth: 0}, {draggedId: 5, name: '5', plusWidth: 0}];

function Example() {
  const containers = [{containerId: 'A', name: 'A', plusWidth: 40}, {containerId: 'B', name: 'B', plusWidth: 80}, {containerId: 'C', name: 'C', plusWidth: 120}];
  const [plusWidth, setPlusWidth] = useState<number | null>(null);
  const [activeItems, setActiveItems] = useState<Array<any>>([]);
  // console.log("🚀 ~ Example ~ activeItems:", activeItems)

  // console.log("🚀 ~ Example ~ filetedItems:", filetedItems)
  return (
    <DndContext onDragEnd={handleDragEnd} onDragOver={handleDragOver}>
      {<ListItems type='current' items={arr} activeItems={activeItems} />}

      {containers.map((container) => (
        <Droppable key={container.containerId} id={container.containerId} plusWidth={container.plusWidth}>
          <ListItems
          type='active'
          containerData={container}
          activeItems={activeItems} />
        </Droppable>
      ))}
    </DndContext>
  );

  function handleDragEnd(event: any) {
    // console.log("🚀 ~ handleDragEnd ~ event:", event)
    const {over, active} = event;
    // console.log("🚀 ~ handleDragEnd ~ over:", over)
    const data = {
      containerId: over.id,
      draggedId: active.data.current.draggedId,
      plusWidth: over.data.current?.plusWidth,
    }

    setActiveItems((prev) => {
      const findItem = find(propEq(active.id, 'draggedId'))(prev);
      if (findItem) {
        return prev.map((item) => item.draggedId === active.id ? data : item);
      } else {
        return [...prev, data];
      }
    });
    setPlusWidth(null);
  }

  function handleDragOver(event: any) {
    const {over} = event;
    // console.log("🚀 ~ handleDragOver ~ over:", over)
    if (over) {
      setPlusWidth(over.data.current?.plusWidth);
    }
  }
}

const CalendarComponent = () => {
  
  return (
    <div>
      <h1>Calendar</h1>
    <Example />
    </div>
  )
}

export default CalendarComponent;
