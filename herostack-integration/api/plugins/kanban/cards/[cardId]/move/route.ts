/**
 * Move Card API Route
 * POST /api/plugins/kanban/cards/[cardId]/move
 *
 * Handles moving cards between columns (drag and drop)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq, and, gte, lte, between } from "drizzle-orm";
import * as schema from "../../../../schema";
import { kanbanCards, kanbanColumns } from "../../../../schema";
import { checkBoardAccess, canEdit } from "../../../../lib/permissions";
import { logCardMoved } from "../../../../lib/activity-logger";

/**
 * POST /api/plugins/kanban/cards/[cardId]/move
 * Move card to a different column and/or position
 *
 * Body:
 * - columnId: string (required) - Target column ID
 * - position: number (required) - Target position in column
 */
export async function POST(
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
      with: {
        column: true,
      },
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
        { error: "You don't have permission to move cards" },
        { status: 403 }
      );
    }

    // 4. Parse request body
    const body = await request.json();
    const { columnId, position } = body;

    if (!columnId) {
      return NextResponse.json({ error: "columnId is required" }, { status: 400 });
    }

    if (position === undefined || position < 0) {
      return NextResponse.json({ error: "position is required and must be >= 0" }, { status: 400 });
    }

    // 5. Verify target column exists and belongs to same board
    const targetColumn = await db.query.kanbanColumns.findFirst({
      where: and(
        eq(kanbanColumns.id, columnId),
        eq(kanbanColumns.boardId, card.boardId)
      ),
    });

    if (!targetColumn) {
      return NextResponse.json(
        { error: "Target column not found in this board" },
        { status: 404 }
      );
    }

    const sourceColumnId = card.columnId;
    const sourcePosition = card.position;

    // 6. Handle card movement
    if (sourceColumnId === columnId) {
      // Moving within same column
      if (sourcePosition === position) {
        // No change
        return NextResponse.json({ card });
      }

      if (sourcePosition < position) {
        // Moving down: decrease position of cards between old and new position
        await db
          .update(kanbanCards)
          .set({ position: db.raw("position - 1"), updatedAt: new Date() })
          .where(
            and(
              eq(kanbanCards.columnId, columnId),
              eq(kanbanCards.isArchived, false),
              gte(kanbanCards.position, sourcePosition + 1),
              lte(kanbanCards.position, position)
            )
          );
      } else {
        // Moving up: increase position of cards between new and old position
        await db
          .update(kanbanCards)
          .set({ position: db.raw("position + 1"), updatedAt: new Date() })
          .where(
            and(
              eq(kanbanCards.columnId, columnId),
              eq(kanbanCards.isArchived, false),
              gte(kanbanCards.position, position),
              lte(kanbanCards.position, sourcePosition - 1)
            )
          );
      }
    } else {
      // Moving to different column

      // Decrease position of cards after the source position in source column
      await db
        .update(kanbanCards)
        .set({ position: db.raw("position - 1"), updatedAt: new Date() })
        .where(
          and(
            eq(kanbanCards.columnId, sourceColumnId),
            eq(kanbanCards.isArchived, false),
            gte(kanbanCards.position, sourcePosition + 1)
          )
        );

      // Increase position of cards at or after target position in target column
      await db
        .update(kanbanCards)
        .set({ position: db.raw("position + 1"), updatedAt: new Date() })
        .where(
          and(
            eq(kanbanCards.columnId, columnId),
            eq(kanbanCards.isArchived, false),
            gte(kanbanCards.position, position)
          )
        );
    }

    // 7. Update the moved card
    const [updatedCard] = await db
      .update(kanbanCards)
      .set({
        columnId,
        position,
        updatedAt: new Date(),
      })
      .where(eq(kanbanCards.id, cardId))
      .returning();

    // 8. Log activity
    const fromColumnName = card.column?.name || "Unknown";
    const toColumnName = targetColumn.name;

    if (fromColumnName !== toColumnName) {
      await logCardMoved(
        db,
        card.boardId,
        cardId,
        session.user.id,
        card.title,
        fromColumnName,
        toColumnName
      );
    }

    // 9. Fetch updated card with assignee
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
    console.error("Error moving card:", error);
    return NextResponse.json(
      { error: "Failed to move card" },
      { status: 500 }
    );
  }
}
