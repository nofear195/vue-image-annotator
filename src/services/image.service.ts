export default function getImageUrl(name: string) {
  return new URL(`../assets/images/${name}`, import.meta.url).href;
}
