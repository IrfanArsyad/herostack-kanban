/**
 * Board Detail API Route
 * Handles getting, updating, and deleting a specific board
 *
 * GET /api/plugins/kanban/boards/[boardId] - Get board details
 * PATCH /api/plugins/kanban/boards/[boardId] - Update board
 * DELETE /api/plugins/kanban/boards/[boardId] - Delete board
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import * as schema from "../../../schema";
import { kanbanBoards, kanbanCards } from "../../../schema";
import { checkBoardAccess, canDelete, canModifyBoardSettings } from "../../../lib/permissions";
import {
  logBoardUpdated,
  logBoardDeleted,
  logBoardArchived,
} from "../../../lib/activity-logger";

/**
 * GET /api/plugins/kanban/boards/[boardId]
 * Get full board details with columns and cards
 */
export async function GET(
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

    // 2. Check board access
    const { hasAccess, role } = await checkBoardAccess(db, boardId, session.user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: "Board not found or access denied" }, { status: 404 });
    }

    // 3. Fetch board with full details
    const board = await db.query.kanbanBoards.findFirst({
      where: eq(kanbanBoards.id, boardId),
      with: {
        columns: {
          orderBy: (columns, { asc }) => [asc(columns.position)],
          with: {
            cards: {
              where: eq(kanbanCards.isArchived, false),
              orderBy: (cards, { asc }) => [asc(cards.position)],
            },
          },
        },
        members: true,
      },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // 4. Add user details to members
    if (board.members && board.members.length > 0) {
      const membersWithDetails = await Promise.all(
        board.members.map(async (member) => {
          const user = await db.query.users?.findFirst({
            where: eq(schema.users.id, member.userId),
            columns: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          });
          return {
            ...member,
            user,
          };
        })
      );
      board.members = membersWithDetails as any;
    }

    // 5. Add card assignee details
    if (board.columns) {
      for (const column of board.columns) {
        if (column.cards) {
          for (const card of column.cards) {
            if (card.assigneeId) {
              const assignee = await db.query.users?.findFirst({
                where: eq(schema.users.id, card.assigneeId),
                columns: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              });
              (card as any).assignee = assignee;
            }
          }
        }
      }
    }

    return NextResponse.json({
      board,
      role, // Send user's role for permission checks on frontend
    });
  } catch (error) {
    console.error("Error fetching board:", error);
    return NextResponse.json(
      { error: "Failed to fetch board" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/plugins/kanban/boards/[boardId]
 * Update board details
 *
 * Body:
 * - name: string (optional)
 * - description: string (optional)
 * - backgroundColor: string (optional)
 * - isArchived: boolean (optional)
 */
export async function PATCH(
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
      return NextResponse.json({ error: "Board not found or access denied" }, { status: 404 });
    }

    if (!canModifyBoardSettings(role)) {
      return NextResponse.json(
        { error: "You don't have permission to modify this board" },
        { status: 403 }
      );
    }

    // 3. Parse request body
    const body = await request.json();
    const { name, description, backgroundColor, isArchived } = body;

    // 4. Build update object
    const updates: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json({ error: "Board name cannot be empty" }, { status: 400 });
      }
      updates.name = name.trim();
    }

    if (description !== undefined) {
      updates.description = description?.trim() || null;
    }

    if (backgroundColor !== undefined) {
      updates.backgroundColor = backgroundColor;
    }

    if (isArchived !== undefined) {
      // Only owners can archive/unarchive
      if (!canDelete(role)) {
        return NextResponse.json(
          { error: "Only board owners can archive boards" },
          { status: 403 }
        );
      }
      updates.isArchived = isArchived;

      // Log archive activity
      await logBoardArchived(db, boardId, session.user.id, isArchived);
    }

    // 5. Update board
    const [updatedBoard] = await db
      .update(kanbanBoards)
      .set(updates)
      .where(eq(kanbanBoards.id, boardId))
      .returning();

    // 6. Log activity (excluding archive which is logged separately)
    if (isArchived === undefined) {
      const changes: Record<string, any> = {};
      if (name) changes.name = name;
      if (description !== undefined) changes.description = description;
      if (backgroundColor) changes.backgroundColor = backgroundColor;

      if (Object.keys(changes).length > 0) {
        await logBoardUpdated(db, boardId, session.user.id, changes);
      }
    }

    return NextResponse.json({ board: updatedBoard });
  } catch (error) {
    console.error("Error updating board:", error);
    return NextResponse.json(
      { error: "Failed to update board" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/plugins/kanban/boards/[boardId]
 * Delete board (only owner can delete)
 */
export async function DELETE(
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
      return NextResponse.json({ error: "Board not found or access denied" }, { status: 404 });
    }

    if (!canDelete(role)) {
      return NextResponse.json(
        { error: "Only board owners can delete boards" },
        { status: 403 }
      );
    }

    // 3. Get board name before deletion
    const board = await db.query.kanbanBoards.findFirst({
      where: eq(kanbanBoards.id, boardId),
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    // 4. Log activity before deletion
    await logBoardDeleted(db, boardId, session.user.id, board.name);

    // 5. Delete board (cascade will delete related data)
    await db.delete(kanbanBoards).where(eq(kanbanBoards.id, boardId));

    return NextResponse.json({
      message: "Board deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting board:", error);
    return NextResponse.json(
      { error: "Failed to delete board" },
      { status: 500 }
    );
  }
}
