import { readdir, stat } from "fs-extra"
import { resolve } from "path"

export function truncateStringsFromObject(element: any, maxStrSize: number) {
  if (element === null || element === undefined) {
    return element
  }
  if (typeof element === 'object') {
    Object.keys(element).forEach(key => {
      element[key] = truncateStringsFromObject(element[key], maxStrSize)
    })
    return element
  }
  if (typeof element === 'string' && element.length > maxStrSize) {
    return `${element.substr(0, maxStrSize)}[...TRUNCATED]`
  }
  return element
}

export async function readdirRecursive(dir: string) {
  const subdirs = await readdir(dir)
  const files = await Promise.all(subdirs.map(async (subdir) => {
    const res = resolve(dir, subdir)
    return (await stat(res)).isDirectory() ? readdirRecursive(res) : res;
  }));
  return files.reduce((a, f) => a.concat(f), [])
}