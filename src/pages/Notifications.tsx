import { NotificationsPageContent } from "@/components/NotificationComponents";
import { BottomNavbar } from "@/components/BottomNavbar";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requestNotificationPermission, createNotification } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function NotificationsPage() {
  const [activeItem, setActiveItem] = useState("notifications");
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sending, setSending] = useState(false);

  const handleNavClick = (item: string) => {
    setActiveItem(item);
    if (item === "my-storage" || item === "recents" || item === "photos") {
      navigate("/");
    } else if (item === "menu") {
      navigate("/menu");
    }
  };

  const handleTestPush = async () => {
    if (!user) return;
    setSending(true);
    try {
      const granted = await requestNotificationPermission();
      if (!granted) {
        toast.info("Browser push permission not granted — notification will still appear in-app.");
      }
      await createNotification(
        user.id,
        "info",
        "🔔 Test Push Notification",
        "This is a test push notification from YoCloud! If you see this as a system notification, push is working correctly."
      );
      toast.success("Test notification sent!");
    } catch (err: any) {
      toast.error(err.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/40 px-4 py-3 flex items-center gap-3 md:hidden">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-display font-bold text-foreground flex-1">Notifications</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={handleTestPush}
          disabled={sending}
          className="gap-1.5 text-xs h-8"
        >
          <BellRing className="w-3.5 h-3.5" />
          {sending ? "Sending..." : "Test Push"}
        </Button>
      </div>

      <div className="p-4 md:p-8">
        {/* Desktop test button */}
        <div className="hidden md:flex justify-end mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestPush}
            disabled={sending}
            className="gap-1.5 text-xs"
          >
            <BellRing className="w-3.5 h-3.5" />
            {sending ? "Sending..." : "Test Push Notification"}
          </Button>
        </div>
        <NotificationsPageContent />
      </div>

      <BottomNavbar
        activeItem={activeItem}
        onItemClick={handleNavClick}
        onUploadClick={() => navigate("/")}
      />
    </div>
  );
}
