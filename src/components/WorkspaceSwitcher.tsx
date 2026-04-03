import { useState } from "react";
import { Check, ChevronsUpDown, Plus, Users, User, Bell, FolderIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useWorkspaceContext, useMyPendingInvites, useAcceptInvite, useCreateWorkspace } from "@/hooks/useWorkspaces";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { useWorkspaceTemplates, applyTemplate } from "@/hooks/useWorkspaceTemplates";
import { useAuth } from "@/hooks/useAuth";

export function WorkspaceSwitcher({ className }: { className?: string }) {
  const { user } = useAuth();
  const { currentWorkspace, workspaces, switchWorkspace } = useWorkspaceContext();
  const { data: pendingInvites = [] } = useMyPendingInvites();
  const { data: templates = [] } = useWorkspaceTemplates();
  const acceptInvite = useAcceptInvite();
  const createWorkspace = useCreateWorkspace();
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const handleCreate = () => {
    if (!newName.trim()) return;
    createWorkspace.mutate({ name: newName, description: newDesc }, {
      onSuccess: async (ws) => {
        // Apply template folders if selected
        if (selectedTemplate && user) {
          const tpl = templates.find(t => t.id === selectedTemplate);
          if (tpl) await applyTemplate(ws.id, user.id, tpl.folder_structure);
        }
        setCreateOpen(false);
        setNewName("");
        setNewDesc("");
        setSelectedTemplate(null);
        switchWorkspace(ws.id);
      },
    });
  };

  const handleSelect = (id: string) => {
    switchWorkspace(id);
    setSheetOpen(false);
  };

  const triggerButton = (
    <button
      onClick={() => isMobile && setSheetOpen(true)}
      className={cn(
        "flex items-center gap-1.5 px-1.5 py-1 md:px-2.5 md:py-1.5 rounded-lg hover:bg-secondary/70 transition-colors text-left min-w-0",
        className
      )}
    >
      <Avatar className="w-7 h-7 shrink-0">
        {(currentWorkspace as any)?.avatar_url && <AvatarImage src={(currentWorkspace as any).avatar_url} />}
        <AvatarFallback
          className={cn(
            "text-[10px] font-bold",
            currentWorkspace?.type === "personal"
              ? "bg-primary/10 text-primary"
              : "bg-accent text-accent-foreground"
          )}
          style={currentWorkspace?.color_theme && currentWorkspace.color_theme !== "default"
            ? { backgroundColor: currentWorkspace.color_theme, color: "#fff" }
            : undefined
          }
        >
          {currentWorkspace?.type === "personal" ? <User className="w-3.5 h-3.5" /> : currentWorkspace?.name?.[0]?.toUpperCase() || "W"}
        </AvatarFallback>
      </Avatar>
      <span className="hidden md:block text-sm font-semibold text-foreground truncate max-w-[120px]">
        {currentWorkspace?.name ?? "Workspace"}
      </span>
      {pendingInvites.length > 0 && (
        <Badge variant="destructive" className="h-4 w-4 p-0 text-[9px] flex items-center justify-center rounded-full shrink-0">
          {pendingInvites.length}
        </Badge>
      )}
      <ChevronsUpDown className="w-3 h-3 text-muted-foreground shrink-0 hidden md:block" />
    </button>
  );

  const workspaceList = (
    <>
      {workspaces.map((ws) => (
        <button
          key={ws.id}
          onClick={() => handleSelect(ws.id)}
          className="flex items-center gap-3 w-full px-4 py-3 hover:bg-secondary/50 transition-colors text-left"
        >
          <Avatar className="w-9 h-9 shrink-0">
            {(ws as any).avatar_url && <AvatarImage src={(ws as any).avatar_url} />}
            <AvatarFallback
              className={cn(
                "text-xs font-bold",
                ws.type === "personal" ? "bg-primary/10 text-primary" : "bg-accent text-accent-foreground"
              )}
              style={(ws as any).color_theme && (ws as any).color_theme !== "default"
                ? { backgroundColor: (ws as any).color_theme, color: "#fff" }
                : undefined
              }
            >
              {ws.type === "personal" ? <User className="w-4 h-4" /> : ws.name[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{ws.name}</p>
            <p className="text-[11px] text-muted-foreground">{ws.type === "team" ? "Team workspace" : "Personal"}</p>
          </div>
          {currentWorkspace?.id === ws.id && <Check className="w-4 h-4 text-primary shrink-0" />}
        </button>
      ))}

      {pendingInvites.length > 0 && (
        <>
          <div className="px-4 py-2 border-t border-border/40">
            <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
              <Bell className="w-3 h-3" /> Pending Invites
            </p>
          </div>
          {pendingInvites.map((inv) => (
            <div key={inv.id} className="flex items-center gap-3 px-4 py-3">
              <Users className="w-5 h-5 text-muted-foreground shrink-0" />
              <span className="truncate flex-1 text-sm">{(inv as any).workspaces?.name ?? "Workspace"}</span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs px-3"
                onClick={() => acceptInvite.mutate(inv)}
                disabled={acceptInvite.isPending}
              >
                Join
              </Button>
            </div>
          ))}
        </>
      )}

      <div className="border-t border-border/40">
        <button
          onClick={() => { setSheetOpen(false); setCreateOpen(true); }}
          className="flex items-center gap-3 w-full px-4 py-3 hover:bg-secondary/50 transition-colors text-primary"
        >
          <Plus className="w-5 h-5" />
          <span className="text-sm font-medium">Create Workspace</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile: Bottom Sheet Drawer */}
      {isMobile ? (
        <>
          {triggerButton}
          <Drawer open={sheetOpen} onOpenChange={setSheetOpen}>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Switch Workspace</DrawerTitle>
              </DrawerHeader>
              <div className="pb-6 max-h-[60vh] overflow-y-auto">
                {workspaceList}
              </div>
            </DrawerContent>
          </Drawer>
        </>
      ) : (
        /* Desktop: Dropdown */
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {triggerButton}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Workspaces</DropdownMenuLabel>
            {workspaces.map((ws) => (
              <DropdownMenuItem
                key={ws.id}
                onClick={() => switchWorkspace(ws.id)}
                className="gap-2.5"
              >
                <Avatar className="w-6 h-6 shrink-0">
                  {(ws as any).avatar_url && <AvatarImage src={(ws as any).avatar_url} />}
                  <AvatarFallback
                    className={cn(
                      "text-[10px] font-bold",
                      ws.type === "personal" ? "bg-primary/10 text-primary" : "bg-accent text-accent-foreground"
                    )}
                    style={(ws as any).color_theme && (ws as any).color_theme !== "default"
                      ? { backgroundColor: (ws as any).color_theme, color: "#fff" }
                      : undefined
                    }
                  >
                    {ws.type === "personal" ? <User className="w-3 h-3" /> : ws.name[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate flex-1">{ws.name}</span>
                {ws.type === "team" && <span className="text-[10px] text-muted-foreground">Team</span>}
                {currentWorkspace?.id === ws.id && <Check className="w-4 h-4 text-primary shrink-0" />}
              </DropdownMenuItem>
            ))}

            {pendingInvites.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Bell className="w-3 h-3" /> Pending Invites
                </DropdownMenuLabel>
                {pendingInvites.map((inv) => (
                  <DropdownMenuItem key={inv.id} className="gap-2" onClick={(e) => e.preventDefault()}>
                    <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1 text-xs">{(inv as any).workspaces?.name ?? "Workspace"}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] px-2"
                      onClick={() => acceptInvite.mutate(inv)}
                      disabled={acceptInvite.isPending}
                    >
                      Join
                    </Button>
                  </DropdownMenuItem>
                ))}
              </>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setCreateOpen(true)} className="gap-2 text-primary">
              <Plus className="w-4 h-4" />
              <span>Create Workspace</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Team Workspace</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground">Workspace Name</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Design Team"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Description (optional)</label>
              <Input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="What's this workspace for?"
                className="mt-1"
              />
            </div>
            {templates.length > 0 && (
              <div>
                <label className="text-sm font-medium text-foreground">Folder Template (optional)</label>
                <p className="text-xs text-muted-foreground mt-0.5 mb-2">Pre-populate with a folder structure</p>
                <div className="grid grid-cols-2 gap-2">
                  {templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => setSelectedTemplate(selectedTemplate === tpl.id ? null : tpl.id)}
                      className={cn(
                        "text-left p-3 rounded-lg border transition-colors text-xs",
                        selectedTemplate === tpl.id ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50"
                      )}
                    >
                      <p className="font-medium text-foreground flex items-center gap-1.5">
                        <FolderIcon className="w-3 h-3 text-primary" /> {tpl.name}
                      </p>
                      <p className="text-muted-foreground mt-0.5 line-clamp-1">{tpl.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newName.trim() || createWorkspace.isPending}>
              {createWorkspace.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
