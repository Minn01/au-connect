import { formatDistanceToNow } from "date-fns";

export function timeAgo(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}
