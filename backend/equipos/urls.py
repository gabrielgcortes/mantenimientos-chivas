from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DepartamentoViewSet, EquipoViewSet, UbicacionViewSet

router = DefaultRouter()
router.register('equipos', EquipoViewSet, basename='equipo')
router.register('ubicaciones', UbicacionViewSet, basename='ubicacion')
router.register('departamentos', DepartamentoViewSet, basename='departamento')

urlpatterns = [
    path('', include(router.urls)),
]
