import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useJoinViaLink } from "@/hooks/useWorkspaceLinks";
import { useAuth } from "@/hooks/useAuth";
import { Users, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function JoinWorkspace() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const joinViaLink = useJoinViaLink();
  const [status, setStatus] = useState<"idle" | "joining" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleJoin = () => {
    if (!token || !user) return;
    setStatus("joining");
    joinViaLink.mutate(token, {
      onSuccess: (link) => {
        setStatus("success");
        setTimeout(() => navigate("/"), 1500);
      },
      onError: (err: Error) => {
        setStatus("error");
        setErrorMsg(err.message);
      },
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm space-y-4">
          <Users className="w-16 h-16 text-primary mx-auto" />
          <h1 className="text-xl font-bold text-foreground">Workspace Invitation</h1>
          <p className="text-sm text-muted-foreground">You need to sign in before joining this workspace.</p>
          <Button onClick={() => navigate("/auth")} className="w-full">Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-sm space-y-4">
        {status === "idle" && (
          <>
            <Users className="w-16 h-16 text-primary mx-auto" />
            <h1 className="text-xl font-bold text-foreground">Join Workspace</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You've been invited to join a team workspace. Click below to accept and start collaborating.
            </p>
            <Button onClick={handleJoin} className="w-full" size="lg">
              <Users className="w-4 h-4 mr-2" /> Join Workspace
            </Button>
            <Button variant="ghost" onClick={() => navigate("/")} className="w-full">Go Home</Button>
          </>
        )}
        {status === "joining" && (
          <>
            <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
            <p className="text-sm text-muted-foreground">Joining workspace...</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="w-16 h-16 text-primary mx-auto" />
            <h1 className="text-xl font-bold text-foreground">Welcome!</h1>
            <p className="text-sm text-muted-foreground">You've successfully joined the workspace. Redirecting...</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="w-16 h-16 text-destructive mx-auto" />
            <h1 className="text-xl font-bold text-foreground">Unable to Join</h1>
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
            <Button variant="outline" onClick={() => navigate("/")} className="w-full">Go Home</Button>
          </>
        )}
      </div>
    </div>
  );
}
