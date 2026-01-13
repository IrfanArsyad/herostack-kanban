/**
 * Column Reorder API Route
 * POST /api/plugins/kanban/boards/[boardId]/columns/reorder
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { kanbanColumns } from "../../../../../schema";
import { checkBoardAccess, canEdit } from "../../../../../lib/permissions";
import { logColumnReordered } from "../../../../../lib/activity-logger";

/**
 * POST /api/plugins/kanban/boards/[boardId]/columns/reorder
 * Reorder columns
 *
 * Body:
 * - columnIds: string[] - Ordered array of column IDs
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
    const { columnIds } = body;

    if (!Array.isArray(columnIds) || columnIds.length === 0) {
      return NextResponse.json({ error: "columnIds must be a non-empty array" }, { status: 400 });
    }

    // 4. Update positions
    for (let i = 0; i < columnIds.length; i++) {
      await db
        .update(kanbanColumns)
        .set({ position: i, updatedAt: new Date() })
        .where(eq(kanbanColumns.id, columnIds[i]));
    }

    // 5. Log activity
    await logColumnReordered(db, boardId, session.user.id);

    return NextResponse.json({
      message: "Columns reordered successfully",
    });
  } catch (error) {
    console.error("Error reordering columns:", error);
    return NextResponse.json(
      { error: "Failed to reorder columns" },
      { status: 500 }
    );
  }
}
