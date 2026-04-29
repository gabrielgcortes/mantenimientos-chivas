from django.db import models


class Ubicacion(models.Model):
    """Catálogo de ubicaciones físicas (Estadio Akron, Verde Valle, CAR, etc.)."""
    nombre = models.CharField(max_length=100, unique=True)

    class Meta:
        ordering = ['nombre']
        verbose_name = 'Ubicación'
        verbose_name_plural = 'Ubicaciones'

    def __str__(self):
        return self.nombre


class Departamento(models.Model):
    """Departamento que pertenece a una ubicación específica.

    Cada (ubicación, nombre) es una entidad única: 'RRHH @ Estadio' es distinto
    a 'RRHH @ Verde Valle', incluso si comparten nombre, ya que típicamente
    tienen responsables, presupuestos y procesos separados.
    """
    nombre = models.CharField(max_length=100)
    ubicacion = models.ForeignKey(
        Ubicacion, on_delete=models.PROTECT, related_name='departamentos'
    )

    class Meta:
        ordering = ['ubicacion__nombre', 'nombre']
        unique_together = ('nombre', 'ubicacion')
        verbose_name = 'Departamento'
        verbose_name_plural = 'Departamentos'

    def __str__(self):
        return f'{self.nombre} ({self.ubicacion.nombre})'


class Equipo(models.Model):
    ESTADO_CHOICES = [
        ('ACTIVO', 'Activo'),
        ('DISPONIBLE', 'Disponible'),
        ('BAJA', 'Baja'),
    ]

    TIPO_CHOICES = [
        ('LAPTOP', 'Laptop'),
        ('DESKTOP', 'Desktop'),
        ('IMPRESORA', 'Impresora'),
        ('SERVIDOR', 'Servidor'),
        ('SWITCH', 'Switch'),
        ('ROUTER', 'Router'),
        ('ACCESS_POINT', 'Access Point'),
        ('UPS', 'UPS'),
        
        ('MONITOR', 'Monitor'),
        ('OTRO', 'Otro'),
    ]

    codigo_interno = models.CharField(max_length=50, unique=True)
    marca = models.CharField(max_length=100)
    modelo = models.CharField(max_length=100)
    numero_serie = models.CharField(max_length=100, blank=True)
    tipo_equipo = models.CharField(max_length=50, choices=TIPO_CHOICES)
    ubicacion = models.ForeignKey(
        Ubicacion, on_delete=models.PROTECT, related_name='equipos',
        null=True, blank=True,
    )
    departamento = models.ForeignKey(
        Departamento, on_delete=models.PROTECT, related_name='equipos',
        null=True, blank=True,
    )
    colaborador_nombre = models.CharField(max_length=200, blank=True)
    colaborador_correo = models.EmailField(blank=True)
    colaborador_puesto = models.CharField(max_length=200, blank=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='DISPONIBLE')
    activo = models.BooleanField(default=True)  # kept for backward-compat queries
    fecha_alta = models.DateField(auto_now_add=True)
    fecha_baja = models.DateField(null=True, blank=True)
    motivo_baja = models.TextField(null=True, blank=True)
    fecha_ultimo_mantenimiento = models.DateField(null=True, blank=True)
    fecha_proximo_mantenimiento = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['codigo_interno']
        verbose_name = 'Equipo'
        verbose_name_plural = 'Equipos'

    def __str__(self):
        return f"{self.codigo_interno} - {self.marca} {self.modelo}"
