export function getAssetsFile(url:string) {
    return new URL(`./assets/` + url, import.meta.url).href
}
