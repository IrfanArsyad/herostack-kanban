/**
 * Activity Logger
 * Utilities for logging board and card activities
 */

import { kanbanActivities, type ActivityType } from "@/lib/db/schemas/kanban";

/**
 * Log an activity to the kanban_activities table
 *
 * @param db - Drizzle database instance
 * @param params - Activity parameters
 */
export async function logActivity(
  db: any,
  params: {
    boardId: string;
    cardId?: string;
    userId?: string;
    type: ActivityType;
    metadata?: Record<string, any>;
  }
) {
  try {
    await db.insert(kanbanActivities).values({
      boardId: params.boardId,
      cardId: params.cardId || null,
      userId: params.userId || null,
      type: params.type,
      metadata: params.metadata || {},
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
    // Don't throw - activity logging should not break the main operation
  }
}

/**
 * Log board created activity
 */
export async function logBoardCreated(
  db: any,
  boardId: string,
  userId: string,
  boardName: string
) {
  return logActivity(db, {
    boardId,
    userId,
    type: "board_created",
    metadata: { boardName },
  });
}

/**
 * Log board updated activity
 */
export async function logBoardUpdated(
  db: any,
  boardId: string,
  userId: string,
  changes: Record<string, any>
) {
  return logActivity(db, {
    boardId,
    userId,
    type: "board_updated",
    metadata: { changes },
  });
}

/**
 * Log board deleted activity
 */
export async function logBoardDeleted(
  db: any,
  boardId: string,
  userId: string,
  boardName: string
) {
  return logActivity(db, {
    boardId,
    userId,
    type: "board_deleted",
    metadata: { boardName },
  });
}

/**
 * Log board archived/unarchived activity
 */
export async function logBoardArchived(
  db: any,
  boardId: string,
  userId: string,
  isArchived: boolean
) {
  return logActivity(db, {
    boardId,
    userId,
    type: "board_archived",
    metadata: { isArchived },
  });
}

/**
 * Log column created activity
 */
export async function logColumnCreated(
  db: any,
  boardId: string,
  userId: string,
  columnName: string
) {
  return logActivity(db, {
    boardId,
    userId,
    type: "column_created",
    metadata: { columnName },
  });
}

/**
 * Log column updated activity
 */
export async function logColumnUpdated(
  db: any,
  boardId: string,
  userId: string,
  columnName: string,
  changes: Record<string, any>
) {
  return logActivity(db, {
    boardId,
    userId,
    type: "column_updated",
    metadata: { columnName, changes },
  });
}

/**
 * Log column deleted activity
 */
export async function logColumnDeleted(
  db: any,
  boardId: string,
  userId: string,
  columnName: string
) {
  return logActivity(db, {
    boardId,
    userId,
    type: "column_deleted",
    metadata: { columnName },
  });
}

/**
 * Log column reordered activity
 */
export async function logColumnReordered(
  db: any,
  boardId: string,
  userId: string
) {
  return logActivity(db, {
    boardId,
    userId,
    type: "column_reordered",
  });
}

/**
 * Log card created activity
 */
export async function logCardCreated(
  db: any,
  boardId: string,
  cardId: string,
  userId: string,
  cardTitle: string
) {
  return logActivity(db, {
    boardId,
    cardId,
    userId,
    type: "card_created",
    metadata: { cardTitle },
  });
}

/**
 * Log card updated activity
 */
export async function logCardUpdated(
  db: any,
  boardId: string,
  cardId: string,
  userId: string,
  cardTitle: string,
  changes: Record<string, any>
) {
  return logActivity(db, {
    boardId,
    cardId,
    userId,
    type: "card_updated",
    metadata: { cardTitle, changes },
  });
}

/**
 * Log card deleted activity
 */
export async function logCardDeleted(
  db: any,
  boardId: string,
  cardId: string,
  userId: string,
  cardTitle: string
) {
  return logActivity(db, {
    boardId,
    cardId,
    userId,
    type: "card_deleted",
    metadata: { cardTitle },
  });
}

/**
 * Log card moved activity
 */
export async function logCardMoved(
  db: any,
  boardId: string,
  cardId: string,
  userId: string,
  cardTitle: string,
  fromColumn: string,
  toColumn: string
) {
  return logActivity(db, {
    boardId,
    cardId,
    userId,
    type: "card_moved",
    metadata: { cardTitle, fromColumn, toColumn },
  });
}

/**
 * Log card archived activity
 */
export async function logCardArchived(
  db: any,
  boardId: string,
  cardId: string,
  userId: string,
  cardTitle: string,
  isArchived: boolean
) {
  return logActivity(db, {
    boardId,
    cardId,
    userId,
    type: "card_archived",
    metadata: { cardTitle, isArchived },
  });
}

/**
 * Log card assigned activity
 */
export async function logCardAssigned(
  db: any,
  boardId: string,
  cardId: string,
  userId: string,
  cardTitle: string,
  assigneeId: string,
  assigneeName: string
) {
  return logActivity(db, {
    boardId,
    cardId,
    userId,
    type: "card_assigned",
    metadata: { cardTitle, assigneeId, assigneeName },
  });
}

/**
 * Log comment added activity
 */
export async function logCommentAdded(
  db: any,
  boardId: string,
  cardId: string,
  userId: string,
  cardTitle: string
) {
  return logActivity(db, {
    boardId,
    cardId,
    userId,
    type: "comment_added",
    metadata: { cardTitle },
  });
}

/**
 * Log comment deleted activity
 */
export async function logCommentDeleted(
  db: any,
  boardId: string,
  cardId: string,
  userId: string,
  cardTitle: string
) {
  return logActivity(db, {
    boardId,
    cardId,
    userId,
    type: "comment_deleted",
    metadata: { cardTitle },
  });
}

/**
 * Log attachment added activity
 */
export async function logAttachmentAdded(
  db: any,
  boardId: string,
  cardId: string,
  userId: string,
  cardTitle: string,
  fileName: string
) {
  return logActivity(db, {
    boardId,
    cardId,
    userId,
    type: "attachment_added",
    metadata: { cardTitle, fileName },
  });
}

/**
 * Log attachment deleted activity
 */
export async function logAttachmentDeleted(
  db: any,
  boardId: string,
  cardId: string,
  userId: string,
  cardTitle: string,
  fileName: string
) {
  return logActivity(db, {
    boardId,
    cardId,
    userId,
    type: "attachment_deleted",
    metadata: { cardTitle, fileName },
  });
}

/**
 * Log member added activity
 */
export async function logMemberAdded(
  db: any,
  boardId: string,
  userId: string,
  newMemberId: string,
  newMemberName: string,
  role: string
) {
  return logActivity(db, {
    boardId,
    userId,
    type: "member_added",
    metadata: { newMemberId, newMemberName, role },
  });
}

/**
 * Log member removed activity
 */
export async function logMemberRemoved(
  db: any,
  boardId: string,
  userId: string,
  removedMemberId: string,
  removedMemberName: string
) {
  return logActivity(db, {
    boardId,
    userId,
    type: "member_removed",
    metadata: { removedMemberId, removedMemberName },
  });
}

/**
 * Log member role changed activity
 */
export async function logMemberRoleChanged(
  db: any,
  boardId: string,
  userId: string,
  targetMemberId: string,
  targetMemberName: string,
  oldRole: string,
  newRole: string
) {
  return logActivity(db, {
    boardId,
    userId,
    type: "member_role_changed",
    metadata: { targetMemberId, targetMemberName, oldRole, newRole },
  });
}

/**
 * Log checklist item added activity
 */
export async function logChecklistItemAdded(
  db: any,
  boardId: string,
  cardId: string,
  userId: string,
  cardTitle: string
) {
  return logActivity(db, {
    boardId,
    cardId,
    userId,
    type: "checklist_item_added",
    metadata: { cardTitle },
  });
}

/**
 * Log checklist item completed activity
 */
export async function logChecklistItemCompleted(
  db: any,
  boardId: string,
  cardId: string,
  userId: string,
  cardTitle: string,
  isCompleted: boolean
) {
  const type = isCompleted ? "checklist_item_completed" : "checklist_item_uncompleted";
  return logActivity(db, {
    boardId,
    cardId,
    userId,
    type,
    metadata: { cardTitle },
  });
}

/**
 * Log checklist item deleted activity
 */
export async function logChecklistItemDeleted(
  db: any,
  boardId: string,
  cardId: string,
  userId: string,
  cardTitle: string
) {
  return logActivity(db, {
    boardId,
    cardId,
    userId,
    type: "checklist_item_deleted",
    metadata: { cardTitle },
  });
}
