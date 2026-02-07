import { Button } from "@/components/ui/button";
import { useThreads } from "@/providers/Thread";
import { Thread } from "@langchain/langgraph-sdk";
import { useEffect, useState, useRef, useCallback } from "react";

import { getContentString } from "../utils";
import { useQueryState, parseAsBoolean } from "nuqs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { PanelRightOpen, PanelRightClose, Trash2, GripVertical, ListChecks, CheckSquare2, Square, X, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function ThreadList({
  threads,
  onThreadClick,
}: {
  threads: Thread[];
  onThreadClick?: (threadId: string) => void;
}) {
  const [threadId, setThreadId] = useQueryState("threadId");
  const { deleteThread } = useThreads();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [threadToDelete, setThreadToDelete] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedThreadIds, setSelectedThreadIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    setThreadToDelete(threadId);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (threadToDelete) {
      try {
        await deleteThread(threadToDelete);
        if (threadToDelete === threadId) {
          setThreadId(null);
        }
      } catch (error) {
        console.error("Failed to delete thread:", error);
      }
    }
    setDeleteConfirmOpen(false);
    setThreadToDelete(null);
  };

  const handleToggleSelect = useCallback((tid: string) => {
    setSelectedThreadIds((prev) => {
      const next = new Set(prev);
      if (next.has(tid)) {
        next.delete(tid);
      } else {
        next.add(tid);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedThreadIds(new Set(threads.map((t) => t.thread_id)));
  }, [threads]);

  const handleDeselectAll = useCallback(() => {
    setSelectedThreadIds(new Set());
  }, []);

  const handleCancelSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedThreadIds(new Set());
  }, []);

  const handleBatchDelete = useCallback(async () => {
    if (selectedThreadIds.size === 0) return;
    setIsDeleting(true);
    try {
      const idsToDelete = Array.from(selectedThreadIds);
      for (const tid of idsToDelete) {
        await deleteThread(tid);
      }
      if (threadId && selectedThreadIds.has(threadId)) {
        setThreadId(null);
      }
      toast.success(
        `Deleted ${idsToDelete.length} thread${idsToDelete.length !== 1 ? "s" : ""}`,
      );
      setSelectionMode(false);
      setSelectedThreadIds(new Set());
    } catch (error) {
      console.error("Failed to delete threads:", error);
      toast.error("Failed to delete some threads. Please try again.");
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
    }
  }, [selectedThreadIds, deleteThread, threadId, setThreadId]);

  return (
    <>
      {threads.length > 0 && (
        <div className="flex w-full items-center justify-end px-3 -mt-4 mb-1">
          <Button
            variant="ghost"
            size="sm"
            className={`h-7 text-xs ${selectionMode ? "text-primary" : "text-muted-foreground"}`}
            onClick={() => {
              if (selectionMode) {
                handleCancelSelection();
              } else {
                setSelectionMode(true);
              }
            }}
          >
            <ListChecks className="mr-1 h-3.5 w-3.5" />
            {selectionMode ? "Exit Select" : "Select"}
          </Button>
        </div>
      )}
      <div className="flex h-full w-full flex-col gap-2 overflow-y-scroll [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent">
        <div className="flex-1 flex flex-col items-start justify-start gap-2">
          {threads.map((t) => {
            let itemText = t.thread_id;
            if (
              typeof t.values === "object" &&
              t.values &&
              "messages" in t.values &&
              Array.isArray(t.values.messages) &&
              t.values.messages?.length > 0
            ) {
              const firstMessage = t.values.messages[0];
              itemText = getContentString(firstMessage.content);
            }
            const isSelected = selectedThreadIds.has(t.thread_id);
            return (
              <div
                key={t.thread_id}
                className={`group relative w-full px-1 ${isSelected ? "bg-primary/10 rounded-md" : ""}`}
              >
                <div className="flex items-center">
                  {selectionMode && (
                    <button
                      type="button"
                      className="flex-shrink-0 ml-1 mr-1 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => handleToggleSelect(t.thread_id)}
                    >
                      {isSelected ? (
                        <CheckSquare2 className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  )}
                  <Button
                    variant="ghost"
                    className={`flex-1 pr-10 items-start justify-start text-left font-normal ${selectionMode ? "pl-1" : ""}`}
                    onClick={(e) => {
                      e.preventDefault();
                      if (selectionMode) {
                        handleToggleSelect(t.thread_id);
                        return;
                      }
                      onThreadClick?.(t.thread_id);
                      if (t.thread_id === threadId) return;
                      setThreadId(t.thread_id);
                    }}
                  >
                    <p className="truncate text-ellipsis">{itemText}</p>
                  </Button>
                  {!selectionMode && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(e) => handleDeleteClick(e, t.thread_id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {selectionMode && (
          <div className="sticky bottom-0 flex flex-col gap-2 border-t bg-background p-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {selectedThreadIds.size} of {threads.length} selected
              </span>
              <div className="flex items-center gap-1">
                {selectedThreadIds.size < threads.length ? (
                  <Button variant="ghost" size="sm" onClick={handleSelectAll} disabled={isDeleting} className="h-7 text-xs px-2">
                    Select All
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={handleDeselectAll} disabled={isDeleting} className="h-7 text-xs px-2">
                    Deselect
                  </Button>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                className="flex-1 h-8"
                disabled={isDeleting || selectedThreadIds.size === 0}
                onClick={() => setDeleteConfirmOpen(true)}
              >
                {isDeleting ? (
                  <LoaderCircle className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                )}
                Delete ({selectedThreadIds.size})
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                disabled={isDeleting}
                onClick={handleCancelSelection}
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Single thread delete confirmation */}
      <AlertDialog open={deleteConfirmOpen && !selectionMode} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Thread</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this thread? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch delete confirmation */}
      <AlertDialog open={deleteConfirmOpen && selectionMode} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Threads</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedThreadIds.size} thread
              {selectedThreadIds.size !== 1 ? "s" : ""}? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                handleBatchDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <LoaderCircle className="mr-1 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ThreadHistoryLoading() {
  return (
    <div className="flex h-full w-full flex-col items-start justify-start gap-2 overflow-y-scroll px-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent">
      {Array.from({ length: 30 }).map((_, i) => (
        <Skeleton
          key={`skeleton-${i}`}
          className="h-10 w-full"
        />
      ))}
    </div>
  );
}

const MIN_WIDTH = 200;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 300;

interface ThreadHistoryProps {
  onWidthChange?: (width: number) => void;
}

export default function ThreadHistory({ onWidthChange }: ThreadHistoryProps = {}) {
  const isLargeScreen = useMediaQuery("(min-width: 1024px)");
  const [chatHistoryOpen, setChatHistoryOpen] = useQueryState(
    "chatHistoryOpen",
    parseAsBoolean.withDefault(false),
  );

  const { getThreads, threads, setThreads, threadsLoading, setThreadsLoading } =
    useThreads();

  // Resizing state and refs
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH);
  const isResizing = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Load saved width after mount to avoid hydration issues
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("threadHistoryPanelWidth");
      if (saved) {
        const width = parseInt(saved, 10);
        setPanelWidth(width);
        onWidthChange?.(width);
      } else {
        onWidthChange?.(panelWidth);
      }
    }
  }, []); // Only run on mount

  // Handle mouse down on resize handle
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  // Handle mouse move for resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      
      const newWidth = e.clientX;
      const clampedWidth = Math.min(Math.max(newWidth, MIN_WIDTH), MAX_WIDTH);
      setPanelWidth(clampedWidth);
      onWidthChange?.(clampedWidth);
      
      // Save to localStorage while dragging for smoother experience
      if (typeof window !== "undefined") {
        localStorage.setItem("threadHistoryPanelWidth", clampedWidth.toString());
      }
    };

    const handleMouseUp = () => {
      if (!isResizing.current) return;
      
      isResizing.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setThreadsLoading(true);
    getThreads()
      .then(setThreads)
      .catch(console.error)
      .finally(() => setThreadsLoading(false));
  }, [getThreads, setThreads, setThreadsLoading]);

  return (
    <>
      <div 
        ref={panelRef}
        className="shadow-inner-right relative hidden h-screen shrink-0 flex-col items-start justify-start gap-6 border-r-2 border-border bg-background lg:flex"
        style={{ width: `${panelWidth}px` }}
      >
        {/* Resize handle */}
        <div
          className="absolute -right-2 top-0 z-30 h-full w-4 cursor-col-resize flex items-center justify-center group hover:bg-accent/50 transition-colors"
          onMouseDown={handleMouseDown}
        >
          <div className="h-12 w-1 rounded-full bg-border group-hover:bg-primary transition-colors" />
        </div>

        <div className="flex w-full items-center justify-between px-4 pt-1.5">
          <Button
            variant="ghost"
            onClick={() => setChatHistoryOpen((p) => !p)}
          >
            {chatHistoryOpen ? (
              <PanelRightOpen className="size-5" />
            ) : (
              <PanelRightClose className="size-5" />
            )}
          </Button>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Thread History
          </h1>
        </div>
        {threadsLoading ? (
          <ThreadHistoryLoading />
        ) : (
          <ThreadList threads={threads} />
        )}
      </div>
      <div className="lg:hidden">
        <Sheet
          open={!!chatHistoryOpen && !isLargeScreen}
          onOpenChange={(open) => {
            if (isLargeScreen) return;
            setChatHistoryOpen(open);
          }}
        >
          <SheetContent
            side="left"
            className="flex lg:hidden"
          >
            <SheetHeader>
              <SheetTitle>Thread History</SheetTitle>
            </SheetHeader>
            <ThreadList
              threads={threads}
              onThreadClick={() => setChatHistoryOpen((o) => !o)}
            />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
