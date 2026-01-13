"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, Paperclip, CheckSquare, MessageSquare, GripVertical } from "lucide-react";
import type { CardWithDetails } from "../lib/types";

interface CardProps {
  card: CardWithDetails;
  onClick?: () => void;
}

export function Card({ card, onClick }: CardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: {
      type: "card",
      card,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Priority colors
  const priorityColors = {
    low: "border-l-4 border-l-blue-400",
    medium: "border-l-4 border-l-yellow-400",
    high: "border-l-4 border-l-orange-400",
    urgent: "border-l-4 border-l-red-500",
  };

  // Check if card has activity
  const hasChecklist = (card._count?.checklistItems || 0) > 0;
  const hasAttachments = (card._count?.attachments || 0) > 0;
  const hasComments = (card._count?.comments || 0) > 0;
  const hasDueDate = !!card.dueDate;

  // Check if due date is overdue
  const isOverdue = card.dueDate && new Date(card.dueDate) < new Date() && !card.isArchived;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group relative bg-white rounded-lg shadow-sm border border-gray-200
        hover:shadow-md transition-shadow cursor-pointer
        ${priorityColors[card.priority || "medium"]}
        ${isDragging ? "opacity-50" : ""}
      `}
      onClick={onClick}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute -left-6 top-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 text-gray-400" />
      </div>

      <div className="p-3">
        {/* Labels */}
        {card.labels && card.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {card.labels.map((label, index) => (
              <span
                key={index}
                className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded"
              >
                {label}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h4 className="text-sm font-medium text-gray-900 mb-2 line-clamp-3">
          {card.title}
        </h4>

        {/* Metadata Row */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {/* Due Date */}
          {hasDueDate && (
            <div
              className={`flex items-center gap-1 ${
                isOverdue ? "text-red-600 font-medium" : ""
              }`}
            >
              <Calendar className="h-3 w-3" />
              <span>
                {new Date(card.dueDate!).toLocaleDateString("id-ID", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          )}

          {/* Checklist Progress */}
          {hasChecklist && (
            <div className="flex items-center gap-1">
              <CheckSquare className="h-3 w-3" />
              <span>
                {card._count?.completedChecklistItems || 0}/{card._count?.checklistItems || 0}
              </span>
            </div>
          )}

          {/* Attachments Count */}
          {hasAttachments && (
            <div className="flex items-center gap-1">
              <Paperclip className="h-3 w-3" />
              <span>{card._count?.attachments}</span>
            </div>
          )}

          {/* Comments Count */}
          {hasComments && (
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              <span>{card._count?.comments}</span>
            </div>
          )}
        </div>

        {/* Assignee */}
        {card.assignee && (
          <div className="mt-2 flex items-center gap-2">
            {card.assignee.image ? (
              <img
                src={card.assignee.image}
                alt={card.assignee.name || "Assignee"}
                className="h-6 w-6 rounded-full"
              />
            ) : (
              <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                {card.assignee.name?.charAt(0) || card.assignee.email.charAt(0)}
              </div>
            )}
            <span className="text-xs text-gray-600 truncate">
              {card.assignee.name || card.assignee.email}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
