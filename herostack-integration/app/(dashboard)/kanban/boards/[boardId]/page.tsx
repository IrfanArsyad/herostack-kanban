"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Settings, Plus, Users } from "lucide-react";
import { BoardView } from "../../../components/board-view";
import type { BoardWithRelations } from "../../../lib/types";

export default function BoardPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params?.boardId as string;

  const [board, setBoard] = useState<BoardWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Fetch board data
  useEffect(() => {
    if (boardId) {
      fetchBoard();
    }
  }, [boardId]);

  const fetchBoard = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/plugins/kanban/boards/${boardId}`);
      const data = await response.json();

      if (response.ok) {
        setBoard(data.board);
        setUserRole(data.role);
      } else {
        setError(data.error || "Failed to load board");
      }
    } catch (err) {
      console.error("Error fetching board:", err);
      setError("Failed to load board");
    } finally {
      setLoading(false);
    }
  };

  // Handle card move
  const handleCardMove = useCallback(
    async (cardId: string, columnId: string, position: number) => {
      try {
        const response = await fetch(`/api/plugins/kanban/cards/${cardId}/move`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ columnId, position }),
        });

        if (!response.ok) {
          const data = await response.json();
          console.error("Failed to move card:", data.error);
          throw new Error(data.error);
        }

        // Refresh board after successful move
        await fetchBoard();
      } catch (error) {
        console.error("Error moving card:", error);
        throw error;
      }
    },
    [boardId]
  );

  // Handle add card
  const handleAddCard = useCallback(
    async (columnId: string) => {
      const title = prompt("Enter card title:");
      if (!title) return;

      try {
        const response = await fetch(`/api/plugins/kanban/boards/${boardId}/cards`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ columnId, title }),
        });

        if (response.ok) {
          await fetchBoard();
        } else {
          const data = await response.json();
          alert(`Failed to create card: ${data.error}`);
        }
      } catch (error) {
        console.error("Error creating card:", error);
        alert("Failed to create card");
      }
    },
    [boardId]
  );

  // Handle add column
  const handleAddColumn = async () => {
    const name = prompt("Enter column name:");
    if (!name) return;

    try {
      const response = await fetch(`/api/plugins/kanban/boards/${boardId}/columns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (response.ok) {
        await fetchBoard();
      } else {
        const data = await response.json();
        alert(`Failed to create column: ${data.error}`);
      }
    } catch (error) {
      console.error("Error creating column:", error);
      alert("Failed to create column");
    }
  };

  // Handle card click (would open card modal in full implementation)
  const handleCardClick = (cardId: string) => {
    // TODO: Open card details modal
    console.log("Card clicked:", cardId);
  };

  // Handle column edit
  const handleColumnEdit = (columnId: string) => {
    // TODO: Open column edit menu
    console.log("Column edit:", columnId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading board...</div>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-red-600 mb-4">{error || "Board not found"}</div>
        <button
          onClick={() => router.push("/kanban/boards")}
          className="text-blue-600 hover:underline"
        >
          Back to boards
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left Side */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/kanban/boards")}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <div>
                <h1 className="text-xl font-bold text-gray-900">{board.name}</h1>
                {board.description && (
                  <p className="text-sm text-gray-500 mt-0.5">{board.description}</p>
                )}
              </div>

              {/* Board Type Badge */}
              <span
                className={`px-2 py-1 text-xs font-medium rounded ${
                  board.type === "team"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {board.type === "team" ? (
                  <Users className="h-3 w-3 inline mr-1" />
                ) : null}
                {board.type === "team" ? "Team" : "Personal"}
              </span>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-2">
              {/* Add Column Button */}
              <button
                onClick={handleAddColumn}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Column</span>
              </button>

              {/* Board Settings */}
              {(userRole === "owner" || userRole === "editor") && (
                <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <Settings className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Board Content */}
      <div className="py-6">
        <BoardView
          board={board}
          onCardMove={handleCardMove}
          onCardClick={handleCardClick}
          onAddCard={handleAddCard}
          onColumnEdit={handleColumnEdit}
        />
      </div>
    </div>
  );
}
