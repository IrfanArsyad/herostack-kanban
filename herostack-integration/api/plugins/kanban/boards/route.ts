/**
 * Boards API Route
 * Handles listing and creating kanban boards
 *
 * GET /api/plugins/kanban/boards - List user's boards
 * POST /api/plugins/kanban/boards - Create new board
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { eq, and, or, desc } from "drizzle-orm";
import * as schema from "../../schema";
import { kanbanBoards, kanbanBoardMembers, kanbanColumns } from "../../schema";
import { logBoardCreated } from "../../lib/activity-logger";

/**
 * GET /api/plugins/kanban/boards
 * List all boards accessible by the current user
 *
 * Query params:
 * - type: "personal" | "team" | "all" (default: "all")
 * - teamId: Filter by team ID
 * - isArchived: Filter archived boards (default: false)
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Check if plugin is active
    const plugin = await db.query.plugins?.findFirst({
      where: eq(schema.plugins.pluginId, "herostack-kanban"),
    });

    if (!plugin || plugin.status !== "active") {
      return NextResponse.json(
        { error: "Kanban plugin is not active" },
        { status: 403 }
      );
    }

    // 3. Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") || "all";
    const teamId = searchParams.get("teamId");
    const isArchived = searchParams.get("isArchived") === "true";

    const userId = session.user.id;

    // 4. Build query conditions
    const conditions = [];

    // Filter by archive status
    conditions.push(eq(kanbanBoards.isArchived, isArchived));

    // Filter by type
    if (type !== "all") {
      conditions.push(eq(kanbanBoards.type, type as "personal" | "team"));
    }

    // Filter by team
    if (teamId) {
      conditions.push(eq(kanbanBoards.teamId, teamId));
    }

    // 5. Get boards where user is owner or member
    const ownedBoards = await db.query.kanbanBoards.findMany({
      where: and(eq(kanbanBoards.createdBy, userId), ...conditions),
      with: {
        members: true,
        columns: {
          orderBy: (columns, { asc }) => [asc(columns.position)],
        },
      },
      orderBy: desc(kanbanBoards.updatedAt),
    });

    // Get boards where user is a member
    const membershipBoards = await db
      .select({
        board: kanbanBoards,
      })
      .from(kanbanBoardMembers)
      .innerJoin(kanbanBoards, eq(kanbanBoardMembers.boardId, kanbanBoards.id))
      .where(
        and(
          eq(kanbanBoardMembers.userId, userId),
          ...conditions.map((c) =>
            // Apply conditions to kanbanBoards table
            c
          )
        )
      );

    // Get team boards (if user is team member)
    let teamBoards: any[] = [];
    if (type === "team" || type === "all") {
      // Get user's teams
      const userTeams = await db.query.teamMembers?.findMany({
        where: eq(schema.teamMembers.userId, userId),
      });

      if (userTeams && userTeams.length > 0) {
        const teamIds = userTeams.map((tm) => tm.teamId);

        teamBoards = await db.query.kanbanBoards.findMany({
          where: and(
            eq(kanbanBoards.type, "team"),
            or(...teamIds.map((tid) => eq(kanbanBoards.teamId, tid))),
            ...conditions
          ),
          with: {
            members: true,
            columns: {
              orderBy: (columns, { asc }) => [asc(columns.position)],
            },
          },
          orderBy: desc(kanbanBoards.updatedAt),
        });
      }
    }

    // 6. Combine and deduplicate boards
    const allBoards = [
      ...ownedBoards,
      ...membershipBoards.map((mb) => mb.board),
      ...teamBoards,
    ];

    // Remove duplicates by ID
    const uniqueBoards = Array.from(
      new Map(allBoards.map((board) => [board.id, board])).values()
    );

    // 7. Add card counts to boards
    const boardsWithCounts = await Promise.all(
      uniqueBoards.map(async (board) => {
        const cardCount = await db
          .select({ count: db.fn.count() })
          .from(schema.kanbanCards)
          .where(
            and(
              eq(schema.kanbanCards.boardId, board.id),
              eq(schema.kanbanCards.isArchived, false)
            )
          );

        return {
          ...board,
          _count: {
            cards: cardCount[0]?.count || 0,
            members: board.members?.length || 0,
          },
        };
      })
    );

    return NextResponse.json({
      boards: boardsWithCounts,
    });
  } catch (error) {
    console.error("Error fetching boards:", error);
    return NextResponse.json(
      { error: "Failed to fetch boards" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/plugins/kanban/boards
 * Create a new kanban board
 *
 * Body:
 * - name: string (required)
 * - description: string (optional)
 * - type: "personal" | "team" (default: "personal")
 * - teamId: string (required if type is "team")
 * - backgroundColor: string (optional)
 * - templateId: string (optional) - Create from template
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Check if plugin is active
    const plugin = await db.query.plugins?.findFirst({
      where: eq(schema.plugins.pluginId, "herostack-kanban"),
    });

    if (!plugin || plugin.status !== "active") {
      return NextResponse.json(
        { error: "Kanban plugin is not active" },
        { status: 403 }
      );
    }

    // 3. Parse request body
    const body = await request.json();
    const { name, description, type = "personal", teamId, backgroundColor, templateId } = body;

    // 4. Validate required fields
    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "Board name is required" },
        { status: 400 }
      );
    }

    if (type === "team" && !teamId) {
      return NextResponse.json(
        { error: "Team ID is required for team boards" },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // 5. If team board, verify user is team member
    if (type === "team" && teamId) {
      const teamMember = await db.query.teamMembers?.findFirst({
        where: and(
          eq(schema.teamMembers.teamId, teamId),
          eq(schema.teamMembers.userId, userId)
        ),
      });

      if (!teamMember) {
        return NextResponse.json(
          { error: "You are not a member of this team" },
          { status: 403 }
        );
      }
    }

    // 6. Create board
    const [newBoard] = await db
      .insert(kanbanBoards)
      .values({
        name: name.trim(),
        description: description?.trim() || null,
        type,
        teamId: type === "team" ? teamId : null,
        createdBy: userId,
        backgroundColor: backgroundColor || "#ffffff",
      })
      .returning();

    // 7. If template is specified, create columns and cards from template
    if (templateId) {
      const template = await db.query.kanbanTemplates?.findFirst({
        where: eq(schema.kanbanTemplates.id, templateId),
      });

      if (template && template.structure) {
        // Create columns from template
        for (let i = 0; i < template.structure.columns.length; i++) {
          const columnData = template.structure.columns[i];

          const [column] = await db
            .insert(kanbanColumns)
            .values({
              boardId: newBoard.id,
              name: columnData.name,
              position: i,
              color: columnData.color || "#gray",
            })
            .returning();

          // Create cards if template has them
          if (columnData.cards && columnData.cards.length > 0) {
            for (let j = 0; j < columnData.cards.length; j++) {
              const cardData = columnData.cards[j];

              await db.insert(schema.kanbanCards).values({
                columnId: column.id,
                boardId: newBoard.id,
                title: cardData.title,
                description: cardData.description || null,
                priority: cardData.priority || "medium",
                labels: cardData.labels || [],
                position: j,
                createdBy: userId,
              });
            }
          }
        }
      }
    } else {
      // Create default columns if no template
      const defaultColumns = [
        { name: "To Do", color: "#gray" },
        { name: "In Progress", color: "#blue" },
        { name: "Done", color: "#green" },
      ];

      for (let i = 0; i < defaultColumns.length; i++) {
        await db.insert(kanbanColumns).values({
          boardId: newBoard.id,
          name: defaultColumns[i].name,
          position: i,
          color: defaultColumns[i].color,
        });
      }
    }

    // 8. Log activity
    await logBoardCreated(db, newBoard.id, userId, newBoard.name);

    // 9. Fetch created board with relations
    const createdBoard = await db.query.kanbanBoards.findFirst({
      where: eq(kanbanBoards.id, newBoard.id),
      with: {
        columns: {
          orderBy: (columns, { asc }) => [asc(columns.position)],
        },
      },
    });

    return NextResponse.json(
      { board: createdBoard },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating board:", error);
    return NextResponse.json(
      { error: "Failed to create board" },
      { status: 500 }
    );
  }
}
