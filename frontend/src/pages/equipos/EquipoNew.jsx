import { useState } from 'react';
import { Box, Button, Alert, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import SectionCard from '../../components/common/SectionCard';
import EquipoForm from '../../components/equipos/EquipoForm';
import { equiposService } from '../../services/equipos';

const INITIAL = {
  codigo_interno: '',
  marca: '',
  modelo: '',
  numero_serie: '',
  tipo_equipo: '',
  ubicacion: '',
  departamento: '',
  colaborador_nombre: '',
  colaborador_correo: '',
  colaborador_puesto: '',
  fecha_proximo_mantenimiento: '',
};

const REQUIRED = ['codigo_interno', 'marca', 'modelo', 'tipo_equipo', 'ubicacion'];

export default function EquipoNew() {
  const navigate = useNavigate();
  const [values, setValues] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState('');

  const handleChange = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const errs = {};
    REQUIRED.forEach((f) => {
      if (!values[f]) errs[f] = 'Campo requerido';
    });
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    setApiError('');
    try {
      // Strings vacíos en FKs -> null para que DRF no truene en validación.
      const payload = {
        ...values,
        departamento: values.departamento === '' ? null : values.departamento,
      };
      const equipo = await equiposService.create(payload);
      navigate(`/equipos/${equipo.id}`);
    } catch (e) {
      setApiError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <PageHeader title="Nuevo equipo" backTo="/equipos" />
      {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}
      <SectionCard title="Datos del equipo">
        <EquipoForm values={values} onChange={handleChange} errors={errors} />
      </SectionCard>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button onClick={() => navigate('/equipos')}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
        >
          Guardar equipo
        </Button>
      </Box>
    </Box>
  );
}
