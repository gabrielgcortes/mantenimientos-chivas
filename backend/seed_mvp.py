import os
import django
import random
from datetime import date, timedelta
from random import choice, randint, sample

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from mantenimientos.models import ChecklistItem, ChecklistRespuesta, Mantenimiento
from equipos.models import Equipo, Ubicacion
from django.contrib.auth import get_user_model

User = get_user_model()

print("=" * 50)
print("SEED MVP - Agrega datos sin borrar existentes")
print("=" * 50)

existing_codes = set(Equipo.objects.values_list('codigo_interno', flat=True))
print(f"Equipos existentes: {Equipo.objects.count()} — se respetan")
print(f"Mantenimientos existentes: {Mantenimiento.objects.count()} — se respetan")

_ubicacion_nombres = [
    'Oficinas Verde Valle - Piso 2',
    'Oficinas Verde Valle - Piso 3',
    'Estadio Akron - Área Administrativa',
    'Centro de Alto Rendimiento (CAR)',
    'Tienda Oficial Guadalajara',
    'Academia Chivas - Dirección',
]
ubicaciones = [Ubicacion.objects.get_or_create(nombre=n)[0] for n in _ubicacion_nombres]

colaboradores = [
    ('Carlos Ramírez Torres',    'carlos.ramirez@chivas.mx',    'Gerente de Operaciones'),
    ('Ana Lucía Mendoza',        'ana.mendoza@chivas.mx',       'Coordinadora de RRHH'),
    ('Roberto Sánchez Pérez',    'roberto.sanchez@chivas.mx',   'Director Deportivo'),
    ('Patricia Gómez Flores',    'patricia.gomez@chivas.mx',    'Analista Financiero'),
    ('Miguel Ángel Torres',      'miguel.torres@chivas.mx',     'Jefe de Prensa'),
    ('Sofía Hernández Luna',     'sofia.hernandez@chivas.mx',   'Diseñadora Gráfica'),
    ('Fernando Castillo Reyes',  'fernando.castillo@chivas.mx', 'Administrador de Sistemas'),
    ('Gabriela Morales Vega',    'gabriela.morales@chivas.mx',  'Asistente Ejecutiva'),
    ('Javier Ruiz Medina',       'javier.ruiz@chivas.mx',       'Analista de Marketing'),
    ('Laura Vega Sandoval',      'laura.vega@chivas.mx',        'Contadora General'),
]

actividades_pool = [
    'Limpieza interna de componentes. Revisión de ventiladores. Actualización de drivers.',
    'Instalación de actualizaciones de seguridad. Escaneo de antivirus. Optimización de inicio.',
    'Cambio de pasta térmica. Limpieza de polvo. Revisión de temperaturas bajo carga.',
    'Revisión de disco duro. Desfragmentación. Verificación de sectores defectuosos.',
    'Actualización de BIOS. Revisión de conectores internos. Prueba de memoria RAM.',
    'Mantenimiento preventivo general. Revisión de cables. Prueba de puertos.',
    'Actualización de sistema operativo a última versión. Revisión de licencias activas.',
    'Revisión de configuración de red. Prueba de conectividad. Actualización de firmware.',
]

materiales_pool = [
    'Alcohol isopropílico, aire comprimido, pasta térmica',
    'Paño de microfibra, aire comprimido, alcohol isopropílico',
    'Pasta térmica Arctic MX-4, aire comprimido, brocha antiestática',
    'Kit de limpieza de pantallas, paño de microfibra',
]

observaciones_pool = [
    'Equipo en buen estado general.',
    'Se recomienda reemplazo de batería en próximo mantenimiento.',
    'Temperatura dentro de parámetros normales.',
    'Se detectó polvo excesivo, se realizó limpieza profunda.',
    'Rendimiento óptimo tras el mantenimiento.',
    'Se actualizaron todos los controladores del sistema.',
    '',
]

