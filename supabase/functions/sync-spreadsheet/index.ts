import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function resolveOneDriveDownloadUrl(rawUrl: string): string[] {
  const urls: string[] = [];

  // Se já for link com download=1
  if (rawUrl.includes('download=1')) {
    urls.push(rawUrl);
  }

  // Links do tipo 1drv.ms/x/c/... ou 1drv.ms/x/s!...
  // Para OneDrive, transformar em download direto adicionando parâmetros ou convertendo para URL de download
  try {
    const urlObj = new URL(rawUrl);
    if (urlObj.hostname.includes('1drv.ms') || urlObj.hostname.includes('onedrive.live.com') || urlObj.hostname.includes('sharepoint.com')) {
      // Formato com download=1
      const u1 = new URL(rawUrl);
      u1.searchParams.set('download', '1');
      urls.push(u1.toString());

      // Se for sharepoint / onedrive for business
      const u2 = new URL(rawUrl);
      u2.searchParams.set('forceDownload', '1');
      urls.push(u2.toString());
    }
  } catch (_) {}

  // Google Sheets publicado: /pubhtml -> /pub?output=xlsx
  if (rawUrl.includes('docs.google.com/spreadsheets')) {
    const pubMatch = rawUrl.match(/docs\.google\.com\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)\/pubhtml/);
    if (pubMatch) {
      urls.push(`https://docs.google.com/spreadsheets/d/e/${pubMatch[1]}/pub?output=xlsx`);
      urls.push(`https://docs.google.com/spreadsheets/d/e/${pubMatch[1]}/pub?output=csv`);
    }

    const stdMatch = rawUrl.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (stdMatch && stdMatch[1] !== 'e') {
      urls.push(`https://docs.google.com/spreadsheets/d/${stdMatch[1]}/export?format=xlsx`);
      urls.push(`https://docs.google.com/spreadsheets/d/${stdMatch[1]}/export?format=csv`);
    }
  }

  // Inclui a URL original como fallback
  urls.push(rawUrl);
  return urls;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { url } = body;

    if (!url) {
      return new Response(JSON.stringify({ error: "Parâmetro 'url' é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[sync-spreadsheet] Recebida solicitação para URL: ${url}`);
    const candidateUrls = resolveOneDriveDownloadUrl(url);

    let lastError = "";
    for (const targetUrl of candidateUrls) {
      try {
        console.log(`[sync-spreadsheet] Tentando baixar de: ${targetUrl}`);
        const res = await fetch(targetUrl, {
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv, */*'
          }
        });

        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          console.log(`[sync-spreadsheet] Sucesso! Status: ${res.status}, Content-Type: ${contentType}`);

          const arrayBuffer = await res.arrayBuffer();
          // Converte para Base64 para envio seguro em JSON
          let binary = '';
          const bytes = new Uint8Array(arrayBuffer);
          const len = bytes.byteLength;
          for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64Data = btoa(binary);

          return new Response(
            JSON.stringify({
              success: true,
              data: base64Data,
              contentType: contentType,
              size: bytes.byteLength,
              sourceUrl: targetUrl
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        } else {
          lastError = `Status ${res.status}: ${res.statusText}`;
          console.warn(`[sync-spreadsheet] Falhou tentativa para ${targetUrl}: ${lastError}`);
        }
      } catch (err: any) {
        lastError = err.message || String(err);
        console.warn(`[sync-spreadsheet] Exceção em ${targetUrl}:`, err);
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: `Não foi possível baixar o arquivo. Detalhe: ${lastError}`
      }),
      {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error: any) {
    console.error("[sync-spreadsheet] Erro inesperado:", error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno do servidor' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
