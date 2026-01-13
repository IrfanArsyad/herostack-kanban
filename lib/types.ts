/**
 * Shared TypeScript types for the Kanban plugin
 */

import type {
  KanbanBoard,
  KanbanBoardMember,
  KanbanColumn,
  KanbanCard,
  KanbanChecklistItem,
  KanbanComment,
  KanbanAttachment,
  KanbanActivity,
  KanbanTemplate,
  BoardRole,
  CardPriority,
  ActivityType,
} from "../schema";

// Re-export schema types
export type {
  KanbanBoard,
  KanbanBoardMember,
  KanbanColumn,
  KanbanCard,
  KanbanChecklistItem,
  KanbanComment,
  KanbanAttachment,
  KanbanActivity,
  KanbanTemplate,
  BoardRole,
  CardPriority,
  ActivityType,
};

// ==================== ENHANCED TYPES WITH RELATIONS ====================

/**
 * Board with related data
 */
export interface BoardWithRelations extends KanbanBoard {
  members?: BoardMemberWithUser[];
  columns?: ColumnWithCards[];
  _count?: {
    cards: number;
    members: number;
  };
}

/**
 * Board member with user details
 */
export interface BoardMemberWithUser extends KanbanBoardMember {
  user?: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

/**
 * Column with cards
 */
export interface ColumnWithCards extends KanbanColumn {
  cards?: CardWithDetails[];
  _count?: {
    cards: number;
  };
}

/**
 * Card with all details (for card modal)
 */
export interface CardWithDetails extends KanbanCard {
  assignee?: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  checklistItems?: KanbanChecklistItem[];
  comments?: CommentWithUser[];
  attachments?: AttachmentWithUser[];
  _count?: {
    checklistItems: number;
    completedChecklistItems: number;
    comments: number;
    attachments: number;
  };
}

/**
 * Comment with user details
 */
export interface CommentWithUser extends KanbanComment {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  mentionedUsers?: Array<{
    id: string;
    name: string | null;
    email: string;
  }>;
}

/**
 * Attachment with uploader details
 */
export interface AttachmentWithUser extends KanbanAttachment {
  uploader: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

/**
 * Activity with user details
 */
export interface ActivityWithUser extends KanbanActivity {
  user?: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

// ==================== API TYPES ====================

/**
 * API Response wrapper
 */
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

// ==================== REQUEST TYPES ====================

/**
 * Create board request
 */
export interface CreateBoardRequest {
  name: string;
  description?: string;
  type: "personal" | "team";
  teamId?: string;
  backgroundColor?: string;
  templateId?: string; // Optional: create from template
}

/**
 * Update board request
 */
export interface UpdateBoardRequest {
  name?: string;
  description?: string;
  backgroundColor?: string;
  isArchived?: boolean;
}

/**
 * Create column request
 */
export interface CreateColumnRequest {
  name: string;
  position?: number;
  limit?: number;
  color?: string;
}

/**
 * Update column request
 */
export interface UpdateColumnRequest {
  name?: string;
  position?: number;
  limit?: number;
  color?: string;
}

/**
 * Reorder columns request
 */
export interface ReorderColumnsRequest {
  columnIds: string[]; // Ordered array of column IDs
}

/**
 * Create card request
 */
export interface CreateCardRequest {
  columnId: string;
  title: string;
  description?: string;
  priority?: CardPriority;
  assigneeId?: string;
  dueDate?: string; // ISO string
  labels?: string[];
  position?: number;
}

/**
 * Update card request
 */
export interface UpdateCardRequest {
  title?: string;
  description?: string;
  priority?: CardPriority;
  assigneeId?: string | null;
  dueDate?: string | null; // ISO string
  labels?: string[];
  isArchived?: boolean;
}

/**
 * Move card request
 */
export interface MoveCardRequest {
  columnId: string;
  position: number;
}

/**
 * Create checklist item request
 */
export interface CreateChecklistItemRequest {
  text: string;
  position?: number;
}

/**
 * Update checklist item request
 */
export interface UpdateChecklistItemRequest {
  text?: string;
  isCompleted?: boolean;
  position?: number;
}

/**
 * Create comment request
 */
export interface CreateCommentRequest {
  content: string;
}

/**
 * Update comment request
 */
export interface UpdateCommentRequest {
  content: string;
}

/**
 * Upload attachment request (handled as FormData)
 */
export interface UploadAttachmentRequest {
  file: File;
}

/**
 * Add board member request
 */
export interface AddBoardMemberRequest {
  userId: string;
  role: BoardRole;
}

/**
 * Update board member request
 */
export interface UpdateBoardMemberRequest {
  role: BoardRole;
}

/**
 * Create template request
 */
export interface CreateTemplateRequest {
  name: string;
  description?: string;
  boardId: string; // Create template from existing board
  isPublic?: boolean;
  category?: string;
}

// ==================== FILTER & SORT TYPES ====================

/**
 * Board filters
 */
export interface BoardFilters {
  type?: "personal" | "team" | "all";
  teamId?: string;
  isArchived?: boolean;
  search?: string;
}

/**
 * Card filters
 */
export interface CardFilters {
  columnId?: string;
  assigneeId?: string;
  priority?: CardPriority;
  labels?: string[];
  hasChecklistItems?: boolean;
  hasAttachments?: boolean;
  isArchived?: boolean;
  search?: string;
}

/**
 * Sort options
 */
export type SortOrder = "asc" | "desc";

export interface SortOptions {
  field: string;
  order: SortOrder;
}

// ==================== UI STATE TYPES ====================

/**
 * Drag and drop state
 */
export interface DragState {
  isDragging: boolean;
  draggedCardId: string | null;
  sourceColumnId: string | null;
  targetColumnId: string | null;
}

/**
 * Card modal state
 */
export interface CardModalState {
  isOpen: boolean;
  cardId: string | null;
  mode: "view" | "edit";
}

/**
 * Board settings modal state
 */
export interface BoardSettingsModalState {
  isOpen: boolean;
  tab: "general" | "members" | "advanced";
}

// ==================== REALTIME TYPES ====================

/**
 * Real-time update event
 */
export interface RealtimeEvent {
  type: "board_update" | "card_update" | "column_update" | "user_joined" | "user_left";
  boardId: string;
  userId?: string;
  data: any;
  timestamp: string;
}

/**
 * Active user indicator
 */
export interface ActiveUser {
  id: string;
  name: string | null;
  image: string | null;
  lastSeen: string;
}

// ==================== VALIDATION TYPES ====================

/**
 * Field validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors?: Record<string, string>;
}

// ==================== EXPORT ====================

export type { BoardRole as Role };