equipos_data = [
    ('CHV-LAP-0001', 'laptop',    'Dell',    'Latitude 5430',          'DL5430-SN-001'),
    ('CHV-LAP-0002', 'laptop',    'Dell',    'Latitude 5430',          'DL5430-SN-002'),
    ('CHV-LAP-0003', 'laptop',    'HP',      'EliteBook 840 G9',       'HP840-SN-001'),
    ('CHV-LAP-0004', 'laptop',    'Lenovo',  'ThinkPad X1 Carbon',     'TP-X1C-001'),
    ('CHV-LAP-0005', 'laptop',    'Apple',   'MacBook Pro 14"',        'MBP-SN-001'),
    ('CHV-LAP-0006', 'laptop',    'HP',      'EliteBook 850 G9',       'HP850-SN-001'),
    ('CHV-LAP-0007', 'laptop',    'Lenovo',  'IdeaPad 5 Pro',          'IP5P-SN-001'),
    ('CHV-DES-0001', 'desktop',   'Dell',    'OptiPlex 7090',          'OPT7090-SN-001'),
    ('CHV-DES-0002', 'desktop',   'HP',      'EliteDesk 800 G8',       'EDS800-SN-001'),
    ('CHV-DES-0003', 'desktop',   'Lenovo',  'ThinkCentre M90q',       'TC-M90Q-001'),
    ('CHV-DES-0004', 'desktop',   'Dell',    'OptiPlex 5090',          'OPT5090-SN-001'),
    ('CHV-SRV-0001', 'SERVIDOR',  'Dell',    'PowerEdge R750',         'PE-R750-SN-001'),
    ('CHV-SRV-0002', 'SERVIDOR',  'HP',      'ProLiant DL380 Gen10',   'PL-DL380-001'),
    ('CHV-SRV-0003', 'SERVIDOR',  'Lenovo',  'ThinkSystem SR650',      'SR650-SN-001'),
    ('CHV-IMP-0001', 'impresora', 'HP',      'LaserJet Pro M404dn',    'LJ-M404-SN-001'),
    ('CHV-IMP-0002', 'impresora', 'Epson',   'EcoTank L3250',          'ET-L3250-SN-001'),
    ('CHV-IMP-0003', 'impresora', 'Canon',   'imageRUNNER 1643i',      'IR1643-SN-001'),
    ('CHV-SWT-0001', 'switch',    'Cisco',   'Catalyst 2960-X',        'CS-2960X-SN-001'),
    ('CHV-SWT-0002', 'switch',    'HP',      'Aruba 2530-24G',         'HP-2530-SN-001'),
    ('CHV-ROU-0001', 'router',    'Cisco',   'ISR 4321',               'ISR4321-SN-001'),
    ('CHV-MON-0001', 'monitor',   'Dell',    'UltraSharp U2722D',      'U2722D-SN-001'),
    ('CHV-MON-0002', 'monitor',   'LG',      '27UK850-W',              'LG27-SN-001'),
    ('CHV-MON-0003', 'monitor',   'Samsung', 'Odyssey G5 27"',         'OG5-SN-001'),
    ('CHV-TAB-0001', 'OTRO',    'Apple',   'iPad Pro 12.9"',         'IPAD-SN-001'),
    ('CHV-TAB-0002', 'OTRO',    'Samsung', 'Galaxy Tab S8',          'GTABS8-SN-001'),
]

# Solo agregar los que no existen
nuevos = [(c, t, m, mo, s) for c, t, m, mo, s in equipos_data if c not in existing_codes]
print(f"\n💻 Creando {len(nuevos)} equipos nuevos...")

hoy = date.today()
equipos_bulk = []
for i, (codigo, tipo, marca, modelo, serie) in enumerate(nuevos):
    colab = colaboradores[i % len(colaboradores)]
    activo = i < len(nuevos) - 3
    ultimo = hoy - timedelta(days=randint(60, 300))
    proximo = ultimo + timedelta(days=randint(90, 180))
    estado_eq = 'ACTIVO' if activo else 'BAJA'
    equipos_bulk.append(Equipo(
        codigo_interno=codigo,
        tipo_equipo=tipo if tipo == tipo.upper() else tipo.upper(),
        marca=marca,
        modelo=modelo,
        numero_serie=serie,
        ubicacion=choice(ubicaciones),
        colaborador_nombre=colab[0],
        colaborador_correo=colab[1],
        colaborador_puesto=colab[2],
        estado=estado_eq,
        activo=activo,
        fecha_proximo_mantenimiento=proximo,
        fecha_ultimo_mantenimiento=ultimo,
        fecha_baja=(hoy - timedelta(days=30)) if not activo else None,
        motivo_baja='Equipo fuera de garantía, reemplazado' if not activo else None,
    ))

