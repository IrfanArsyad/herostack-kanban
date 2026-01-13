/**
 * Card Detail API Route
 * Handles getting, updating, and deleting a specific card
 *
 * GET /api/plugins/kanban/cards/[cardId] - Get card details
 * PATCH /api/plugins/kanban/cards/[cardId] - Update card
 * DELETE /api/plugins/kanban/cards/[cardId] - Delete card
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import * as schema from "../../../schema";
import { kanbanCards } from "../../../schema";
import { checkBoardAccess, canEdit, canDelete } from "../../../lib/permissions";
import {
  logCardUpdated,
  logCardDeleted,
  logCardArchived,
  logCardAssigned,
} from "../../../lib/activity-logger";

/**
 * GET /api/plugins/kanban/cards/[cardId]
 * Get full card details with all related data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { cardId } = await params;

    // 1. Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get card with relations
    const card = await db.query.kanbanCards.findFirst({
      where: eq(kanbanCards.id, cardId),
      with: {
        checklistItems: {
          orderBy: (items, { asc }) => [asc(items.position)],
        },
        comments: {
          orderBy: (comments, { desc }) => [desc(comments.createdAt)],
        },
        attachments: {
          orderBy: (attachments, { desc }) => [desc(attachments.createdAt)],
        },
      },
    });

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // 3. Check board access
    const { hasAccess, role } = await checkBoardAccess(db, card.boardId, session.user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // 4. Add user details to assignee
    let assignee = null;
    if (card.assigneeId) {
      assignee = await db.query.users?.findFirst({
        where: eq(schema.users.id, card.assigneeId),
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      });
    }

    // 5. Add user details to comments
    if (card.comments && card.comments.length > 0) {
      const commentsWithUsers = await Promise.all(
        card.comments.map(async (comment) => {
          const user = await db.query.users?.findFirst({
            where: eq(schema.users.id, comment.userId),
            columns: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          });
          return { ...comment, user };
        })
      );
      (card as any).comments = commentsWithUsers;
    }

    // 6. Add user details to attachments
    if (card.attachments && card.attachments.length > 0) {
      const attachmentsWithUsers = await Promise.all(
        card.attachments.map(async (attachment) => {
          const uploader = await db.query.users?.findFirst({
            where: eq(schema.users.id, attachment.uploadedBy),
            columns: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          });
          return { ...attachment, uploader };
        })
      );
      (card as any).attachments = attachmentsWithUsers;
    }

    // 7. Calculate checklist stats
    const checklistStats = {
      total: card.checklistItems?.length || 0,
      completed: card.checklistItems?.filter((item) => item.isCompleted).length || 0,
    };

    return NextResponse.json({
      card: {
        ...card,
        assignee,
        _count: {
          checklistItems: checklistStats.total,
          completedChecklistItems: checklistStats.completed,
          comments: card.comments?.length || 0,
          attachments: card.attachments?.length || 0,
        },
      },
      role,
    });
  } catch (error) {
    console.error("Error fetching card:", error);
    return NextResponse.json(
      { error: "Failed to fetch card" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/plugins/kanban/cards/[cardId]
 * Update card details
 *
 * Body:
 * - title: string (optional)
 * - description: string (optional)
 * - priority: "low" | "medium" | "high" | "urgent" (optional)
 * - assigneeId: string | null (optional)
 * - dueDate: string | null (optional)
 * - labels: string[] (optional)
 * - isArchived: boolean (optional)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { cardId } = await params;

    // 1. Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get card
    const card = await db.query.kanbanCards.findFirst({
      where: eq(kanbanCards.id, cardId),
    });

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // 3. Check board access and permissions
    const { hasAccess, role } = await checkBoardAccess(db, card.boardId, session.user.id);
    if (!hasAccess || !role) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (!canEdit(role)) {
      return NextResponse.json(
        { error: "You don't have permission to edit cards" },
        { status: 403 }
      );
    }

    // 4. Parse request body
    const body = await request.json();
    const { title, description, priority, assigneeId, dueDate, labels, isArchived } = body;

    // Build updates
    const updates: any = {
      updatedAt: new Date(),
    };

    const changes: Record<string, any> = {};

    if (title !== undefined) {
      if (!title.trim()) {
        return NextResponse.json({ error: "Card title cannot be empty" }, { status: 400 });
      }
      updates.title = title.trim();
      changes.title = title.trim();
    }

    if (description !== undefined) {
      updates.description = description?.trim() || null;
      changes.description = description;
    }

    if (priority !== undefined) {
      updates.priority = priority;
      changes.priority = priority;
    }

    if (assigneeId !== undefined) {
      updates.assigneeId = assigneeId || null;
      changes.assigneeId = assigneeId;

      // Log assignment separately
      if (assigneeId) {
        const assignee = await db.query.users?.findFirst({
          where: eq(schema.users.id, assigneeId),
        });
        if (assignee) {
          await logCardAssigned(
            db,
            card.boardId,
            cardId,
            session.user.id,
            card.title,
            assigneeId,
            assignee.name || assignee.email
          );
        }
      }
    }

    if (dueDate !== undefined) {
      updates.dueDate = dueDate ? new Date(dueDate) : null;
      changes.dueDate = dueDate;
    }

    if (labels !== undefined) {
      updates.labels = labels || [];
      changes.labels = labels;
    }

    if (isArchived !== undefined) {
      updates.isArchived = isArchived;
      changes.isArchived = isArchived;

      // Log archive activity separately
      await logCardArchived(
        db,
        card.boardId,
        cardId,
        session.user.id,
        card.title,
        isArchived
      );
    }

    // 5. Update card
    const [updatedCard] = await db
      .update(kanbanCards)
      .set(updates)
      .where(eq(kanbanCards.id, cardId))
      .returning();

    // 6. Log activity (excluding assignment and archive which are logged separately)
    if (Object.keys(changes).length > 0 && !changes.assigneeId && isArchived === undefined) {
      await logCardUpdated(
        db,
        card.boardId,
        cardId,
        session.user.id,
        updatedCard.title,
        changes
      );
    }

    // 7. Fetch updated card with assignee
    let assignee = null;
    if (updatedCard.assigneeId) {
      assignee = await db.query.users?.findFirst({
        where: eq(schema.users.id, updatedCard.assigneeId),
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      });
    }

    return NextResponse.json({
      card: {
        ...updatedCard,
        assignee,
      },
    });
  } catch (error) {
    console.error("Error updating card:", error);
    return NextResponse.json(
      { error: "Failed to update card" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/plugins/kanban/cards/[cardId]
 * Delete card (owner or editor can delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const { cardId } = await params;

    // 1. Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get card
    const card = await db.query.kanbanCards.findFirst({
      where: eq(kanbanCards.id, cardId),
    });

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // 3. Check board access and permissions
    const { hasAccess, role } = await checkBoardAccess(db, card.boardId, session.user.id);
    if (!hasAccess || !role) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (!canEdit(role)) {
      return NextResponse.json(
        { error: "You don't have permission to delete cards" },
        { status: 403 }
      );
    }

    // 4. Log activity before deletion
    await logCardDeleted(db, card.boardId, cardId, session.user.id, card.title);

    // 5. Delete card (cascade will delete related data)
    await db.delete(kanbanCards).where(eq(kanbanCards.id, cardId));

    return NextResponse.json({
      message: "Card deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting card:", error);
    return NextResponse.json(
      { error: "Failed to delete card" },
      { status: 500 }
    );
  }
}
