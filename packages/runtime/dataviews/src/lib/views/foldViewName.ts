/** A name as two views may not share it: trimmed, normalized, case folded. */
export default function foldViewName(name: string): string {
  return name.trim().normalize("NFC").toLocaleLowerCase();
}
