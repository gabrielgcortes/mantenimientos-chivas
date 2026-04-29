from rest_framework import serializers
from .models import Departamento, Equipo, Ubicacion


class UbicacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ubicacion
        fields = ['id', 'nombre']


class DepartamentoSerializer(serializers.ModelSerializer):
    ubicacion_nombre = serializers.CharField(source='ubicacion.nombre', read_only=True)

    class Meta:
        model = Departamento
        fields = ['id', 'nombre', 'ubicacion', 'ubicacion_nombre']


class EquipoListSerializer(serializers.ModelSerializer):
    ubicacion_nombre = serializers.CharField(source='ubicacion.nombre', read_only=True, default='')
    departamento_nombre = serializers.CharField(source='departamento.nombre', read_only=True, default='')

    class Meta:
        model = Equipo
        fields = [
            'id', 'codigo_interno', 'marca', 'modelo', 'tipo_equipo',
            'ubicacion', 'ubicacion_nombre',
            'departamento', 'departamento_nombre',
            'colaborador_nombre', 'estado', 'activo',
            'fecha_ultimo_mantenimiento', 'fecha_proximo_mantenimiento',
        ]


class EquipoDetailSerializer(serializers.ModelSerializer):
    ubicacion_nombre = serializers.CharField(source='ubicacion.nombre', read_only=True, default='')
    departamento_nombre = serializers.CharField(source='departamento.nombre', read_only=True, default='')

    class Meta:
        model = Equipo
        fields = '__all__'
        read_only_fields = [
            'estado', 'activo', 'fecha_alta', 'fecha_baja', 'motivo_baja',
            'fecha_ultimo_mantenimiento',
            'created_at', 'updated_at',
        ]

    def validate(self, attrs):
        """Si se manda departamento, debe pertenecer a la ubicación elegida."""
        ubicacion = attrs.get('ubicacion', getattr(self.instance, 'ubicacion', None))
        departamento = attrs.get('departamento', getattr(self.instance, 'departamento', None))
        if departamento and ubicacion and departamento.ubicacion_id != ubicacion.id:
            raise serializers.ValidationError({
                'departamento': 'El departamento no pertenece a la ubicación seleccionada.'
            })
        return attrs


class EquipoBajaSerializer(serializers.Serializer):
    motivo_baja = serializers.CharField(required=True, min_length=5)
