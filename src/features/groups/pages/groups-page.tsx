import { Bell, MoreHorizontal, Plus, Share2, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createGroup,
  deleteGroup,
  getGroupsDashboard,
} from "@/services/api/groups-api";
import { getNotifications } from "@/services/api/notifications-api";
import { useI18n } from "@/i18n/use-i18n";
import { ShareGroupCodeDialog } from "@/features/groups/components/share-group-code-dialog";
import { useAuth } from "@/features/auth/auth-context";
import { bindCommonRefreshEvents } from "@/services/realtime/common-events";
import { getRealtimeSocket } from "@/services/realtime/socket";
import type { GroupSummary } from "@/types/groups";

export function GroupsPage() {
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [groupUnreadCounts, setGroupUnreadCounts] = useState<
    Record<string, number>
  >({});
  const [isOpen, setIsOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingGroupId, setIsDeletingGroupId] = useState<string | null>(
    null,
  );
  const [shareGroupId, setShareGroupId] = useState<string | null>(null);
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
  const isRefreshingUnreadRef = useRef(false);
  const hasQueuedUnreadRefreshRef = useRef(false);
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();

  const getEntityId = (value: unknown): string | null => {
    if (!value) return null;
    if (typeof value === "string") return value;
    if (typeof value === "object" && "_id" in value) {
      const nestedId = (value as { _id?: unknown })._id;
      return typeof nestedId === "string" ? nestedId : null;
    }
    return null;
  };

  const loadGroups = async () => {
    const data = await getGroupsDashboard();
    setGroups(data);
  };

  const loadGroupUnreadCounts = async () => {
    if (isRefreshingUnreadRef.current) {
      hasQueuedUnreadRefreshRef.current = true;
      return;
    }

    isRefreshingUnreadRef.current = true;
    try {
      do {
        hasQueuedUnreadRefreshRef.current = false;

        const notifications = await getNotifications();
        const nextCounts: Record<string, number> = {};

        notifications.forEach((item) => {
          if (item.read) return;
          const groupId = getEntityId(item.data?.group_id);
          if (!groupId) return;
          nextCounts[groupId] = (nextCounts[groupId] ?? 0) + 1;
        });

        setGroupUnreadCounts(nextCounts);
      } while (hasQueuedUnreadRefreshRef.current);
    } finally {
      isRefreshingUnreadRef.current = false;
    }
  };

  useEffect(() => {
    void Promise.all([loadGroups(), loadGroupUnreadCounts()]);
  }, []);

  useEffect(() => {
    if (!user) return;

    const socket = getRealtimeSocket(user);
    const refresh = () => {
      void loadGroupUnreadCounts();
    };

    const unbindCommonRefresh = bindCommonRefreshEvents(socket, refresh);
    socket.on("sos-alert-received", refresh);

    return () => {
      unbindCommonRefresh();
      socket.off("sos-alert-received", refresh);
    };
  }, [user]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      checkInDate &&
      checkOutDate &&
      new Date(checkOutDate) < new Date(checkInDate)
    ) {
      alert("Check-out date cannot be before check-in date");
      return;
    }

    setIsSaving(true);

    try {
      await createGroup(
        groupName,
        checkInDate || undefined,
        checkOutDate || undefined,
      );
      setGroupName("");
      setCheckInDate("");
      setCheckOutDate("");
      setIsOpen(false);
      await Promise.all([loadGroups(), loadGroupUnreadCounts()]);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (isDeletingGroupId) return;

    setIsDeletingGroupId(groupId);
    try {
      await deleteGroup(groupId);
      await Promise.all([loadGroups(), loadGroupUnreadCounts()]);
    } catch (error) {
      console.error("Failed to delete group", error);
    } finally {
      setIsDeletingGroupId(null);
      setDeleteGroupId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title={t("groups.title")}
        description={t("groups.description")}
        action={
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 size-4" />
                {t("groups.create")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("groups.create_title")}</DialogTitle>
                <DialogDescription>{t("groups.create_desc")}</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="groupName">{t("groups.name")}</Label>
                  <Input
                    id="groupName"
                    required
                    minLength={3}
                    value={groupName}
                    onChange={(event) => setGroupName(event.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="checkInDate">
                      Check-in Date (Optional)
                    </Label>
                    <Input
                      id="checkInDate"
                      type="date"
                      value={checkInDate}
                      onChange={(event) => setCheckInDate(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="checkOutDate">
                      Check-out Date (Optional)
                    </Label>
                    <Input
                      id="checkOutDate"
                      type="date"
                      value={checkOutDate}
                      min={checkInDate || undefined}
                      onChange={(event) => setCheckOutDate(event.target.value)}
                    />
                  </div>
                </div>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? t("groups.creating") : t("groups.create_action")}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("groups.group")}</TableHead>
              <TableHead>{t("groups.code")}</TableHead>
              <TableHead>{t("groups.pilgrims")}</TableHead>
              <TableHead>{t("groups.moderators")}</TableHead>
              <TableHead className="text-right">{t("groups.action")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((group) => (
              <TableRow
                key={group._id}
                className="cursor-pointer"
                onClick={() => navigate(`/app/groups/${group._id}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    navigate(`/app/groups/${group._id}`);
                  }
                }}
                tabIndex={0}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span>{group.group_name}</span>
                    {(groupUnreadCounts[group._id] ?? 0) > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                        <Bell className="size-3" />
                        {groupUnreadCounts[group._id] > 99
                          ? "99+"
                          : groupUnreadCounts[group._id]}
                      </span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{group.group_code}</Badge>
                </TableCell>
                <TableCell>
                  {group.pilgrim_count ?? group.pilgrim_ids?.length ?? 0}
                </TableCell>
                <TableCell>{group.moderator_ids?.length ?? 0}</TableCell>
                <TableCell
                  className="text-right"
                  onClick={(event) => event.stopPropagation()}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="Group quick actions"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onSelect={(event) => {
                          event.preventDefault();
                          setShareGroupId(group._id);
                        }}
                      >
                        <Share2 className="mr-2 size-4" />
                        Share group code
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer text-red-600"
                        disabled={isDeletingGroupId === group._id}
                        onSelect={(event) => {
                          event.preventDefault();
                          setDeleteGroupId(group._id);
                        }}
                      >
                        <Trash2 className="mr-2 size-4" />
                        {isDeletingGroupId === group._id
                          ? "Deleting..."
                          : "Delete group"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {shareGroupId ? (
        <ShareGroupCodeDialog
          groupId={shareGroupId}
          groupName={
            groups.find((group) => group._id === shareGroupId)?.group_name ?? ""
          }
          groupCode={
            groups.find((group) => group._id === shareGroupId)?.group_code ?? ""
          }
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              setShareGroupId(null);
            }
          }}
          hideTrigger
        />
      ) : null}

      <Dialog
        open={deleteGroupId !== null}
        onOpenChange={(open) => !open && setDeleteGroupId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete group</DialogTitle>
            <DialogDescription>
              This will permanently delete{" "}
              <span className="font-semibold">
                {groups.find((group) => group._id === deleteGroupId)
                  ?.group_name ?? "this group"}
              </span>
              . This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteGroupId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!deleteGroupId || isDeletingGroupId === deleteGroupId}
              onClick={() => {
                if (deleteGroupId) {
                  void handleDeleteGroup(deleteGroupId);
                }
              }}
            >
              {isDeletingGroupId === deleteGroupId
                ? "Deleting..."
                : "Delete group"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
