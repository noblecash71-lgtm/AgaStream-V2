import { Clapperboard } from "lucide-react";

export default function EmptyState({ title, message }: { title: string; message: string }) {
  return <div className="empty-state"><Clapperboard size={24} strokeWidth={1.6} /><h3>{title}</h3><p>{message}</p></div>;
}
