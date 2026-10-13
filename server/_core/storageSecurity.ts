const S3_HOST = /^(?:[a-z0-9][a-z0-9.-]*[a-z0-9]\.)?s3(?:[.-][a-z0-9-]+)?(?:\.[a-z0-9-]+)?\.amazonaws\.com$/i;

export function isTrustedManagedStorageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port && S3_HOST.test(url.hostname);
  } catch {
    return false;
  }
}
