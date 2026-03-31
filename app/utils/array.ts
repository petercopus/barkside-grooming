export function toggleArrayItem<T>(arr: T[], item: T) {
  const idx = arr.indexOf(item);
  if (idx === -1) arr.push(item);
  else arr.splice(idx, 1);
}
