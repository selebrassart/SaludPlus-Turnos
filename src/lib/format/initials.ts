export function getInitials(name: string): string {
  return name
    .replace(/^(Dra?\.?)\s+/i, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}
