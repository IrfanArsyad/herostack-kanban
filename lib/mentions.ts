/**
 * Mentions Parser
 * Utilities for parsing and handling @mentions in comments
 */

/**
 * Parse @mentions from text content
 * Supports both @username and @user-id formats
 *
 * @param content - Text content to parse
 * @returns Array of mentioned user IDs
 *
 * @example
 * parseMentions("Hey @john, can you review @user-123?")
 * // Returns: ["john", "user-123"]
 */
export function parseMentions(content: string): string[] {
  const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }

  // Remove duplicates
  return [...new Set(mentions)];
}

/**
 * Replace mentions with HTML markup for display
 *
 * @param content - Text content with @mentions
 * @param userMap - Map of user ID to user display name
 * @returns HTML string with mentions highlighted
 *
 * @example
 * formatMentions("Hey @john!", { "john": "John Doe" })
 * // Returns: "Hey <span class='mention' data-user-id='john'>@John Doe</span>!"
 */
export function formatMentions(
  content: string,
  userMap: Record<string, string>
): string {
  return content.replace(/@([a-zA-Z0-9_-]+)/g, (match, userId) => {
    const userName = userMap[userId] || userId;
    return `<span class="mention" data-user-id="${userId}">@${userName}</span>`;
  });
}

/**
 * Replace user IDs with usernames in text
 * Useful for displaying user-friendly mentions
 *
 * @param content - Text content with user IDs
 * @param userMap - Map of user ID to username
 * @returns Text with usernames
 *
 * @example
 * replaceMentionsWithNames("Hey @user-123!", { "user-123": "john" })
 * // Returns: "Hey @john!"
 */
export function replaceMentionsWithNames(
  content: string,
  userMap: Record<string, string>
): string {
  return content.replace(/@([a-zA-Z0-9_-]+)/g, (match, userId) => {
    return `@${userMap[userId] || userId}`;
  });
}

/**
 * Validate if a user ID exists in the mention
 *
 * @param mention - Mention string (e.g., "@john")
 * @returns User ID without @ symbol
 */
export function extractUserIdFromMention(mention: string): string {
  return mention.replace(/^@/, "");
}

/**
 * Convert user IDs to mention format
 *
 * @param userIds - Array of user IDs
 * @returns Array of mentions (e.g., ["@john", "@jane"])
 */
export function userIdsToMentions(userIds: string[]): string[] {
  return userIds.map((id) => `@${id}`);
}

/**
 * Check if content contains mentions
 *
 * @param content - Text content to check
 * @returns True if content has mentions
 */
export function hasMentions(content: string): boolean {
  return /@([a-zA-Z0-9_-]+)/.test(content);
}

/**
 * Resolve user IDs from mentions
 * Matches mentions against a list of valid users
 *
 * @param content - Text content with mentions
 * @param validUsers - Array of valid user objects with id and username
 * @returns Array of resolved user IDs
 *
 * @example
 * resolveMentions(
 *   "Hey @john and @jane",
 *   [
 *     { id: "user-1", username: "john", email: "john@example.com" },
 *     { id: "user-2", username: "jane", email: "jane@example.com" },
 *     { id: "user-3", username: "bob", email: "bob@example.com" }
 *   ]
 * )
 * // Returns: ["user-1", "user-2"]
 */
export function resolveMentions(
  content: string,
  validUsers: Array<{ id: string; username?: string; email: string }>
): string[] {
  const mentions = parseMentions(content);
  const resolvedIds: string[] = [];

  for (const mention of mentions) {
    // Try to match by username
    const user = validUsers.find(
      (u) =>
        u.username?.toLowerCase() === mention.toLowerCase() ||
        u.id === mention ||
        u.email.split("@")[0].toLowerCase() === mention.toLowerCase()
    );

    if (user) {
      resolvedIds.push(user.id);
    }
  }

  return [...new Set(resolvedIds)];
}

/**
 * Create mention notification data
 * Useful for creating notifications when users are mentioned
 *
 * @param commentId - Comment ID
 * @param cardId - Card ID
 * @param mentionedBy - User who created the mention
 * @param mentionedUserIds - Array of mentioned user IDs
 * @returns Array of notification objects
 */
export function createMentionNotifications(
  commentId: string,
  cardId: string,
  mentionedBy: {
    id: string;
    name: string | null;
  },
  mentionedUserIds: string[]
) {
  return mentionedUserIds.map((userId) => ({
    userId,
    type: "mention",
    referenceId: commentId,
    referenceType: "comment",
    message: `${mentionedBy.name || "Someone"} mentioned you in a comment`,
    metadata: {
      commentId,
      cardId,
      mentionedById: mentionedBy.id,
      mentionedByName: mentionedBy.name,
    },
  }));
}

/**
 * Highlight mentions in content for editor
 * Returns content with special markers for rich text editor
 *
 * @param content - Plain text content
 * @returns Content with mention markers
 */
export function highlightMentionsForEditor(content: string): string {
  return content.replace(
    /@([a-zA-Z0-9_-]+)/g,
    '<span data-type="mention" data-id="$1">@$1</span>'
  );
}

/**
 * Extract plain text from formatted mentions
 * Useful for storing in database
 *
 * @param formattedContent - HTML content with mentions
 * @returns Plain text with @mentions
 */
export function extractPlainTextMentions(formattedContent: string): string {
  return formattedContent.replace(
    /<span[^>]*data-type="mention"[^>]*data-id="([^"]+)"[^>]*>@[^<]+<\/span>/g,
    "@$1"
  );
}
