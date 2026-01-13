"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, MoreVertical } from "lucide-react";
import { Card } from "./card";
import type { ColumnWithCards } from "../lib/types";

interface ColumnProps {
  column: ColumnWithCards;
  onAddCard?: () => void;
  onCardClick?: (cardId: string) => void;
  onColumnEdit?: () => void;
}

export function Column({
  column,
  onAddCard,
  onCardClick,
  onColumnEdit,
}: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: "column",
      column,
    },
  });

  const cards = column.cards || [];
  const cardCount = cards.length;
  const hasLimit = column.limit !== null && column.limit !== undefined;
  const isOverLimit = hasLimit && cardCount > column.limit!;

  return (
    <div className="flex flex-col w-80 flex-shrink-0 bg-gray-50 rounded-lg">
      {/* Column Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900">{column.name}</h3>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              isOverLimit
                ? "bg-red-100 text-red-700 font-medium"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            {cardCount}
            {hasLimit && ` / ${column.limit}`}
          </span>
        </div>

        <button
          onClick={onColumnEdit}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>

      {/* Cards Area */}
      <div
        ref={setNodeRef}
        className={`
          flex-1 p-3 space-y-2 overflow-y-auto
          ${isOver ? "bg-blue-50" : ""}
          transition-colors
        `}
        style={{ minHeight: "200px", maxHeight: "calc(100vh - 300px)" }}
      >
        <SortableContext
          items={cards.map((card) => card.id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card) => (
            <Card
              key={card.id}
              card={card}
              onClick={() => onCardClick?.(card.id)}
            />
          ))}
        </SortableContext>

        {cards.length === 0 && (
          <div className="flex items-center justify-center h-32 text-sm text-gray-400">
            No cards yet
          </div>
        )}
      </div>

      {/* Add Card Button */}
      <div className="p-3 border-t border-gray-200">
        <button
          onClick={onAddCard}
          className="w-full flex items-center justify-center gap-2 p-2 text-sm text-gray-600 hover:bg-gray-200 rounded transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add card</span>
        </button>
      </div>
    </div>
  );
}
