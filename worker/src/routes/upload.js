/**
 * Endpoint de Subida de Imágenes a ImgBB: POST /api/upload-imagen
 * Recibe imagen base64, inyecta la API Key privada guardada en secretos y retorna la URL directa.
 */

export async function handleUploadRequest(request, env) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const { imageBase64, name } = body;

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'No se proporcionó la imagen base64.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const apiKey = env.IMGBB_API_KEY;
    if (!apiKey || apiKey.startsWith('TU_') || apiKey === 'placeholder') {
      // Modo fallback/placeholder si la API key aún no ha sido añadida en producción
      return new Response(JSON.stringify({
        success: true,
        url: `data:image/jpeg;base64,${imageBase64}`,
        warning: 'Usando data URI local. Configura IMGBB_API_KEY en los secretos del Worker para alojamiento externo.'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Enviar a ImgBB API oficial
    const formData = new FormData();
    formData.append('key', apiKey);
    formData.append('image', imageBase64);
    if (name) formData.append('name', name);

    const imgbbResp = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: formData
    });

    if (!imgbbResp.ok) {
      const errText = await imgbbResp.text();
      throw new Error(`Error en ImgBB API: ${errText}`);
    }

    const imgbbData = await imgbbResp.json();
    const finalUrl = imgbbData.data?.url || imgbbData.data?.display_url;

    return new Response(JSON.stringify({
      success: true,
      url: finalUrl
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error subiendo imagen a ImgBB:', error);
    return new Response(JSON.stringify({
      error: 'Error al subir la imagen al servidor.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
