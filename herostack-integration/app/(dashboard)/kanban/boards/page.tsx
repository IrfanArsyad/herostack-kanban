"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Folder, Users, Archive, Search } from "lucide-react";
import type { BoardWithRelations } from "../../lib/types";

export default function BoardsPage() {
  const router = useRouter();
  const [boards, setBoards] = useState<BoardWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "personal" | "team">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  // Fetch boards
  useEffect(() => {
    fetchBoards();
  }, [filter, showArchived]);

  const fetchBoards = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        type: filter,
        isArchived: showArchived.toString(),
      });

      const response = await fetch(`/api/plugins/kanban/boards?${params}`);
      const data = await response.json();

      if (response.ok) {
        setBoards(data.boards || []);
      } else {
        console.error("Failed to fetch boards:", data.error);
      }
    } catch (error) {
      console.error("Error fetching boards:", error);
    } finally {
      setLoading(false);
    }
  };

  // Create new board
  const handleCreateBoard = async () => {
    const name = prompt("Enter board name:");
    if (!name) return;

    const type = confirm("Create team board? (Cancel for personal board)")
      ? "team"
      : "personal";

    try {
      const response = await fetch("/api/plugins/kanban/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type }),
      });

      const data = await response.json();

      if (response.ok) {
        // Navigate to new board
        router.push(`/kanban/boards/${data.board.id}`);
      } else {
        alert(`Failed to create board: ${data.error}`);
      }
    } catch (error) {
      console.error("Error creating board:", error);
      alert("Failed to create board");
    }
  };

  // Filter boards by search query
  const filteredBoards = boards.filter((board) =>
    board.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Kanban Boards</h1>
              <p className="text-sm text-gray-500 mt-1">
                Organize your tasks with flexible kanban boards
              </p>
            </div>
            <button
              onClick={handleCreateBoard}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>New Board</span>
            </button>
          </div>

          {/* Filters */}
          <div className="mt-6 flex items-center gap-4">
            {/* Search */}
            <div className="flex-1 max-w-md relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search boards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setFilter("all")}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  filter === "all"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter("personal")}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  filter === "personal"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Personal
              </button>
              <button
                onClick={() => setFilter("team")}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  filter === "team"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Team
              </button>
            </div>

            {/* Show Archived */}
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Show archived</span>
            </label>
          </div>
        </div>
      </div>

      {/* Boards Grid */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-400">Loading boards...</div>
          </div>
        ) : filteredBoards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Folder className="h-16 w-16 mb-4" />
            <p className="text-lg font-medium">No boards found</p>
            <p className="text-sm">Create your first board to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBoards.map((board) => (
              <div
                key={board.id}
                onClick={() => router.push(`/kanban/boards/${board.id}`)}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer group"
                style={{ backgroundColor: board.backgroundColor || "#ffffff" }}
              >
                {/* Board Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {board.name}
                    </h3>
                    {board.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {board.description}
                      </p>
                    )}
                  </div>

                  {board.isArchived && (
                    <span className="ml-2 px-2 py-1 text-xs font-medium bg-gray-200 text-gray-600 rounded">
                      <Archive className="h-3 w-3 inline mr-1" />
                      Archived
                    </span>
                  )}
                </div>

                {/* Board Meta */}
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  {/* Type Badge */}
                  <span className="flex items-center gap-1">
                    {board.type === "team" ? (
                      <>
                        <Users className="h-4 w-4" />
                        Team
                      </>
                    ) : (
                      <>
                        <Folder className="h-4 w-4" />
                        Personal
                      </>
                    )}
                  </span>

                  {/* Cards Count */}
                  <span>{board._count?.cards || 0} cards</span>

                  {/* Members Count */}
                  {board.type === "team" && (
                    <span>{board._count?.members || 0} members</span>
                  )}
                </div>

                {/* Last Updated */}
                <div className="mt-4 text-xs text-gray-400">
                  Updated {new Date(board.updatedAt).toLocaleDateString("id-ID")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