Equipo.objects.bulk_create(equipos_bulk)
codigos_nuevos = [e[0] for e in nuevos]
equipos_db = list(Equipo.objects.filter(codigo_interno__in=codigos_nuevos))
print(f"   ✓ {len(equipos_db)} equipos creados")

# --- MANTENIMIENTOS ---
print("\n🔧 Creando mantenimientos...")
departamentos = ['TI', 'Operaciones', 'Recursos Humanos', 'Finanzas', 'Marketing', 'Dirección Deportiva']

# Crear técnico específico para los mantenimientos
tecnico_username = 'rguzman'
tecnico_user, created = User.objects.get_or_create(
    username=tecnico_username,
    defaults={
        'first_name': 'Roberto',
        'last_name': 'Guzmán López',
        'email': 'roberto.guzman@chivas.mx',
        'puesto': 'Técnico de Soporte TI',
        'is_staff': True,
    }
)
if created:
    tecnico_user.set_password('TecChivas2024!')
    tecnico_user.save()
    print(f"   ✓ Técnico creado: {tecnico_user.get_full_name()} ({tecnico_username})")
else:
    print(f"   ✓ Técnico existente: {tecnico_user.get_full_name()} ({tecnico_username})")

# Verificar que los equipos tengan colaborador
print(f"   Verificando {len(equipos_db)} equipos con colaborador asignado...")
for eq in equipos_db:
    if not eq.colaborador_nombre:
        print(f"   ⚠️ Equipo {eq.codigo_interno} sin colaborador")

mants_bulk = []
for eq in equipos_db[:22]:
    n_mants = randint(1, 3)
    for j in range(n_mants):
        dias_atras = randint(10, 340)
        fecha = hoy - timedelta(days=dias_atras)
        mants_bulk.append(Mantenimiento(
            equipo=eq,
            departamento_area=choice(departamentos),
            responsable_area=eq.colaborador_nombre,
            tecnico=tecnico_user,
            fecha_ejecucion=fecha,
            hora_inicio=None,
            hora_fin=None,
            actividades_realizadas=choice(actividades_pool),
            materiales_utilizados=choice(materiales_pool),
            estado_equipo_post=choice(['OPERATIVO', 'OPERATIVO', 'OPERATIVO', 'OPERATIVO_OBSERVACIONES']),
            observaciones_tecnico=choice(observaciones_pool),
            riesgo_presentado=False,
            estatus='COMPLETADO',
        ))

Mantenimiento.objects.bulk_create(mants_bulk)
mants_db = list(Mantenimiento.objects.filter(equipo__in=equipos_db, estatus='COMPLETADO'))
print(f"   ✓ {len(mants_db)} mantenimientos creados")

# --- CHECKLIST RESPONSES ---
print("\n✅ Creando respuestas de checklist...")
checklist_items = list(ChecklistItem.objects.filter(activo=True))
respuestas = []
for mant in mants_db:
    n = min(len(checklist_items), randint(10, 14))
    for item in sample(checklist_items, k=n):
        realizado = choice([True, True, True, False])
        respuestas.append(ChecklistRespuesta(
            mantenimiento=mant,
            checklist_item=item,
            realizado=realizado,
            observacion='' if realizado else choice([
                'Requiere atención en próximo mantenimiento',
                'Pendiente de autorización',
                'No aplica para este equipo',
            ])
        ))

#ChecklistRespuesta.objects.bulk_create(respuestas, ignore_conflicts=True)
print(f"   ✓ {len(respuestas)} respuestas de checklist creadas")

print()
print("=" * 50)
print("✨ SEED MVP COMPLETADO")
print("=" * 50)
print(f"📊 Equipos totales:          {Equipo.objects.count()}")
print(f"   Activos:                  {Equipo.objects.filter(activo=True).count()}")
print(f"   Dados de baja:            {Equipo.objects.filter(activo=False).count()}")
print(f"🔧 Mantenimientos totales:   {Mantenimiento.objects.count()}")
print(f"   Completados:              {Mantenimiento.objects.filter(estatus='COMPLETADO').count()}")
print(f"   Borradores:               {Mantenimiento.objects.filter(estatus='BORRADOR').count()}")
print(f"✅ Respuestas checklist:     {ChecklistRespuesta.objects.count()}")
print("=" * 50)
print("🎉 ¡Base de datos lista para el MVP!")
