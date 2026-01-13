"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Column } from "./column";
import { Card } from "./card";
import type { BoardWithRelations, KanbanCard } from "../lib/types";

interface BoardViewProps {
  board: BoardWithRelations;
  onCardMove?: (cardId: string, columnId: string, position: number) => Promise<void>;
  onCardClick?: (cardId: string) => void;
  onAddCard?: (columnId: string) => void;
  onColumnEdit?: (columnId: string) => void;
}

export function BoardView({
  board,
  onCardMove,
  onCardClick,
  onAddCard,
  onColumnEdit,
}: BoardViewProps) {
  const [activeCard, setActiveCard] = useState<KanbanCard | null>(null);
  const [columns, setColumns] = useState(board.columns || []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;

    if (active.data.current?.type === "card") {
      setActiveCard(active.data.current.card);
    }
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Moving card over another card
    if (activeData?.type === "card" && overData?.type === "card") {
      const activeCard = activeData.card;
      const overCard = overData.card;

      if (activeCard.columnId !== overCard.columnId) {
        // Moving to different column - update local state optimistically
        setColumns((prevColumns) => {
          const newColumns = prevColumns.map((col) => {
            if (col.id === activeCard.columnId) {
              // Remove from source column
              return {
                ...col,
                cards: col.cards?.filter((c) => c.id !== activeCard.id) || [],
              };
            } else if (col.id === overCard.columnId) {
              // Add to target column
              const overCardIndex = col.cards?.findIndex((c) => c.id === overCard.id) ?? 0;
              const newCards = [...(col.cards || [])];
              newCards.splice(overCardIndex, 0, activeCard);
              return {
                ...col,
                cards: newCards,
              };
            }
            return col;
          });
          return newColumns;
        });
      }
    }

    // Moving card over column
    if (activeData?.type === "card" && overData?.type === "column") {
      const activeCard = activeData.card;
      const overColumn = overData.column;

      if (activeCard.columnId !== overColumn.id) {
        // Moving to different column
        setColumns((prevColumns) => {
          const newColumns = prevColumns.map((col) => {
            if (col.id === activeCard.columnId) {
              // Remove from source column
              return {
                ...col,
                cards: col.cards?.filter((c) => c.id !== activeCard.id) || [],
              };
            } else if (col.id === overColumn.id) {
              // Add to end of target column
              return {
                ...col,
                cards: [...(col.cards || []), activeCard],
              };
            }
            return col;
          });
          return newColumns;
        });
      }
    }
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      setActiveCard(null);

      if (!over) return;

      const activeData = active.data.current;
      const overData = over.data.current;

      if (activeData?.type === "card") {
        const activeCard = activeData.card;
        let targetColumnId = activeCard.columnId;
        let targetPosition = 0;

        // Determine target column and position
        if (overData?.type === "card") {
          const overCard = overData.card;
          targetColumnId = overCard.columnId;

          // Find position in target column
          const targetColumn = columns.find((col) => col.id === targetColumnId);
          const overCardIndex = targetColumn?.cards?.findIndex((c) => c.id === overCard.id) ?? 0;
          targetPosition = overCardIndex;
        } else if (overData?.type === "column") {
          const overColumn = overData.column;
          targetColumnId = overColumn.id;
          targetPosition = overColumn.cards?.length || 0;
        }

        // Call API to persist the move
        if (onCardMove) {
          try {
            await onCardMove(activeCard.id, targetColumnId, targetPosition);
          } catch (error) {
            console.error("Failed to move card:", error);
            // Revert local state on error
            setColumns(board.columns || []);
          }
        }
      }
    },
    [columns, board.columns, onCardMove]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 px-6">
        {columns.map((column) => (
          <Column
            key={column.id}
            column={column}
            onAddCard={() => onAddCard?.(column.id)}
            onCardClick={onCardClick}
            onColumnEdit={() => onColumnEdit?.(column.id)}
          />
        ))}

        {columns.length === 0 && (
          <div className="flex items-center justify-center w-full h-64 text-gray-400">
            <p>No columns yet. Add a column to get started.</p>
          </div>
        )}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeCard ? (
          <div className="rotate-3 opacity-80">
            <Card card={activeCard as any} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
