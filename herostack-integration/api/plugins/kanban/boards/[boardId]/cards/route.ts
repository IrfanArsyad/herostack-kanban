/**
 * Cards API Route
 * Handles creating cards in a board
 *
 * POST /api/plugins/kanban/boards/[boardId]/cards - Create card
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import * as schema from "../../../../schema";
import { kanbanCards } from "../../../../schema";
import { checkBoardAccess, canEdit } from "../../../../lib/permissions";
import { logCardCreated } from "../../../../lib/activity-logger";

/**
 * POST /api/plugins/kanban/boards/[boardId]/cards
 * Create a new card
 *
 * Body:
 * - columnId: string (required)
 * - title: string (required)
 * - description: string (optional)
 * - priority: "low" | "medium" | "high" | "urgent" (optional)
 * - assigneeId: string (optional)
 * - dueDate: string (optional) - ISO date string
 * - labels: string[] (optional)
 * - position: number (optional) - defaults to end of column
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { boardId } = await params;

    // 1. Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Check board access and permissions
    const { hasAccess, role } = await checkBoardAccess(db, boardId, session.user.id);
    if (!hasAccess || !role) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    if (!canEdit(role)) {
      return NextResponse.json(
        { error: "You don't have permission to edit this board" },
        { status: 403 }
      );
    }

    // 3. Parse request body
    const body = await request.json();
    const {
      columnId,
      title,
      description,
      priority = "medium",
      assigneeId,
      dueDate,
      labels = [],
      position,
    } = body;

    // Validate required fields
    if (!columnId) {
      return NextResponse.json({ error: "columnId is required" }, { status: 400 });
    }

    if (!title || title.trim() === "") {
      return NextResponse.json({ error: "Card title is required" }, { status: 400 });
    }

    // 4. Verify column belongs to board
    const column = await db.query.kanbanColumns.findFirst({
      where: and(
        eq(schema.kanbanColumns.id, columnId),
        eq(schema.kanbanColumns.boardId, boardId)
      ),
    });

    if (!column) {
      return NextResponse.json({ error: "Column not found in this board" }, { status: 404 });
    }

    // 5. Get position for new card
    const existingCards = await db.query.kanbanCards.findMany({
      where: and(
        eq(kanbanCards.columnId, columnId),
        eq(kanbanCards.isArchived, false)
      ),
      orderBy: desc(kanbanCards.position),
    });

    const newPosition = position !== undefined ? position : (existingCards[0]?.position ?? -1) + 1;

    // 6. Create card
    const [newCard] = await db
      .insert(kanbanCards)
      .values({
        columnId,
        boardId,
        title: title.trim(),
        description: description?.trim() || null,
        priority,
        assigneeId: assigneeId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        labels: labels || [],
        position: newPosition,
        createdBy: session.user.id,
      })
      .returning();

    // 7. Log activity
    await logCardCreated(db, boardId, newCard.id, session.user.id, newCard.title);

    // 8. Fetch card with assignee details
    let assignee = null;
    if (newCard.assigneeId) {
      assignee = await db.query.users?.findFirst({
        where: eq(schema.users.id, newCard.assigneeId),
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      });
    }

    return NextResponse.json(
      {
        card: {
          ...newCard,
          assignee,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating card:", error);
    return NextResponse.json(
      { error: "Failed to create card" },
      { status: 500 }
    );
  }
}
