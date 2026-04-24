export function getInitials(userName: string): string {
  return userName
    .split(" ")
    .filter((word) => word.length > 0)
    .slice(0, 2)
    .map((word) => word[0])
    .join("");
}
