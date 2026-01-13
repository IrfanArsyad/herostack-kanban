/**
 * Columns API Route
 * Handles creating, updating, deleting, and reordering columns
 *
 * POST /api/plugins/kanban/boards/[boardId]/columns - Create column
 * PATCH /api/plugins/kanban/boards/[boardId]/columns/[columnId] - Update column
 * DELETE /api/plugins/kanban/boards/[boardId]/columns/[columnId] - Delete column
 * POST /api/plugins/kanban/boards/[boardId]/columns/reorder - Reorder columns
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq, and, gt } from "drizzle-orm";
import * as schema from "../../../../schema";
import { kanbanColumns } from "../../../../schema";
import { checkBoardAccess, canEdit } from "../../../../lib/permissions";
import {
  logColumnCreated,
  logColumnUpdated,
  logColumnDeleted,
  logColumnReordered,
} from "../../../../lib/activity-logger";

/**
 * POST /api/plugins/kanban/boards/[boardId]/columns
 * Create a new column
 *
 * Body:
 * - name: string (required)
 * - position: number (optional) - defaults to end
 * - limit: number (optional) - WIP limit
 * - color: string (optional)
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
    const { name, position, limit, color } = body;

    // Validate name
    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "Column name is required" }, { status: 400 });
    }

    // 4. Get current column count for position
    const existingColumns = await db.query.kanbanColumns.findMany({
      where: eq(kanbanColumns.boardId, boardId),
      orderBy: (columns, { desc }) => [desc(columns.position)],
    });

    const newPosition = position !== undefined ? position : (existingColumns[0]?.position ?? -1) + 1;

    // 5. If position is specified and not at end, shift existing columns
    if (position !== undefined && position <= (existingColumns[0]?.position ?? 0)) {
      // Shift columns at and after this position
      await db
        .update(kanbanColumns)
        .set({
          position: db.raw(`position + 1`),
        })
        .where(
          and(
            eq(kanbanColumns.boardId, boardId),
            gt(kanbanColumns.position, position - 1)
          )
        );
    }

    // 6. Create column
    const [newColumn] = await db
      .insert(kanbanColumns)
      .values({
        boardId,
        name: name.trim(),
        position: newPosition,
        limit: limit || null,
        color: color || "#gray",
      })
      .returning();

    // 7. Log activity
    await logColumnCreated(db, boardId, session.user.id, newColumn.name);

    return NextResponse.json({ column: newColumn }, { status: 201 });
  } catch (error) {
    console.error("Error creating column:", error);
    return NextResponse.json(
      { error: "Failed to create column" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/plugins/kanban/boards/[boardId]/columns/[columnId]
 * Update column
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string; columnId: string }> }
) {
  try {
    const { boardId, columnId } = await params;

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
    const { name, limit, color } = body;

    // Build updates
    const updates: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json({ error: "Column name cannot be empty" }, { status: 400 });
      }
      updates.name = name.trim();
    }

    if (limit !== undefined) {
      updates.limit = limit || null;
    }

    if (color !== undefined) {
      updates.color = color;
    }

    // 4. Update column
    const [updatedColumn] = await db
      .update(kanbanColumns)
      .set(updates)
      .where(eq(kanbanColumns.id, columnId))
      .returning();

    if (!updatedColumn) {
      return NextResponse.json({ error: "Column not found" }, { status: 404 });
    }

    // 5. Log activity
    await logColumnUpdated(db, boardId, session.user.id, updatedColumn.name, updates);

    return NextResponse.json({ column: updatedColumn });
  } catch (error) {
    console.error("Error updating column:", error);
    return NextResponse.json(
      { error: "Failed to update column" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/plugins/kanban/boards/[boardId]/columns/[columnId]
 * Delete column (and all its cards)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string; columnId: string }> }
) {
  try {
    const { boardId, columnId } = await params;

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

    // 3. Get column info before deletion
    const column = await db.query.kanbanColumns.findFirst({
      where: eq(kanbanColumns.id, columnId),
    });

    if (!column) {
      return NextResponse.json({ error: "Column not found" }, { status: 404 });
    }

    // 4. Log activity before deletion
    await logColumnDeleted(db, boardId, session.user.id, column.name);

    // 5. Delete column (cascade will delete cards)
    await db.delete(kanbanColumns).where(eq(kanbanColumns.id, columnId));

    // 6. Reorder remaining columns
    const remainingColumns = await db.query.kanbanColumns.findMany({
      where: eq(kanbanColumns.boardId, boardId),
      orderBy: (columns, { asc }) => [asc(columns.position)],
    });

    // Update positions to be sequential
    for (let i = 0; i < remainingColumns.length; i++) {
      await db
        .update(kanbanColumns)
        .set({ position: i })
        .where(eq(kanbanColumns.id, remainingColumns[i].id));
    }

    return NextResponse.json({
      message: "Column deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting column:", error);
    return NextResponse.json(
      { error: "Failed to delete column" },
      { status: 500 }
    );
  }
}
