export function getInitials(fullname) {
  if (!fullname) return "";
  const names = fullname.split(" ");
  const initials = names.slice(0, 2).map((n) => n[0]?.toUpperCase());
  return initials.join("");
}

export function formatDate(date) {
  const d = new Date(date);
  const month = d.toLocaleString("en-US", { month: "short" });
  const day = d.getDate();
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export function dateFormatter(dateString) {
  const inputDate = new Date(dateString);
  if (isNaN(inputDate)) return dateString;
  const year = inputDate.getFullYear();
  const month = String(inputDate.getMonth() + 1).padStart(2, "0");
  const day = String(inputDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const PRIORITY_STYLES = {
  high: "text-bloom-pink",
  medium: "text-bloom-orange",
  low: "text-bloom-coral",
  normal: "text-bloom-coral",
};

export const TASK_TYPE = {
  todo: "bg-bloom-coral",
  "in-progress": "bg-bloom-orange",
  completed: "bg-green-500",
};

export const BGS = [
  "bg-bloom-pink",
  "bg-bloom-orange",
  "bg-bloom-coral",
  "bg-green-500",
  "bg-bloom-pink-light",
  "bg-teal-500",
];

export const ICONS = {
  high: "↑↑",
  medium: "↑",
  low: "",
  normal: "",
};