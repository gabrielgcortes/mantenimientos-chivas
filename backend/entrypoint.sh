#!/bin/sh
set -e

echo "Esperando a PostgreSQL..."
until python -c "import psycopg2; psycopg2.connect(
    dbname='$POSTGRES_DB',
    user='$POSTGRES_USER',
    password='$POSTGRES_PASSWORD',
    host='$POSTGRES_HOST',
    port='5432'
)" 2>/dev/null; do
  sleep 1
done
echo "PostgreSQL listo."

python manage.py makemigrations --noinput
python manage.py migrate --noinput
python manage.py collectstatic --noinput

echo "Verificando superusuario..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(is_superuser=True).exists():
    User.objects.create_superuser(
        username='admin',
        password='admin123',
        first_name='Administrador',
        last_name='Sistema',
        email='admin@chivas.mx',
        puesto='Administrador del Sistema',
    )
    print('✓ Superusuario admin/admin123 creado')
else:
    print(f'✓ Superusuario ya existe: {User.objects.filter(is_superuser=True).first().username}')
"

echo "Verificando checklist items..."
python manage.py shell -c "
from mantenimientos.models import ChecklistItem
if ChecklistItem.objects.count() == 0:
    items = [
        ('hardware','Verificar estado físico del equipo',1),
        ('hardware','Revisar conexiones de cables',2),
        ('hardware','Inspeccionar ventiladores y disipadores',3),
        ('hardware','Verificar integridad de puertos USB/HDMI',4),
        ('software','Actualizar sistema operativo',5),
        ('software','Actualizar antivirus y ejecutar escaneo',6),
        ('software','Verificar licencias de software',7),
        ('software','Limpiar archivos temporales',8),
        ('red','Verificar conectividad de red',9),
        ('red','Probar velocidad de conexión',10),
        ('red','Revisar configuración de firewall',11),
        ('seguridad','Verificar respaldos automáticos',12),
        ('seguridad','Revisar políticas de contraseñas',13),
        ('seguridad','Auditar accesos y permisos',14),
    ]
    ChecklistItem.objects.bulk_create([ChecklistItem(categoria=c,nombre=n,orden=o) for c,n,o in items])
    print(f'✓ {ChecklistItem.objects.count()} checklist items creados automáticamente')
else:
    print(f'✓ {ChecklistItem.objects.count()} checklist items ya existen')
"

echo "Verificando catálogo de actividades..."
python manage.py shell -c "
from mantenimientos.models import ActividadCatalogo
if ActividadCatalogo.objects.count() == 0:
    items = [
        ('Limpieza interna del equipo', 1),
        ('Limpieza externa del equipo', 2),
        ('Limpieza de teclado y mouse', 3),
        ('Limpieza de pantalla', 4),
        ('Revisión y ajuste de conexiones', 5),
        ('Actualización del sistema operativo', 6),
        ('Actualización de antivirus', 7),
        ('Escaneo de virus y malware', 8),
        ('Desfragmentación de disco', 9),
        ('Eliminación de archivos temporales', 10),
        ('Respaldo de información', 11),
        ('Verificación de rendimiento', 12),
        ('Pruebas de conectividad de red', 13),
        ('Cambio de pasta térmica', 14),
        ('Reemplazo de componentes defectuosos', 15),
    ]
    ActividadCatalogo.objects.bulk_create([ActividadCatalogo(nombre=n, orden=o) for n, o in items])
    print(f'✓ {ActividadCatalogo.objects.count()} actividades creadas automáticamente')
else:
    print(f'✓ {ActividadCatalogo.objects.count()} actividades ya existen')
"

echo "Verificando catálogo de materiales..."
python manage.py shell -c "
from mantenimientos.models import MaterialCatalogo
if MaterialCatalogo.objects.count() == 0:
    items = [
        ('Aire comprimido', 1),
        ('Alcohol isopropílico', 2),
        ('Paño de microfibra', 3),
        ('Hisopos de algodón', 4),
        ('Brocha antiestática', 5),
        ('Pasta térmica', 6),
        ('Limpiador de pantallas', 7),
        ('Espuma limpiadora', 8),
        ('Cables de red', 9),
        ('Cables de poder', 10),
        ('Pilas AA/AAA', 11),
        ('Kit de destornilladores', 12),
        ('Pulsera antiestática', 13),
        ('Bolsas antiestáticas', 14),
    ]
    MaterialCatalogo.objects.bulk_create([MaterialCatalogo(nombre=n, orden=o) for n, o in items])
    print(f'✓ {MaterialCatalogo.objects.count()} materiales creados automáticamente')
else:
    print(f'✓ {MaterialCatalogo.objects.count()} materiales ya existen')
"

echo "Verificando ubicaciones y departamentos..."
python manage.py shell -c "
from equipos.models import Ubicacion, Departamento
if Ubicacion.objects.count() == 0:
    estructura = {
        'Oficinas Verde Valle': [
            'Dirección General', 'Recursos Humanos', 'Finanzas', 'Marketing',
            'Tecnología e Innovación', 'Comunicación', 'Legal',
        ],
        'Estadio Akron': [
            'Operaciones de Estadio', 'Seguridad', 'Sala de Prensa',
            'Ticketing', 'Mantenimiento', 'Capital Humano',
        ],
        'Centro de Alto Rendimiento (CAR)': [
            'Cuerpo Técnico', 'Médico y Fisioterapia', 'Análisis de Video',
            'Nutrición', 'Administración Deportiva',
        ],
        'Academia Chivas': [
            'Dirección Deportiva', 'Cuerpo Técnico Fuerzas Básicas',
            'Médico Juvenil', 'Operaciones',
        ],
        'Tienda Oficial Guadalajara': [
            'Ventas', 'Inventario', 'Atención a Clientes',
        ],
        'Gigantera': [
            'Operaciones', 'Mantenimiento', 'Eventos',
        ],
    }
    total_deptos = 0
    for nombre_ubic, deptos in estructura.items():
        ubic = Ubicacion.objects.create(nombre=nombre_ubic)
        for nombre_depto in deptos:
            Departamento.objects.create(nombre=nombre_depto, ubicacion=ubic)
            total_deptos += 1
    print(f'✓ {Ubicacion.objects.count()} ubicaciones y {total_deptos} departamentos creados automáticamente')
else:
    print(f'✓ {Ubicacion.objects.count()} ubicaciones y {Departamento.objects.count()} departamentos ya existen')
"

exec "$@"
