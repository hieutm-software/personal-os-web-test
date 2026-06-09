"use client";

import { bulkDeleteEventsAction, createEventAction, deleteEventAction, updateEventAction } from "@/lib/actions/events";
import { Event } from "@/lib/db/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { enUS, vi } from "date-fns/locale";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  List,
  Pencil,
  PlusCircle,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDialogs } from "@/components/providers/dialog-provider";
import { DatePicker } from "@/components/ui/date-picker";
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/data-table";
import { ActionButton } from "@/components/ui/action-button";
import { SearchBar } from "@/components/ui/search-bar";
import { PageLayout } from "@/components/ui/page-layout";
import { Toolbar } from "@/components/ui/toolbar";

// ============================================================================
// SCHEMAS & HELPERS
// ============================================================================

const createEventSchema = z.object({
  title: z.string().min(1, "Required"),
  description: z.string().optional(),
});

type CreateEventForm = z.infer<typeof createEventSchema>;



// Weekday headers, Sunday-first
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

// ============================================================================
// COMPONENT
// ============================================================================

export function CalendarClient({ initialEvents }: { initialEvents: Event[] }) {
  const t = useTranslations("Calendar");
  const appLocale = useLocale();
  const dateFnsLocale = appLocale === "vi" ? vi : enUS;
  const router = useRouter();
  const { confirm } = useDialogs();

  // Nuqs URL State for selected date
  const [selectedDateStr, setSelectedDateStr] = useQueryState("date");
  
  const [localEvents, setLocalEvents] = useState<Event[]>(initialEvents);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setLocalEvents(initialEvents), [initialEvents]);

  // Local state for calendar viewing month
  const [currentMonth, setCurrentMonth] = useState(
    () => selectedDateStr ? new Date(selectedDateStr) : new Date(),
  );
  const selectedDate = useMemo(
    () => selectedDateStr ? parseISO(selectedDateStr) : null,
    [selectedDateStr],
  );

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isCreateEventDialogOpen, setIsCreateEventDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [listFilterDate, setListFilterDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const [sortConfig, setSortConfig] = useState<{
    key: "title" | "createdAt" | "date";
    direction: "asc" | "desc";
  }>({ key: "createdAt", direction: "desc" });

  const handleSort = (key: "title" | "createdAt" | "date") => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const {
    execute: execCreate,
    status: createStatus,
    reset: resetCreate,
    result: createResult,
  } = useAction(createEventAction);
  const { 
    execute: execUpdate, 
    status: updateStatus, 
    reset: resetUpdate, 
    result: updateResult 
  } = useAction(updateEventAction);
  const { execute: execDelete } = useAction(deleteEventAction);
  const { execute: execBulkDelete } = useAction(bulkDeleteEventsAction);

  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [lastSelectedEventId, setLastSelectedEventId] = useState<string | null>(null);

  // (moved useEffect down below eventsToShow)

  const form = useForm<CreateEventForm>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  const onSubmit = (data: CreateEventForm) => {
    const fallbackDateStr = listFilterDate || selectedDateStr || format(new Date(), "yyyy-MM-dd");
    const defaultIso = `${fallbackDateStr}T00:00:00.000Z`;

    if (editingEvent) {
      setLocalEvents((prev) => prev.map((e) => e.id === editingEvent.id ? { ...e, title: data.title, description: data.description ?? null, startTime: editingEvent.startTime ? new Date(editingEvent.startTime).toISOString() : defaultIso, endTime: editingEvent.endTime ? new Date(editingEvent.endTime).toISOString() : defaultIso } : e));
      execUpdate({
        id: editingEvent.id,
        title: data.title,
        description: data.description ?? null,
        startTime: editingEvent.startTime ? new Date(editingEvent.startTime).toISOString() : defaultIso,
        endTime: editingEvent.endTime ? new Date(editingEvent.endTime).toISOString() : defaultIso,
      });
    } else {
      setLocalEvents((prev) => [{ id: "temp-" + Date.now(), title: data.title, description: data.description ?? null, startTime: defaultIso, endTime: defaultIso, userId: "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as Event, ...prev]);
      execCreate({
        title: data.title,
        description: data.description ?? null,
        startTime: defaultIso,
        endTime: defaultIso,
      });
    }

    // Close immediately for optimistic UI feel
    setEditingEvent(null);
    setIsCreateEventDialogOpen(false);
    setViewMode("list");
    form.reset({ title: "", description: "" });
  };

  // Auto-reset form on success
  useEffect(() => {
    if (createResult.data?.success || updateResult.data?.success) {
      router.refresh();
      setTimeout(() => { resetCreate(); resetUpdate(); }, 2000);
    }
  }, [createResult, updateResult, resetCreate, resetUpdate, router]);

  const handleEditClick = (event: Event) => {
    setEditingEvent(event);
    form.reset({
      title: event.title,
      description: event.description || "",
    });
    setViewMode("list");
    setIsCreateEventDialogOpen(true);
  };

  const handleRowClick = (e: React.MouseEvent, eventId: string, index: number) => {
    e.stopPropagation();

    if (e.shiftKey) {
      e.preventDefault();
      const currentIndex = index;
      const anchorId = lastSelectedEventId || eventsToShow[0]?.id;
      const lastIndex = eventsToShow.findIndex((ev) => ev.id === anchorId);
      
      if (currentIndex !== -1 && lastIndex !== -1) {
        const start = Math.min(currentIndex, lastIndex);
        const end = Math.max(currentIndex, lastIndex);
        const newSelection = new Set<string>();
        for (let i = start; i <= end; i++) {
          newSelection.add(eventsToShow[i].id);
        }
        setSelectedEventIds(newSelection);
        return;
      }
    }

    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const newSelection = new Set(selectedEventIds);
      if (newSelection.has(eventId)) {
        newSelection.delete(eventId);
      } else {
        newSelection.add(eventId);
      }
      setSelectedEventIds(newSelection);
    } else {
      setSelectedEventIds(new Set([eventId]));
    }
    setLastSelectedEventId(eventId);
  };

  const handleDeleteAll = async () => {
    if (selectedEventIds.size > 0) {
      if (await confirm(`Are you sure you want to delete ${selectedEventIds.size} selected event(s)?`, { title: `Delete ${selectedEventIds.size} Events`, confirmText: "Delete", variant: "destructive" })) {
        const ids = Array.from(selectedEventIds);
        setLocalEvents((prev) => prev.filter((ev) => !ids.includes(ev.id)));
        execBulkDelete({ ids });
        setSelectedEventIds(new Set());
      }
    } else {
      if (eventsToShow.length > 0 && await confirm("Are you sure you want to permanently delete ALL events shown?", { title: "Delete All Events", confirmText: "Delete", variant: "destructive" })) {
        const ids = eventsToShow.map((ev) => ev.id);
        setLocalEvents((prev) => prev.filter((ev) => !ids.includes(ev.id)));
        execBulkDelete({ ids });
      }
    }
  };

  // ============================================================================
  // CALENDAR MATH
  // ============================================================================
  const daysInGrid = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  const allEventsSorted = useMemo(() => {
    return [...localEvents].sort((a, b) => {
      let comparison = 0;
      if (sortConfig.key === "title") {
        comparison = (a.title || "").localeCompare(b.title || "");
      } else if (sortConfig.key === "createdAt") {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else {
        const tA = a.startTime ? new Date(a.startTime).getTime() : 0;
        const tB = b.startTime ? new Date(b.startTime).getTime() : 0;
        comparison = tA - tB;
      }
      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
  }, [localEvents, sortConfig]);

  const renderSortIcon = (columnKey: "title" | "createdAt" | "date") => {
    if (sortConfig.key !== columnKey) return null;
    return (
      <span className="text-muted-foreground">
        {sortConfig.direction === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </span>
    );
  };

  const eventsToShow = (() => {
    let result = allEventsSorted;
    if (listFilterDate) {
      const filterDate = parseISO(listFilterDate);
      result = result.filter((ev) => {
        const eStart = ev.startTime ? new Date(ev.startTime) : (ev.endTime ? new Date(ev.endTime) : new Date());
        const eEnd = ev.endTime ? new Date(ev.endTime) : eStart;
        return (
          isSameDay(filterDate, eStart) ||
          isSameDay(filterDate, eEnd) ||
          isWithinInterval(filterDate, { start: eStart, end: eEnd })
        );
      });
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((ev) => 
        (ev.title && ev.title.toLowerCase().includes(q)) || 
        (ev.description && ev.description.toLowerCase().includes(q))
      );
    }
    return result;
  })();


  // Clean up selected IDs if events are deleted or filtered out
  useEffect(() => {
    setTimeout(() => {
      setSelectedEventIds((prev) => {
        const validIds = new Set(eventsToShow.map((e) => e.id));
        const next = new Set<string>();
        let changed = false;
        for (const id of prev) {
          if (validIds.has(id)) {
            next.add(id);
          } else {
            changed = true;
          }
        }
        return changed ? next : prev;
      });

      setLastSelectedEventId((prev) => {
        if (prev && !eventsToShow.some((e) => e.id === prev)) {
          return null;
        }
        return prev;
      });
    }, 0);
  }, [eventsToShow]);

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <CalendarDays className="w-6 h-6 text-primary" />
          {t("title")}
        </div>
        <div className="flex bg-muted/50 p-1 rounded-lg border border-border">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            onClick={() => { setViewMode("grid"); }}
            className={viewMode === "grid" ? "bg-background text-foreground shadow-sm hover:bg-background" : "text-muted-foreground"}
          >
            <CalendarDays className="w-4 h-4" />
            <span className="hidden sm:inline">Calendar</span>
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => { setViewMode("list"); setListFilterDate(""); void setSelectedDateStr(null); }}
            className={viewMode === "list" ? "bg-background text-foreground shadow-sm hover:bg-background" : "text-muted-foreground"}
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">Events</span>
          </Button>
        </div>
      </div>
      <PageLayout className="rounded-xl border shadow-sm relative h-full">
        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <Toolbar
          search={
            viewMode === "list" ? (
              <SearchBar
                value={searchQuery}
                onValueChange={setSearchQuery}
                placeholder="Search events..."
                containerClassName="w-full sm:max-w-xs"
              />
            ) : (
              <div className="flex items-center w-full sm:max-w-xs">
                <h2 className="text-sm sm:text-base font-semibold tracking-tight capitalize shrink-0">
                  {format(currentMonth, "MMMM yyyy", { locale: dateFnsLocale })}
                </h2>
              </div>
            )
          }
          actions={
            <>
              {viewMode === "grid" && (
                <div className="flex items-center gap-2 mr-2">
                  <button
                    onClick={() => {
                      setCurrentMonth(new Date());
                      void setSelectedDateStr(format(new Date(), "yyyy-MM-dd"));
                    }}
                    className="px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md border border-input bg-background hover:bg-accent transition-colors shrink-0"
                  >
                    {t("today")}
                  </button>
                  <div className="flex items-center gap-1 bg-background border border-input rounded-md p-0.5 shadow-sm shrink-0">
                    <button
                      onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                      className="p-1 hover:bg-accent rounded transition-colors"
                      aria-label="Previous month"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                      className="p-1 hover:bg-accent rounded transition-colors"
                      aria-label="Next month"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
              {viewMode === "list" && (
                <>
                  <div className="relative flex items-center mr-2">
                    <DatePicker
                      date={listFilterDate ? new Date(listFilterDate + "T00:00:00") : undefined}
                      setDate={(d) => setListFilterDate(d ? format(d, "yyyy-MM-dd") : "")}
                      className="w-[180px] sm:w-[200px] pr-8"
                    />
                    {listFilterDate && (
                      <button
                        onClick={() => setListFilterDate("")}
                        className="absolute right-2 p-1 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <Button
                    variant="destructive-outline"
                    size="sm"
                    onClick={handleDeleteAll}
                    disabled={eventsToShow.length === 0}
                    title={selectedEventIds.size > 0 ? `Delete ${selectedEventIds.size} selected` : "Delete All Events"}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">
                      {selectedEventIds.size > 0 ? `Delete (${selectedEventIds.size})` : "Delete All"}
                    </span>
                  </Button>
                </>
              )}

              <Button
                size="sm"
                onClick={() => {
                  setEditingEvent(null);
                  form.reset({ title: "", description: "" });
                  setIsCreateEventDialogOpen(true);
                }}
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">{t("createEvent")}</span>
              </Button>
            </>
          }
        />

      {/* ── CONTENT AREA ──────────────────────────────────────────────────────── */}
      <div 
        className={cn("flex-1 overflow-auto", viewMode === "grid" && "bg-background")}
        onClick={() => {
          setSelectedEventIds(new Set());
          setLastSelectedEventId(null);
        }}
      >
        {viewMode === "grid" && (
          <div className="p-2 sm:p-4 h-full select-none">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-1 sm:mb-2">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="text-center text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase py-1 sm:py-2"
                >
                  <span className="hidden sm:inline">{day}</span>
                  <span className="sm:hidden">{day.charAt(0)}</span>
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1 auto-rows-[minmax(48px,1fr)] md:auto-rows-[minmax(80px,1fr)]">
              {daysInGrid.map((day, idx) => {
                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isToday = isSameDay(day, new Date());
                
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                const isPastDay = day.getTime() < now.getTime();

                const dayEventCount = localEvents.filter((e) => {
                  if (!e.startTime && !e.endTime) return false;
                  const s = e.startTime ? new Date(e.startTime) : (e.endTime ? new Date(e.endTime) : new Date());
                  const en = e.endTime ? new Date(e.endTime) : s;
                  return (
                    isSameDay(day, s) ||
                    isSameDay(day, en) ||
                    isWithinInterval(day, { start: s, end: en })
                  );
                }).length;

                return (
                  <button
                    key={`${day.toISOString()}-${idx}`}
                    onClick={() => {
                      const dateStr = format(day, "yyyy-MM-dd");
                      void setSelectedDateStr(dateStr);
                      setListFilterDate(dateStr);
                      setViewMode("list");
                    }}
                    className={[
                      "relative flex flex-col p-1 sm:p-2 border rounded-md transition-all text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 overflow-hidden",
                      !isCurrentMonth
                        ? "bg-muted/10 text-muted-foreground/50 border-transparent"
                        : isPastDay
                        ? "bg-muted/30 text-muted-foreground/70 border-border/50 grayscale opacity-70"
                        : "bg-background border-border",
                      isSelected
                        ? "ring-2 ring-primary border-primary bg-primary/5"
                        : "hover:border-primary/50",
                    ].join(" ")}
                  >
                    <span
                      className={`text-xs sm:text-sm font-medium flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full mx-auto sm:mx-0 ${
                        isToday ? "bg-primary text-primary-foreground" : ""
                      }`}
                    >
                      {format(day, "d")}
                    </span>

                    {dayEventCount > 0 && (
                      <div className="mt-auto flex flex-wrap justify-center sm:justify-start gap-0.5 sm:gap-1 pt-1">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-500 shrink-0" />
                        <span className="hidden sm:inline-block text-[10px] font-medium text-muted-foreground leading-none">
                          {dayEventCount}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {viewMode === "list" && (
          <TableContainer>
            <Table>
              <TableHeader onClick={(e) => e.stopPropagation()}>
                <TableRow>
                  <TableHead 
                    className="w-full min-w-[200px] cursor-pointer group"
                    onClick={() => handleSort("title")}
                  >
                    <div className="flex items-center gap-2">
                      Event Name
                      {renderSortIcon("title")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="w-[160px] min-w-[160px] cursor-pointer group"
                    onClick={() => handleSort("date")}
                  >
                    <div className="flex items-center gap-2">
                      Date
                      {renderSortIcon("date")}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="w-[160px] min-w-[160px] hidden sm:table-cell cursor-pointer group"
                    onClick={() => handleSort("createdAt")}
                  >
                    <div className="flex items-center gap-2">
                      Created
                      {renderSortIcon("createdAt")}
                    </div>
                  </TableHead>
                  <TableHead className="w-[120px] min-w-[120px] text-left">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {eventsToShow.length === 0 ? (
                  <TableRow className="hover:bg-transparent cursor-default">
                    <TableCell colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                      {searchQuery || listFilterDate ? "No matching events found." : t("noEvents")}
                    </TableCell>
                  </TableRow>
                ) : (
                  eventsToShow.map((event, index) => (
                    <TableRow
                      key={event.id}
                      className={cn(
                        "group transition-colors border-l-2 cursor-pointer",
                        selectedEventIds.has(event.id)
                          ? "bg-primary/5 border-l-primary"
                          : "hover:bg-muted/50 border-l-transparent"
                      )}
                      onClick={(e) => handleRowClick(e, event.id, index)}
                    >
                      <TableCell className="font-medium text-foreground w-full max-w-[0px]">
                        <div className="flex flex-col">
                          <span className="truncate w-full">{event.title}</span>
                          {event.description && (
                            <span className="text-xs text-muted-foreground font-normal truncate w-full mt-1">
                              {event.description}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {(() => {
                          const d = event.startTime ? new Date(event.startTime) : event.endTime ? new Date(event.endTime) : null;
                          return d ? format(d, "MMM d, yyyy", { locale: dateFnsLocale }) : "N/A";
                        })()}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground hidden sm:table-cell">
                        {format(new Date(event.createdAt), "MM/dd/yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="flex items-center justify-start gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <ActionButton
                            actionType="edit"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditClick(event);
                            }}
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </ActionButton>
                          <ActionButton
                            actionType="delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLocalEvents((prev) => prev.filter((ev) => ev.id !== event.id));
                              execDelete({ id: event.id });
                            }}
                            title={t("delete")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </ActionButton>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </div>
      
      <Dialog
        open={isCreateEventDialogOpen}
        onOpenChange={(open) => {
          setIsCreateEventDialogOpen(open);
          if (!open) {
            setEditingEvent(null);
            form.reset({ title: "", description: "" });
            setViewMode("list");
          }
        }}
      >
        <DialogContent aria-describedby={undefined} className="sm:max-w-2xl bg-background border-border p-6 sm:p-8 rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold tracking-tight">{editingEvent ? "Edit Event" : t("createEvent")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex flex-col mt-4">
            <div className="space-y-2">
              <input
                {...form.register("title")}
                className="flex w-full rounded-xl border border-transparent bg-muted/30 px-4 py-4 text-base font-medium shadow-sm transition-all focus:border-primary/30 focus:bg-background focus:outline-none focus:ring-4 focus:ring-primary/10 placeholder:text-muted-foreground/60"
                placeholder={t("eventTitle") + "..."}
                autoFocus
              />
              {form.formState.errors.title && (
                <p className="text-xs text-destructive px-1">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider pl-1">{t("description")}</label>
              <textarea
                {...form.register("description")}
                rows={3}
                className="flex w-full rounded-xl border border-transparent bg-muted/30 px-4 py-3 text-sm shadow-sm resize-none transition-all focus:border-primary/30 focus:bg-background focus:outline-none focus:ring-4 focus:ring-primary/10 placeholder:text-muted-foreground/40"
                placeholder="Optional details..."
              />
            </div>

            {(createResult.data?.failure || updateResult.data?.failure) && (
              <div className="text-sm text-destructive font-medium">
                {createResult.data?.failure || updateResult.data?.failure}
              </div>
            )}

            <div className="flex items-center justify-end mt-6">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateEventDialogOpen(false);
                    setEditingEvent(null);
                    form.reset({ title: "", description: "" });
                    setViewMode("list");
                  }}
                  className="rounded-lg border border-transparent bg-muted/50 px-5 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createStatus === "executing" || updateStatus === "executing"}
                  className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg disabled:opacity-50"
                >
                  {createStatus === "executing" || updateStatus === "executing" ? t("executing") : (editingEvent ? "Save" : t("add"))}
                </button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      </PageLayout>
    </div>
  );
}
