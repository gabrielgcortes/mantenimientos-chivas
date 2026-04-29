import base64
import os
from io import BytesIO

from django.conf import settings
from django.core.files.base import ContentFile
from django.template.loader import render_to_string
from django.utils import timezone
from PIL import Image, ImageDraw, ImageFont
from xhtml2pdf import pisa

from .models import ChecklistItem


_WATERMARK_CACHE = {}


def _watermark_borrador_b64(texto='BORRADOR'):
    """Genera (y cachea) una imagen PNG con el texto en diagonal para marca de agua."""
    if texto in _WATERMARK_CACHE:
        return _WATERMARK_CACHE[texto]

    W, H = 1400, 1800
    img = Image.new('RGBA', (W, H), (255, 255, 255, 0))

    # Lienzo auxiliar para rotar el texto
    txt_layer = Image.new('RGBA', (1800, 400), (255, 255, 255, 0))
    draw = ImageDraw.Draw(txt_layer)

    font = None
    for path in [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
        '/Library/Fonts/Arial Bold.ttf',
    ]:
        if os.path.exists(path):
            try:
                font = ImageFont.truetype(path, 260)
                break
            except Exception:
                pass
    if font is None:
        font = ImageFont.load_default()

    # Texto rojo tenue, semitransparente
    draw.text((40, 40), texto, font=font, fill=(200, 0, 0, 75))

    rotated = txt_layer.rotate(30, expand=1, resample=Image.BICUBIC)
    x = (W - rotated.width) // 2
    y = (H - rotated.height) // 2
    img.paste(rotated, (x, y), rotated)

    buf = BytesIO()
    img.save(buf, format='PNG')
    data_uri = 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()
    _WATERMARK_CACHE[texto] = data_uri
    return data_uri


def _imagen_a_base64(field):
    """Convierte un ImageField/FileField a data URI base64 para embeber en HTML."""
    if not field:
        return None
    full_path = os.path.join(settings.MEDIA_ROOT, field.name)
    if not os.path.exists(full_path):
        return None
    with open(full_path, 'rb') as f:
        data = f.read()
    ext = os.path.splitext(full_path)[1].lower().lstrip('.')
    mime = 'jpeg' if ext in ['jpg', 'jpeg'] else ext
    return f"data:image/{mime};base64,{base64.b64encode(data).decode()}"


def _imagen_a_path(field):
    """Devuelve la ruta absoluta de un ImageField/FileField (o None si no existe)."""
    if not field:
        return None
    full_path = os.path.join(settings.MEDIA_ROOT, field.name)
    return full_path if os.path.exists(full_path) else None


def _pdf_link_callback(uri, rel):
    """Resuelve rutas de archivos locales para que xhtml2pdf las incruste.

    Usamos rutas absolutas en vez de data-URIs base64 porque xhtml2pdf tiene
    un bug con múltiples imágenes en base64 que causa el error
    'sequence item 0: expected str instance, list found'.
    """
    # Las plantillas pasan rutas absolutas del filesystem directamente.
    if uri and os.path.isabs(uri) and os.path.exists(uri):
        return uri
    # Si es un data URI (marca de agua, etc.) xhtml2pdf lo maneja internamente.
    return uri


def generar_pdf_mantenimiento(mantenimiento):
    """
    Genera el PDF oficial del mantenimiento, lo guarda localmente
    y actualiza los campos documento_pdf y documento_pdf_generado_en.
    """
    firmas_qs = mantenimiento.firmas.all()
    firmas = {f.tipo_firma: f for f in firmas_qs}

    evidencias = []
    for ev in mantenimiento.evidencias.all():
        evidencias.append({
            'tipo_display': ev.get_tipo_display(),
            'descripcion': ev.descripcion,
            # Ruta absoluta en disco — xhtml2pdf la resuelve vía link_callback.
            # NO usar base64 aquí: con 2+ imágenes dispara un bug de xhtml2pdf
            # ('sequence item 0: expected str instance, list found').
            'imagen_path': _imagen_a_path(ev.imagen),
        })

    # Checklist completo: todos los items activos + respuesta (si la hay).
    respuestas_por_item = {
        r.checklist_item_id: r
        for r in mantenimiento.checklist_respuestas.select_related('checklist_item').all()
    }
    checklist = []
    for item in ChecklistItem.objects.filter(activo=True).order_by('categoria', 'orden', 'nombre'):
        resp = respuestas_por_item.get(item.id)
        checklist.append({
            'nombre': item.nombre,
            'categoria': item.categoria or '',
            'realizado': bool(resp and resp.realizado),
            'observacion': resp.observacion if resp else '',
        })

    context = {
        'mantenimiento': mantenimiento,
        'equipo': mantenimiento.equipo,
        'checklist': checklist,
        'evidencias': evidencias,
        'firma_tecnico': firmas.get('TECNICO'),
        'firma_usuario': firmas.get('USUARIO'),
        'firma_tecnico_b64': _imagen_a_base64(firmas['TECNICO'].firma_imagen) if 'TECNICO' in firmas else None,
        'firma_usuario_b64': _imagen_a_base64(firmas['USUARIO'].firma_imagen) if 'USUARIO' in firmas else None,
        'watermark_b64': _watermark_borrador_b64() if mantenimiento.estatus != 'COMPLETADO' else None,
    }

    html_string = render_to_string('pdf/mantenimiento.html', context)
    buffer = BytesIO()
    status = pisa.CreatePDF(html_string, dest=buffer, link_callback=_pdf_link_callback)

    if status.err:
        raise Exception('Error al generar el PDF del mantenimiento.')

    # Eliminar archivo previo (si existe) para no acumular PDFs en disco.
    if mantenimiento.documento_pdf:
        try:
            mantenimiento.documento_pdf.delete(save=False)
        except Exception:
            pass

    filename = f'mantenimiento_{mantenimiento.id}_{timezone.now().strftime("%Y%m%d_%H%M%S")}.pdf'
    mantenimiento.documento_pdf.save(filename, ContentFile(buffer.getvalue()), save=False)
    mantenimiento.documento_pdf_generado_en = timezone.now()
    mantenimiento.save(update_fields=['documento_pdf', 'documento_pdf_generado_en'])

    return mantenimiento
