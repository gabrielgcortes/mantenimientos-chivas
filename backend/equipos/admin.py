from django.contrib import admin

from .models import Departamento, Equipo, Ubicacion


@admin.register(Ubicacion)
class UbicacionAdmin(admin.ModelAdmin):
    list_display = ['nombre']
    search_fields = ['nombre']


@admin.register(Departamento)
class DepartamentoAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'ubicacion']
    list_filter = ['ubicacion']
    search_fields = ['nombre', 'ubicacion__nombre']
    autocomplete_fields = ['ubicacion']


@admin.register(Equipo)
class EquipoAdmin(admin.ModelAdmin):
    list_display = ['codigo_interno', 'marca', 'modelo', 'tipo_equipo', 'ubicacion', 'departamento', 'activo', 'fecha_proximo_mantenimiento']
    list_filter = ['activo', 'tipo_equipo', 'ubicacion']
    search_fields = ['codigo_interno', 'marca', 'modelo', 'colaborador_nombre']
    autocomplete_fields = ['ubicacion', 'departamento']
