from datetime import date, timedelta

from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from .csv_io import CSVImportError, export_equipos_csv, import_equipos_csv
from .models import Departamento, Equipo, Ubicacion
from .serializers import (
    DepartamentoSerializer,
    EquipoBajaSerializer,
    EquipoDetailSerializer,
    EquipoListSerializer,
    UbicacionSerializer,
)


class UbicacionViewSet(viewsets.ModelViewSet):
    queryset = Ubicacion.objects.all()
    serializer_class = UbicacionSerializer
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']


class DepartamentoViewSet(viewsets.ModelViewSet):
    queryset = Departamento.objects.select_related('ubicacion').all()
    serializer_class = DepartamentoSerializer
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        qs = super().get_queryset()
        ubicacion = self.request.query_params.get('ubicacion')
        if ubicacion:
            qs = qs.filter(ubicacion_id=ubicacion)
        return qs


class EquipoViewSet(viewsets.ModelViewSet):
    queryset = Equipo.objects.select_related('ubicacion', 'departamento').all()
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_serializer_class(self):
        if self.action == 'list':
            return EquipoListSerializer
        return EquipoDetailSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        estado = params.get('estado')
        if estado:
            qs = qs.filter(estado=estado.upper())
        else:
            # legacy: activo=true/false kept for backward compat
            activo = params.get('activo')
            if activo is not None:
                if activo.lower() == 'true':
                    qs = qs.exclude(estado='BAJA')
                else:
                    qs = qs.filter(estado='BAJA')

        if params.get('proximo') == 'true':
            hoy = date.today()
            qs = qs.filter(
                fecha_proximo_mantenimiento__gte=hoy,
                fecha_proximo_mantenimiento__lte=hoy + timedelta(days=30),
            ).exclude(estado='BAJA')

        if params.get('vencido') == 'true':
            qs = qs.filter(
                fecha_proximo_mantenimiento__lt=date.today(),
            ).exclude(estado='BAJA')

        return qs

    def _sync_estado(self, equipo):
        """Sincroniza campo estado y activo basándose en colaborador_nombre."""
        if equipo.estado == 'BAJA':
            return
        if equipo.colaborador_nombre:
            equipo.estado = 'ACTIVO'
            equipo.activo = True
        else:
            equipo.estado = 'DISPONIBLE'
            equipo.activo = True

    def perform_create(self, serializer):
        equipo = serializer.save()
        self._sync_estado(equipo)
        equipo.save(update_fields=['estado', 'activo'])

    def perform_update(self, serializer):
        equipo = serializer.save()
        self._sync_estado(equipo)
        equipo.save(update_fields=['estado', 'activo', 'updated_at'])

    @action(detail=True, methods=['post'])
    def baja(self, request, pk=None):
        equipo = self.get_object()
        if equipo.estado == 'BAJA':
            return Response(
                {'detail': 'El equipo ya está dado de baja.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = EquipoBajaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        equipo.estado = 'BAJA'
        equipo.activo = False
        equipo.fecha_baja = timezone.now().date()
        equipo.motivo_baja = serializer.validated_data['motivo_baja']
        equipo.save()
        return Response(
            EquipoDetailSerializer(equipo, context={'request': request}).data
        )

    @action(detail=False, methods=['get'], url_path='exportar-csv')
    def exportar_csv(self, request):
        """Descarga los equipos visibles (respeta filtros) en formato CSV."""
        return export_equipos_csv(self.filter_queryset(self.get_queryset()))

    @action(
        detail=False,
        methods=['post'],
        url_path='importar-csv',
        parser_classes=[MultiPartParser, FormParser],
    )
    def importar_csv(self, request):
        """Importa equipos desde un CSV (multipart/form-data, campo 'archivo').

        Si CUALQUIER fila tiene errores, no se crea ningún equipo y se
        responde con la lista de errores por fila.
        """
        archivo = request.FILES.get('archivo') or request.FILES.get('file')
        if not archivo:
            return Response(
                {'detail': 'No se envió ningún archivo. Usa el campo "archivo".'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not (archivo.name or '').lower().endswith('.csv'):
            return Response(
                {'detail': 'El archivo debe tener extensión .csv'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            resultado = import_equipos_csv(archivo, sync_estado=self._sync_estado)
        except CSVImportError as exc:
            return Response({'detail': exc.mensaje}, status=status.HTTP_400_BAD_REQUEST)

        if resultado['fallidos']:
            return Response(
                {
                    'detail': (
                        f'Se encontraron {resultado["fallidos"]} fila(s) con errores. '
                        f'No se importó ningún equipo.'
                    ),
                    **resultado,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {'detail': f'Importación exitosa: {resultado["creados"]} equipo(s) creado(s).', **resultado},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['get'], url_path='mantenimientos')
    def mantenimientos(self, request, pk=None):
        from mantenimientos.serializers import MantenimientoListSerializer
        equipo = self.get_object()
        qs = equipo.mantenimientos.all()
        serializer = MantenimientoListSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)
