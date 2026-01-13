import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  pgEnum,
  json,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ==================== ENUMS ====================

export const boardTypeEnum = pgEnum("kanban_board_type", ["personal", "team"]);

export const boardMemberRoleEnum = pgEnum("kanban_board_member_role", [
  "owner",
  "editor",
  "viewer",
]);

export const cardPriorityEnum = pgEnum("kanban_card_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

export const activityTypeEnum = pgEnum("kanban_activity_type", [
  "board_created",
  "board_updated",
  "board_deleted",
  "board_archived",
  "column_created",
  "column_updated",
  "column_deleted",
  "column_reordered",
  "card_created",
  "card_updated",
  "card_deleted",
  "card_moved",
  "card_archived",
  "card_assigned",
  "comment_added",
  "comment_updated",
  "comment_deleted",
  "attachment_added",
  "attachment_deleted",
  "member_added",
  "member_removed",
  "member_role_changed",
  "checklist_item_added",
  "checklist_item_completed",
  "checklist_item_uncompleted",
  "checklist_item_deleted",
]);

// ==================== TABLES ====================

/**
 * Kanban Boards
 * Main board entity - can be personal or team-based
 */
export const kanbanBoards = pgTable("kanban_boards", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  type: boardTypeEnum("type").default("personal").notNull(),

  // Team integration (nullable for personal boards)
  teamId: text("team_id"), // Foreign key to herostack teams table

  // Owner (always set)
  createdBy: text("created_by").notNull(), // Foreign key to herostack users

  // Settings
  backgroundColor: text("background_color").default("#ffffff"),
  isArchived: boolean("is_archived").default(false).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Board Members
 * Manages permissions for individual board members
 */
export const kanbanBoardMembers = pgTable("kanban_board_members", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  boardId: text("board_id")
    .notNull()
    .references(() => kanbanBoards.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(), // Foreign key to herostack users
  role: boardMemberRoleEnum("role").default("viewer").notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

/**
 * Kanban Columns
 * Columns within a board (e.g., To Do, In Progress, Done)
 */
export const kanbanColumns = pgTable("kanban_columns", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  boardId: text("board_id")
    .notNull()
    .references(() => kanbanBoards.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  position: integer("position").notNull(), // For ordering columns
  limit: integer("limit"), // WIP limit (nullable = no limit)
  color: text("color").default("#gray"), // Column color for visual distinction
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Kanban Cards
 * Task cards within columns
 */
export const kanbanCards = pgTable("kanban_cards", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  columnId: text("column_id")
    .notNull()
    .references(() => kanbanColumns.id, { onDelete: "cascade" }),
  boardId: text("board_id")
    .notNull()
    .references(() => kanbanBoards.id, { onDelete: "cascade" }), // Denormalized for faster queries

  // Card content
  title: text("title").notNull(),
  description: text("description"),

  // Metadata
  position: integer("position").notNull(), // For ordering within column
  priority: cardPriorityEnum("priority").default("medium"),
  dueDate: timestamp("due_date"),

  // Assignment
  assigneeId: text("assignee_id"), // Foreign key to herostack users

  // Labels (stored as JSON array of strings)
  labels: json("labels").$type<string[]>().default([]),

  // State
  isArchived: boolean("is_archived").default(false).notNull(),

  // Audit
  createdBy: text("created_by").notNull(), // Foreign key to herostack users
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Checklist Items
 * To-do items within cards
 */
export const kanbanChecklistItems = pgTable("kanban_checklist_items", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  cardId: text("card_id")
    .notNull()
    .references(() => kanbanCards.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  isCompleted: boolean("is_completed").default(false).notNull(),
  position: integer("position").notNull(), // For ordering within card
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Comments
 * Discussion threads on cards
 */
export const kanbanComments = pgTable("kanban_comments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  cardId: text("card_id")
    .notNull()
    .references(() => kanbanCards.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(), // Foreign key to herostack users
  content: text("content").notNull(),

  // Mentions stored as JSON array of user IDs
  mentions: json("mentions").$type<string[]>().default([]),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Attachments
 * Files attached to cards
 */
export const kanbanAttachments = pgTable("kanban_attachments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  cardId: text("card_id")
    .notNull()
    .references(() => kanbanCards.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  path: text("path").notNull(), // File path in uploads directory
  size: integer("size").notNull(), // Size in bytes
  mimeType: text("mime_type").notNull(),
  uploadedBy: text("uploaded_by").notNull(), // Foreign key to herostack users
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Activity Log
 * Tracks all actions on boards and cards
 */
export const kanbanActivities = pgTable("kanban_activities", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  boardId: text("board_id")
    .notNull()
    .references(() => kanbanBoards.id, { onDelete: "cascade" }),
  cardId: text("card_id"), // Nullable, for card-specific activities
  userId: text("user_id"), // Foreign key to herostack users (null for system actions)

  type: activityTypeEnum("type").notNull(),

  // Store activity details as JSON
  metadata: json("metadata").$type<Record<string, any>>(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Board Templates
 * Pre-built board structures for quick setup
 */
export const kanbanTemplates = pgTable("kanban_templates", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),

  // Template structure stored as JSON
  structure: json("structure")
    .$type<{
      columns: Array<{
        name: string;
        color?: string;
        cards?: Array<{
          title: string;
          description?: string;
          priority?: "low" | "medium" | "high" | "urgent";
          labels?: string[];
        }>;
      }>;
    }>()
    .notNull(),

  // Template metadata
  isPublic: boolean("is_public").default(false).notNull(), // Public templates available to all users
  category: text("category").default("general"), // e.g., "software", "marketing", "sales"
  createdBy: text("created_by").notNull(), // Foreign key to herostack users

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==================== RELATIONS ====================

export const kanbanBoardsRelations = relations(kanbanBoards, ({ many }) => ({
  members: many(kanbanBoardMembers),
  columns: many(kanbanColumns),
  cards: many(kanbanCards),
  activities: many(kanbanActivities),
}));

export const kanbanBoardMembersRelations = relations(
  kanbanBoardMembers,
  ({ one }) => ({
    board: one(kanbanBoards, {
      fields: [kanbanBoardMembers.boardId],
      references: [kanbanBoards.id],
    }),
  })
);

export const kanbanColumnsRelations = relations(
  kanbanColumns,
  ({ one, many }) => ({
    board: one(kanbanBoards, {
      fields: [kanbanColumns.boardId],
      references: [kanbanBoards.id],
    }),
    cards: many(kanbanCards),
  })
);

export const kanbanCardsRelations = relations(kanbanCards, ({ one, many }) => ({
  column: one(kanbanColumns, {
    fields: [kanbanCards.columnId],
    references: [kanbanColumns.id],
  }),
  board: one(kanbanBoards, {
    fields: [kanbanCards.boardId],
    references: [kanbanBoards.id],
  }),
  checklistItems: many(kanbanChecklistItems),
  comments: many(kanbanComments),
  attachments: many(kanbanAttachments),
}));

export const kanbanChecklistItemsRelations = relations(
  kanbanChecklistItems,
  ({ one }) => ({
    card: one(kanbanCards, {
      fields: [kanbanChecklistItems.cardId],
      references: [kanbanCards.id],
    }),
  })
);

export const kanbanCommentsRelations = relations(kanbanComments, ({ one }) => ({
  card: one(kanbanCards, {
    fields: [kanbanComments.cardId],
    references: [kanbanCards.id],
  }),
}));

export const kanbanAttachmentsRelations = relations(
  kanbanAttachments,
  ({ one }) => ({
    card: one(kanbanCards, {
      fields: [kanbanAttachments.cardId],
      references: [kanbanCards.id],
    }),
  })
);

export const kanbanActivitiesRelations = relations(
  kanbanActivities,
  ({ one }) => ({
    board: one(kanbanBoards, {
      fields: [kanbanActivities.boardId],
      references: [kanbanBoards.id],
    }),
  })
);

// ==================== TYPE EXPORTS ====================

export type KanbanBoard = typeof kanbanBoards.$inferSelect;
export type NewKanbanBoard = typeof kanbanBoards.$inferInsert;

export type KanbanBoardMember = typeof kanbanBoardMembers.$inferSelect;
export type NewKanbanBoardMember = typeof kanbanBoardMembers.$inferInsert;

export type KanbanColumn = typeof kanbanColumns.$inferSelect;
export type NewKanbanColumn = typeof kanbanColumns.$inferInsert;

export type KanbanCard = typeof kanbanCards.$inferSelect;
export type NewKanbanCard = typeof kanbanCards.$inferInsert;

export type KanbanChecklistItem = typeof kanbanChecklistItems.$inferSelect;
export type NewKanbanChecklistItem = typeof kanbanChecklistItems.$inferInsert;

export type KanbanComment = typeof kanbanComments.$inferSelect;
export type NewKanbanComment = typeof kanbanComments.$inferInsert;

export type KanbanAttachment = typeof kanbanAttachments.$inferSelect;
export type NewKanbanAttachment = typeof kanbanAttachments.$inferInsert;

export type KanbanActivity = typeof kanbanActivities.$inferSelect;
export type NewKanbanActivity = typeof kanbanActivities.$inferInsert;

export type KanbanTemplate = typeof kanbanTemplates.$inferSelect;
export type NewKanbanTemplate = typeof kanbanTemplates.$inferInsert;

// Board role type
export type BoardRole = "owner" | "editor" | "viewer";
export type CardPriority = "low" | "medium" | "high" | "urgent";
export type ActivityType = typeof activityTypeEnum.enumValues[number];
