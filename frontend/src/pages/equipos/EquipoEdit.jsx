import { useState, useEffect } from 'react';
import { Box, Button, Alert, CircularProgress } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import SectionCard from '../../components/common/SectionCard';
import EquipoForm from '../../components/equipos/EquipoForm';
import { equiposService } from '../../services/equipos';

const EDITABLE_FIELDS = [
  'marca', 'modelo', 'numero_serie', 'tipo_equipo',
  'ubicacion', 'departamento',
  'colaborador_nombre', 'colaborador_correo', 'colaborador_puesto',
  'fecha_proximo_mantenimiento',
];

export default function EquipoEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    equiposService
      .get(id)
      .then((eq) => {
        const v = {};
        EDITABLE_FIELDS.forEach((f) => { v[f] = eq[f] ?? ''; });
        v.codigo_interno = eq.codigo_interno;
        setValues(v);
      })
      .catch((e) => setApiError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    setApiError('');
    try {
      const payload = {
        ...values,
        departamento: values.departamento === '' ? null : values.departamento,
      };
      await equiposService.update(id, payload);
      navigate(`/equipos/${id}`);
    } catch (e) {
      setApiError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <CircularProgress sx={{ mt: 4, ml: 4 }} />;

  return (
    <Box>
      <PageHeader title="Editar equipo" backTo={`/equipos/${id}`} />
      {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}
      <SectionCard title="Datos del equipo">
        <EquipoForm values={values} onChange={handleChange} errors={errors} />
      </SectionCard>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button onClick={() => navigate(`/equipos/${id}`)}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
        >
          Guardar cambios
        </Button>
      </Box>
    </Box>
  );
}
