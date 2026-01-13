import { eq, and, or } from "drizzle-orm";
import type { BoardRole } from "@/lib/db/schemas/kanban";
import {
  kanbanBoards,
  kanbanBoardMembers,
} from "@/lib/db/schemas/kanban";

/**
 * Check if a user has access to a board and their role
 *
 * Permission hierarchy:
 * 1. Board owner (created_by) - has "owner" role
 * 2. Explicit board member - has their assigned role
 * 3. Team member (if board is team board) - has "editor" role by default
 * 4. No access - returns hasAccess: false
 *
 * @param db - Drizzle database instance
 * @param boardId - Board ID to check
 * @param userId - User ID to check
 * @returns Object with hasAccess boolean and optional role
 */
export async function checkBoardAccess(
  db: any, // Type as 'any' since we're importing from herostack
  boardId: string,
  userId: string
): Promise<{ hasAccess: boolean; role?: BoardRole }> {
  // Get board details
  const board = await db.query.kanbanBoards.findFirst({
    where: eq(kanbanBoards.id, boardId),
  });

  if (!board) {
    return { hasAccess: false };
  }

  // Check if user is board owner
  if (board.createdBy === userId) {
    return { hasAccess: true, role: "owner" };
  }

  // Check if user is an explicit board member
  const member = await db.query.kanbanBoardMembers.findFirst({
    where: and(
      eq(kanbanBoardMembers.boardId, boardId),
      eq(kanbanBoardMembers.userId, userId)
    ),
  });

  if (member) {
    return { hasAccess: true, role: member.role as BoardRole };
  }

  // Check team membership if board is team board
  if (board.teamId && board.type === "team") {
    // Query herostack's team_members table
    const teamMember = await db.query.teamMembers?.findFirst({
      where: and(
        eq(db.schema.teamMembers.teamId, board.teamId),
        eq(db.schema.teamMembers.userId, userId)
      ),
    });

    if (teamMember) {
      // Team members get editor access by default
      return { hasAccess: true, role: "editor" };
    }
  }

  return { hasAccess: false };
}

/**
 * Check if a role can edit board content (cards, columns, etc.)
 */
export function canEdit(role: BoardRole): boolean {
  return role === "owner" || role === "editor";
}

/**
 * Check if a role can delete board or permanently delete content
 */
export function canDelete(role: BoardRole): boolean {
  return role === "owner";
}

/**
 * Check if a role can manage board members (invite, remove, change roles)
 */
export function canManageMembers(role: BoardRole): boolean {
  return role === "owner";
}

/**
 * Check if a role can view board (all roles can view if they have access)
 */
export function canView(role: BoardRole): boolean {
  return true; // All roles with access can view
}

/**
 * Check if a role can archive/unarchive board
 */
export function canArchive(role: BoardRole): boolean {
  return role === "owner";
}

/**
 * Check if a role can modify board settings (name, description, etc.)
 */
export function canModifyBoardSettings(role: BoardRole): boolean {
  return role === "owner" || role === "editor";
}

/**
 * Check if a role can add comments
 */
export function canComment(role: BoardRole): boolean {
  return role === "owner" || role === "editor";
}

/**
 * Check if a role can add attachments
 */
export function canAddAttachments(role: BoardRole): boolean {
  return role === "owner" || role === "editor";
}

/**
 * Check if user can delete specific comment
 * Users can delete their own comments, owners can delete any comment
 */
export function canDeleteComment(
  role: BoardRole,
  commentUserId: string,
  currentUserId: string
): boolean {
  return role === "owner" || commentUserId === currentUserId;
}

/**
 * Check if user can delete specific attachment
 * Users can delete their own attachments, owners can delete any attachment
 */
export function canDeleteAttachment(
  role: BoardRole,
  attachmentUploadedBy: string,
  currentUserId: string
): boolean {
  return role === "owner" || attachmentUploadedBy === currentUserId;
}

/**
 * Get permissions object for a given role
 * Useful for passing to frontend
 */
export function getRolePermissions(role: BoardRole) {
  return {
    canView: canView(role),
    canEdit: canEdit(role),
    canDelete: canDelete(role),
    canManageMembers: canManageMembers(role),
    canArchive: canArchive(role),
    canModifySettings: canModifyBoardSettings(role),
    canComment: canComment(role),
    canAddAttachments: canAddAttachments(role),
  };
}

/**
 * Verify permission and throw error if not allowed
 * Useful for API route guards
 */
export function requirePermission(
  hasAccess: boolean,
  role: BoardRole | undefined,
  permissionCheck: (role: BoardRole) => boolean,
  errorMessage = "Permission denied"
): asserts role is BoardRole {
  if (!hasAccess || !role) {
    throw new Error("Unauthorized");
  }
  if (!permissionCheck(role)) {
    throw new Error(errorMessage);
  }
}
