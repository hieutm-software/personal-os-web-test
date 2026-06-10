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
  ChevronLeft,
  ChevronRight,
  List,
  Pencil,
  PlusCircle,
  Trash2,
  X,
} from "lucide-react";
import { cn, generateUUID } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import { useAction } from "next-safe-action/hooks";
import { useQueryState } from "nuqs";
import { useMemo, useState, useRef, startTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { ActionButton } from "@/components/ui/action-button";
import { SearchBar } from "@/components/ui/search-bar";
import { Input } from "@/components/ui/input";
import { TimePicker } from "@/components/ui/time-picker";
import { PageLayout } from "@/components/ui/page-layout";
import { Toolbar } from "@/components/ui/toolbar";
import { useDialogs } from "@/components/providers/dialog-provider";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { FormDialog } from "@/components/ui/form-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { SortIcon } from "@/components/ui/sort-icon";
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/data-table";
import { useOptimisticEvents } from "@/lib/hooks/use-optimistic-events";

// ============================================================================
// SCHEMAS & HELPERS
// ============================================================================

const createEventSchema = z.object({
  title: z.string().min(1, "Required"),
  description: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
}).refine((data) => {
  if (data.startTime && data.endTime) return data.startTime < data.endTime;
  return true;
}, { message: "End time must be after start time", path: ["endTime"] });

type CreateEventForm = z.infer<typeof createEventSchema>;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

// ============================================================================
// COMPONENT
// ============================================================================

export function CalendarClient({ initialEvents }: { initialEvents: Event[] }) {
  const t = useTranslations("Calendar");
  const appLocale = useLocale();
  const dateFnsLocale = appLocale === "vi" ? vi : enUS;
  const { confirm } = useDialogs();

  // ── useOptimistic ──────────────────────────────────────────────────────────
  const { optimisticEvents, mutate } = useOptimisticEvents(initialEvents);

  // nuqs: selected date — shallow to avoid blocking main thread
  const [selectedDateStr, setSelectedDateStr] = useQueryState("date", { shallow: true });

  const [currentMonth, setCurrentMonth] = useState(
    () => selectedDateStr ? new Date(selectedDateStr) : new Date()
  );
  const selectedDate = useMemo(
    () => selectedDateStr ? parseISO(selectedDateStr) : null,
    [selectedDateStr]
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

  // ── SERVER ACTIONS (background) ───────────────────────────────────────────
  const { executeAsync: execCreate, isExecuting: isCreating } = useAction(createEventAction);
  const { executeAsync: execUpdate, isExecuting: isUpdating } = useAction(updateEventAction);
  const { executeAsync: execDelete } = useAction(deleteEventAction);
  const { executeAsync: execBulkDelete } = useAction(bulkDeleteEventsAction);

  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [lastSelectedEventId, setLastSelectedEventId] = useState<string | null>(null);

  const form = useForm<CreateEventForm>({
    resolver: zodResolver(createEventSchema),
    defaultValues: { title: "", description: "", startTime: "", endTime: "" },
  });

  // ── SUBMIT ────────────────────────────────────────────────────────────────
  const onSubmit = (data: CreateEventForm) => {
    const fallbackDateStr = listFilterDate || selectedDateStr || format(new Date(), "yyyy-MM-dd");

    const buildIso = (time: string | undefined, fallbackHour: number, fallbackMin: number, fallbackSec: number) => {
      const d = parseISO(fallbackDateStr);
      if (time) {
        const [h, m] = time.split(":");
        d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
      } else {
        d.setHours(fallbackHour, fallbackMin, fallbackSec, 0);
      }
      return d.toISOString();
    };

    const startIso = buildIso(data.startTime, 0, 0, 1);
    const endIso = buildIso(data.endTime, 23, 59, 1);

    if (editingEvent) {
      mutate(
        { type: "update", id: editingEvent.id, patch: { title: data.title, description: data.description ?? null, startTime: startIso, endTime: endIso } },
        () => execUpdate({ id: editingEvent.id, title: data.title, description: data.description ?? null, startTime: startIso, endTime: endIso }) as Promise<{ failure?: string; success?: unknown } | undefined>
      );
    } else {
      const newId = generateUUID();
      mutate(
        {
          type: "add",
          event: {
            id: newId, title: data.title, description: data.description ?? null,
            startTime: startIso, endTime: endIso, userId: "",
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          } as Event,
        },
        () => execCreate({ id: newId, title: data.title, description: data.description ?? null, startTime: startIso, endTime: endIso }) as Promise<{ failure?: string; success?: unknown } | undefined>
      );
    }

    setEditingEvent(null);
    setIsCreateEventDialogOpen(false);
    setViewMode("list");
    form.reset({ title: "", description: "", startTime: "", endTime: "" });
  };

  const handleEditClick = (event: Event) => {
    setEditingEvent(event);
    form.reset({
      title: event.title,
      description: event.description || "",
      startTime: event.startTime && new Date(event.startTime).getSeconds() !== 1 ? format(new Date(event.startTime), "HH:mm") : "",
      endTime: event.endTime && new Date(event.endTime).getSeconds() !== 1 ? format(new Date(event.endTime), "HH:mm") : "",
    });
    setViewMode("list");
    setIsCreateEventDialogOpen(true);
  };

  const handleRowClick = (e: React.MouseEvent, eventId: string, index: number) => {
    e.stopPropagation();
    if (e.shiftKey) {
      e.preventDefault();
      const anchorId = lastSelectedEventId || eventsToShow[0]?.id;
      const lastIndex = eventsToShow.findIndex((ev) => ev.id === anchorId);
      if (index !== -1 && lastIndex !== -1) {
        const start = Math.min(index, lastIndex);
        const end = Math.max(index, lastIndex);
        const newSelection = new Set<string>();
        for (let i = start; i <= end; i++) newSelection.add(eventsToShow[i].id);
        setSelectedEventIds(newSelection);
        return;
      }
    }
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const next = new Set(selectedEventIds);
      if (next.has(eventId)) next.delete(eventId); else next.add(eventId);
      setSelectedEventIds(next);
    } else {
      setSelectedEventIds(new Set([eventId]));
    }
    setLastSelectedEventId(eventId);
  };

  const handleDeleteAll = async () => {
    if (selectedEventIds.size > 0) {
      if (await confirm(`Are you sure you want to delete ${selectedEventIds.size} selected event(s)?`, { title: `Delete ${selectedEventIds.size} Events`, confirmText: "Delete", variant: "destructive" })) {
        const ids = Array.from(selectedEventIds);
        setSelectedEventIds(new Set());
        mutate(
          { type: "bulkDelete", ids },
          () => execBulkDelete({ ids }) as Promise<{ failure?: string; success?: unknown } | undefined>
        );
      }
    } else if (eventsToShow.length > 0 && await confirm("Are you sure you want to permanently delete ALL events shown?", { title: "Delete All Events", confirmText: "Delete", variant: "destructive" })) {
      const ids = eventsToShow.map((ev) => ev.id);
      mutate(
        { type: "bulkDelete", ids },
        () => execBulkDelete({ ids }) as Promise<{ failure?: string; success?: unknown } | undefined>
      );
    }
  };

  // ── CALENDAR MATH ─────────────────────────────────────────────────────────
  const daysInGrid = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  const allEventsSorted = useMemo(() => {
    return [...optimisticEvents].sort((a, b) => {
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
  }, [optimisticEvents, sortConfig]);

  const eventsToShow = (() => {
    let result = allEventsSorted;
    if (listFilterDate) {
      const filterDate = parseISO(listFilterDate);
      result = result.filter((ev) => {
        const eStart = ev.startTime ? new Date(ev.startTime) : ev.endTime ? new Date(ev.endTime) : new Date();
        const eEnd = ev.endTime ? new Date(ev.endTime) : eStart;
        return isSameDay(filterDate, eStart) || isSameDay(filterDate, eEnd) || isWithinInterval(filterDate, { start: eStart, end: eEnd });
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

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <CalendarDays className="w-6 h-6 text-primary" />
          {t("title")}
        </div>
        <div className="flex bg-black/5 dark:bg-black/20 p-1 rounded-lg border border-premium-border">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"} size="sm"
            onClick={() => setViewMode("grid")}
            className={viewMode === "grid" ? "active-tab-aura" : "inactive-tab-aura"}
          >
            <CalendarDays className="w-4 h-4" />
            <span className="hidden sm:inline">Calendar</span>
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"} size="sm"
            onClick={() => { setViewMode("list"); setListFilterDate(""); startTransition(() => { void setSelectedDateStr(null); }); }}
            className={viewMode === "list" ? "active-tab-aura" : "inactive-tab-aura"}
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">Events</span>
          </Button>
        </div>
      </div>

      <PageLayout className="relative h-full border-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-red-500/5 via-transparent to-transparent pointer-events-none z-0" />
        <div className="relative z-10 h-full flex flex-col">
          <Toolbar
            search={
              viewMode === "list" ? (
                <SearchBar value={searchQuery} onValueChange={setSearchQuery} placeholder="Search events..." containerClassName="w-full sm:max-w-xs" />
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
                    <Button variant="outline" size="sm" className="px-3"
                      onClick={() => { setCurrentMonth(new Date()); startTransition(() => { void setSelectedDateStr(format(new Date(), "yyyy-MM-dd")); }); }}>
                      {t("today")}
                    </Button>
                    <div className="flex items-center gap-1 bg-background border border-input rounded-md p-0.5 shadow-sm shrink-0">
                      <Button variant="ghost" size="sm" className="p-1 h-7 w-7" aria-label="Previous month"
                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="p-1 h-7 w-7" aria-label="Next month"
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
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
                        <Button variant="ghost" size="sm" className="absolute right-1 p-1 h-6 w-6 text-muted-foreground hover:text-foreground"
                          onClick={() => setListFilterDate("")}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                    <Button variant="destructive-outline" size="sm" onClick={handleDeleteAll} disabled={eventsToShow.length === 0}
                      title={selectedEventIds.size > 0 ? `Delete ${selectedEventIds.size} selected` : "Delete All Events"}>
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">
                        {selectedEventIds.size > 0 ? `Delete (${selectedEventIds.size})` : "Delete All"}
                      </span>
                    </Button>
                  </>
                )}
                <Button size="sm" onClick={() => { setEditingEvent(null); form.reset({ title: "", description: "" }); setIsCreateEventDialogOpen(true); }}>
                  <PlusCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("createEvent")}</span>
                </Button>
              </>
            }
          />

          <div
            className={cn("flex-1 overflow-auto", viewMode === "grid" && "bg-background")}
            onClick={() => { setSelectedEventIds(new Set()); setLastSelectedEventId(null); }}
          >
            {viewMode === "grid" && (
              <div className="p-2 sm:p-4 h-full select-none">
                <div className="grid grid-cols-7 gap-1 mb-1 sm:mb-2">
                  {WEEKDAYS.map((day) => (
                    <div key={day} className="text-center text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase py-1 sm:py-2">
                      <span className="hidden sm:inline">{day}</span>
                      <span className="sm:hidden">{day.charAt(0)}</span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1 auto-rows-[minmax(48px,1fr)] md:auto-rows-[minmax(80px,1fr)]">
                  {daysInGrid.map((day, idx) => {
                    const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isToday = isSameDay(day, new Date());
                    const now = new Date(); now.setHours(0, 0, 0, 0);
                    const isPastDay = day.getTime() < now.getTime();
                    const dayEventCount = optimisticEvents.filter((e) => {
                      if (!e.startTime && !e.endTime) return false;
                      const s = e.startTime ? new Date(e.startTime) : e.endTime ? new Date(e.endTime) : new Date();
                      const en = e.endTime ? new Date(e.endTime) : s;
                      return isSameDay(day, s) || isSameDay(day, en) || isWithinInterval(day, { start: s, end: en });
                    }).length;

                    return (
                      <button
                        key={`${day.toISOString()}-${idx}`}
                        onClick={() => {
                          const dateStr = format(day, "yyyy-MM-dd");
                          startTransition(() => { void setSelectedDateStr(dateStr); });
                          setListFilterDate(dateStr);
                          setViewMode("list");
                        }}
                        className={[
                          "relative flex flex-col p-1 sm:p-2 border rounded-md transition-all text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 overflow-hidden",
                          !isCurrentMonth ? "bg-transparent text-muted-foreground/50 border-transparent"
                            : isPastDay ? "bg-white/50 dark:bg-white/[0.02] text-muted-foreground/70 border-black/[0.05] dark:border-white/[0.05] grayscale opacity-70"
                              : "bg-white/90 dark:bg-white/[0.05] text-zinc-800 dark:text-zinc-200 border-black/[0.08] dark:border-premium-border shadow-sm dark:shadow-[inset_0_1px_0_0_var(--glass-border)]",
                          isSelected ? "ring-2 ring-indigo-500 border-indigo-500 bg-indigo-500/10 dark:bg-indigo-500/20"
                            : "hover:border-indigo-500/50 hover:bg-white hover:shadow-md dark:hover:bg-white/[0.08] dark:hover:shadow-none",
                        ].join(" ")}
                      >
                        <span className={`text-xs sm:text-sm font-medium flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full mx-auto sm:mx-0 ${isToday ? "bg-primary text-primary-foreground" : ""}`}>
                          {format(day, "d")}
                        </span>
                        {dayEventCount > 0 && (
                          <div className="mt-auto flex flex-wrap justify-center sm:justify-start gap-0.5 sm:gap-1 pt-1">
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-indigo-400 shrink-0 shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
                            <span className="hidden sm:inline-block text-[10px] font-medium text-muted-foreground leading-none">{dayEventCount}</span>
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
                      <TableHead className="w-full min-w-[200px] cursor-pointer group" onClick={() => handleSort("title")}>
                        <div className="flex items-center gap-2">Event Name <SortIcon active={sortConfig.key === "title"} direction={sortConfig.direction} /></div>
                      </TableHead>
                      <TableHead className="w-[160px] min-w-[160px] cursor-pointer group" onClick={() => handleSort("date")}>
                        <div className="flex items-center gap-2">Date <SortIcon active={sortConfig.key === "date"} direction={sortConfig.direction} /></div>
                      </TableHead>
                      <TableHead className="w-[120px] min-w-[120px] hidden sm:table-cell">Start Time</TableHead>
                      <TableHead className="w-[120px] min-w-[120px] hidden sm:table-cell">End Time</TableHead>
                      <TableHead className="w-[160px] min-w-[160px] hidden sm:table-cell cursor-pointer group" onClick={() => handleSort("createdAt")}>
                        <div className="flex items-center gap-2">Created <SortIcon active={sortConfig.key === "createdAt"} direction={sortConfig.direction} /></div>
                      </TableHead>
                      <TableHead className="w-[120px] min-w-[120px] text-left">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eventsToShow.length === 0 ? (
                      <TableRow className="hover:bg-transparent cursor-default">
                        <TableCell colSpan={6} className="p-0">
                          <EmptyState icon={CalendarDays} title={t("noEvents")} description={searchQuery || listFilterDate ? "No matching events found." : "You have no events yet."} />
                        </TableCell>
                      </TableRow>
                    ) : (
                      eventsToShow.map((event, index) => (
                        <TableRow
                          key={event.id}
                          className={cn("group transition-colors border-l-2 cursor-pointer",
                            selectedEventIds.has(event.id) ? "bg-primary/5 border-l-primary" : "hover:bg-muted/50 border-l-transparent")}
                          onClick={(e) => handleRowClick(e, event.id, index)}
                        >
                          <TableCell className="font-medium text-foreground w-full max-w-[0px]">
                            <div className="flex flex-col">
                              <span className="truncate w-full">{event.title}</span>
                              {event.description && (
                                <span className="text-xs text-muted-foreground font-normal truncate w-full mt-1">{event.description}</span>
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
                            {event.startTime && new Date(event.startTime).getSeconds() !== 1 ? format(new Date(event.startTime), "HH:mm") : "--:--"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground hidden sm:table-cell">
                            {event.endTime && new Date(event.endTime).getSeconds() !== 1 ? format(new Date(event.endTime), "HH:mm") : "--:--"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground hidden sm:table-cell">
                            {format(new Date(event.createdAt), "MM/dd/yyyy HH:mm")}
                          </TableCell>
                          <TableCell className="text-left">
                            <div className="flex items-center justify-start gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <ActionButton actionType="edit" onClick={(e) => { e.stopPropagation(); handleEditClick(event); }} title="Edit">
                                <Pencil className="w-4 h-4" />
                              </ActionButton>
                              <ActionButton
                                actionType="delete"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  mutate(
                                    { type: "delete", id: event.id },
                                    () => execDelete({ id: event.id }) as Promise<{ failure?: string; success?: unknown } | undefined>
                                  );
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

          <FormDialog
            isOpen={isCreateEventDialogOpen}
            onOpenChange={(open) => {
              setIsCreateEventDialogOpen(open);
              if (!open) { setEditingEvent(null); form.reset({ title: "", description: "", startTime: "", endTime: "" }); setViewMode("list"); }
            }}
            title={editingEvent ? "Edit Event" : t("createEvent")}
            onSubmit={form.handleSubmit(onSubmit)}
            isSubmitting={editingEvent ? isUpdating : isCreating}
            submitText={editingEvent ? "Save" : t("add")}
          >
            <div className="space-y-2">
              <Input variant="form" {...form.register("title")} className="py-4 text-base" placeholder={t("eventTitle") + "..."} autoFocus />
              {form.formState.errors.title && <p className="text-xs text-destructive px-1">{form.formState.errors.title.message}</p>}
            </div>
            <div className="space-y-2">
              <textarea {...form.register("description")} rows={3}
                className="flex w-full rounded-xl border border-black/[0.08] dark:border-premium-border bg-white/90 dark:bg-black/20 px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300 shadow-sm resize-none transition-all focus:border-indigo-500/50 focus:bg-white dark:focus:bg-premium-dark focus:outline-none focus:ring-4 focus:ring-indigo-500/10 placeholder:text-zinc-400"
                placeholder="Optional details..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Controller name="startTime" control={form.control} render={({ field }) => <TimePicker value={field.value} onChange={field.onChange} placeholder="Start Time" />} />
              </div>
              <div className="space-y-2">
                <Controller name="endTime" control={form.control} render={({ field }) => <TimePicker value={field.value} onChange={field.onChange} placeholder="End Time" />} />
                {form.formState.errors.endTime && <p className="text-red-500 text-sm mt-1">{form.formState.errors.endTime.message}</p>}
              </div>
            </div>
          </FormDialog>
        </div>
      </PageLayout>
    </div>
  );
}
