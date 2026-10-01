/**
 * Cloud Storage Integration Service
 * Handles fetching Excel files from various cloud storage services
 * Supports OneDrive and Google Sheets
 */

export interface CloudStorageFetchResult {
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
 * Extracts the spreadsheet ID from Google Sheets URL
 */
export function extractGoogleSheetsId(url: string): string | null {
  // Format: https://docs.google.com/spreadsheets/d/{id}/edit
  const match1 = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match1) return match1[1];

  // Format: https://docs.google.com/spreadsheets/d/{id}/export?format=...
  const match2 = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)\/export/);
  if (match2) return match2[1];

  return null;
}

/**
 * Converts a OneDrive share link to a direct download URL
 */
export function getOneDriveDownloadUrl(shareLink: string): string | null {
  const fileId = extractOneDriveFileId(shareLink);
  if (!fileId) return null;

  // Use the Graph API endpoint for shared items
  return `https://graph.microsoft.com/v1.0/drive/items/${fileId}/content`;
}

/**
 * Converts a Google Sheets URL to a direct Excel download URL
 */
export function getGoogleSheetsDownloadUrl(shareLink: string): string | null {
  const sheetId = extractGoogleSheetsId(shareLink);
  if (!sheetId) return null;

  // Use Google Sheets export endpoint for Excel format
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
}

/**
 * Fetches an Excel file from a OneDrive share link
 */
export async function fetchExcelFromOneDrive(shareLink: string): Promise<CloudStorageFetchResult> {
  try {
    // Method 1: Try Graph API content endpoint
    const graphUrl = getOneDriveDownloadUrl(shareLink);
    if (graphUrl) {
      try {
        const response = await fetch(graphUrl, {
          redirect: 'manual'
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

    return { success: false, error: 'Não foi possível baixar o arquivo do OneDrive. Verifique se o link está público e acessível.' };
  } catch (error: any) {
    console.error('[OneDrive] Error fetching file:', error);
    return { success: false, error: error.message || 'Erro desconhecido ao buscar arquivo do OneDrive' };
  }
}

/**
 * Fetches an Excel file from a Google Sheets URL
 */
export async function fetchExcelFromGoogleSheets(shareLink: string): Promise<CloudStorageFetchResult> {
  try {
    const downloadUrl = getGoogleSheetsDownloadUrl(shareLink);
    if (!downloadUrl) {
      return { success: false, error: 'URL do Google Sheets inválida' };
    }

    const response = await fetch(downloadUrl, {
      redirect: 'follow'
    });

    if (response.status === 200) {
      const blob = await response.blob();
      const fileName = getFileNameFromLink(shareLink) || 'google-sheets-file.xlsx';
      const file = new File([blob], fileName, { type: blob.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      return { success: true, file };
    } else {
      return { success: false, error: `Erro ao baixar do Google Sheets: ${response.status}` };
    }
  } catch (error: any) {
    console.error('[Google Sheets] Error fetching file:', error);
    return { success: false, error: error.message || 'Erro desconhecido ao buscar arquivo do Google Sheets' };
  }
}

/**
 * Generic function to fetch Excel file from supported cloud storage services
 */
export async function fetchExcelFromCloudStorage(shareLink: string): Promise<CloudStorageFetchResult> {
  if (isOneDriveLink(shareLink)) {
    return await fetchExcelFromOneDrive(shareLink);
  } else if (isGoogleSheetsLink(shareLink)) {
    return await fetchExcelFromGoogleSheets(shareLink);
  } else {
    return { success: false, error: 'URL não suportada. Forneça um link válido do OneDrive ou Google Sheets.' };
  }
}

/**
 * Extracts a reasonable filename from the cloud storage link
 */
function getFileNameFromLink(link: string): string | null {
  // Try to extract filename from URL parameters
  const urlParams = new URLSearchParams(link.split('?')[1] || '');
  const filename = urlParams.get('filename') || urlParams.get('name');
  if (filename) return filename;

  // Default name based on service
  if (isOneDriveLink(link)) return 'importacao-tlog.xlsx';
  if (isGoogleSheetsLink(link)) return 'importacao-tlog.xlsx';
  
  return 'importacao-tlog.xlsx';
}

/**
 * Validates if a URL is a OneDrive share link
 */
export function isOneDriveLink(url: string): boolean {
  return /1drv\.ms|onedrive\.live\.com/i.test(url);
}

/**
 * Validates if a URL is a Google Sheets link
 */
export function isGoogleSheetsLink(url: string): boolean {
  return /docs\.google\.com\/spreadsheets/i.test(url);
}