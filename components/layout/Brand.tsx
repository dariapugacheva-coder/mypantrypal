import { Penguin } from "@/components/mascot/Penguin";
import { APP_NAME, COPYRIGHT, CREATOR } from "@/lib/config";
import { cn } from "@/lib/utils";

export function Brand({ className, size = 34 }: { className?: string; size?: number }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Penguin size={size} stars={false} />
      <span className="text-lg font-semibold tracking-tight text-ink">My<span className="text-mint-ink">Pantry</span>Pal</span>
    </span>
  );
}

export function Credits({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs text-muted", className)}>
      {APP_NAME} · Created by {CREATOR}
      <br />
      {COPYRIGHT}
    </p>
  );
}
