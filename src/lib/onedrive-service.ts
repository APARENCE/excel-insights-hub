/**
 * OneDrive Integration Service
 * Handles fetching Excel files from OneDrive share links
 * Uses Microsoft Graph API and direct download endpoints
 */

export interface OneDriveFetchResult {
  success: boolean;
  file?: File;
  error?: string;
}

/**
 * Extracts the file ID from various OneDrive URL formats
 */
export function extractOneDriveFileId(url: string): string | null {
  // Format: https://1drv.ms/x/c/{id}
  const match1 = url.match(/1drv\.ms\/x\/c\/([a-zA-Z0-9_-]+)/);
  if (match1) return match1[1];

  // Format: https://onedrive.live.com/download?id=...
  const match2 = url.match(/onedrive\.live\.com\/download\?id=([a-zA-Z0-9_-]+)/);
  if (match2) return match2[1];

  // Format: https://1drv.ms/x/s!...
  const match3 = url.match(/1drv\.ms\/x\/s!([a-zA-Z0-9_-]+)/);
  if (match3) return match3[1];

  return null;
}

/**
 * Converts a OneDrive share link to a direct download URL
 * This uses the Microsoft Graph API endpoint for shared items
 */
export function getOneDriveDownloadUrl(shareLink: string): string | null {
  const fileId = extractOneDriveFileId(shareLink);
  if (!fileId) return null;

  // Use the Graph API endpoint for shared items
  // This works for publicly shared files without authentication
  return `https://graph.microsoft.com/v1.0/drive/items/${fileId}/content`;
}

/**
 * Alternative: Use the OneDrive web download endpoint
 * This is often more reliable for shared files
 */
export function getOneDriveWebDownloadUrl(shareLink: string): string | null {
  const fileId = extractOneDriveFileId(shareLink);
  if (!fileId) return null;

  // Use the OneDrive web download endpoint
  return `https://onedrive.live.com/download?id=${fileId}`;
}

/**
 * Fetches an Excel file from a OneDrive share link
 * Tries multiple methods to get the file
 */
export async function fetchExcelFromOneDrive(shareLink: string): Promise<OneDriveFetchResult> {
  try {
    // Method 1: Try Graph API content endpoint
    const graphUrl = getOneDriveDownloadUrl(shareLink);
    if (graphUrl) {
      try {
        const response = await fetch(graphUrl, {
          redirect: 'manual' // Don't auto-redirect, handle manually
        });

        if (response.status === 200) {
          const blob = await response.blob();
          const fileName = getFileNameFromLink(shareLink) || 'onedrive-file.xlsx';
          const file = new File([blob], fileName, { type: blob.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          return { success: true, file };
        }
      } catch (e) {
        console.warn('[OneDrive] Graph API method failed, trying alternative:', e);
      }
    }

    // Method 2: Try OneDrive web download endpoint
    const webUrl = getOneDriveWebDownloadUrl(shareLink);
    if (webUrl) {
      try {
        const response = await fetch(webUrl, {
          redirect: 'manual'
        });

        if (response.status === 200) {
          const blob = await response.blob();
          const fileName = getFileNameFromLink(shareLink) || 'onedrive-file.xlsx';
          const file = new File([blob], fileName, { type: blob.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          return { success: true, file };
        }
      } catch (e) {
        console.warn('[OneDrive] Web download method failed:', e);
      }
    }

    // Method 3: Try using a proxy or alternative approach
    // For shared files, sometimes we need to use the embed link
    const embedUrl = shareLink.replace('/x/', '/embed?').replace('/download?', '/download?');
    if (embedUrl !== shareLink) {
      try {
        const response = await fetch(embedUrl, {
          redirect: 'manual'
        });

        if (response.status === 200) {
          const blob = await response.blob();
          const fileName = getFileNameFromLink(shareLink) || 'onedrive-file.xlsx';
          const file = new File([blob], fileName, { type: blob.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          return { success: true, file };
        }
      } catch (e) {
        console.warn('[OneDrive] Embed method failed:', e);
      }
    }

    return { success: false, error: 'Não foi possível baixar o arquivo. Verifique se o link está público e acessível.' };
  } catch (error: any) {
    console.error('[OneDrive] Error fetching file:', error);
    return { success: false, error: error.message || 'Erro desconhecido ao buscar arquivo' };
  }
}

/**
 * Extracts a reasonable filename from the OneDrive link
 */
function getFileNameFromLink(link: string): string | null {
  // Try to extract filename from URL parameters
  const urlParams = new URLSearchParams(link.split('?')[1] || '');
  const filename = urlParams.get('filename') || urlParams.get('name');
  if (filename) return filename;

  // Default name
  return 'importacao-tlog.xlsx';
}

/**
 * Validates if a URL is a OneDrive share link
 */
export function isOneDriveLink(url: string): boolean {
  return /1drv\.ms|onedrive\.live\.com/i.test(url);
}