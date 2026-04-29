import { useState, useEffect } from 'react';
import {
  Grid,
  TextField,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Collapse,
} from '@mui/material';
import { TIPO_EQUIPO_CHOICES } from '../../utils/constants';
import { ubicacionesService, departamentosService } from '../../services/equipos';

function hasColaborador(values) {
  const nombre = values.colaborador_nombre ?? '';
  return nombre !== '';
}

export default function EquipoForm({ values, onChange, errors = {} }) {
  const [asignar, setAsignar] = useState(() => hasColaborador(values));
  const [ubicaciones, setUbicaciones] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);

  useEffect(() => {
    setAsignar(hasColaborador(values));
  }, [values.colaborador_nombre]);

  // Cargar ubicaciones (catálogo completo) una vez.
  useEffect(() => {
    ubicacionesService.list().then(setUbicaciones).catch(() => setUbicaciones([]));
  }, []);

  // Cargar departamentos cada vez que cambia la ubicación seleccionada.
  useEffect(() => {
    if (!values.ubicacion) {
      setDepartamentos([]);
      return;
    }
    departamentosService.list(values.ubicacion)
      .then(setDepartamentos)
      .catch(() => setDepartamentos([]));
  }, [values.ubicacion]);

  const field = (name) => ({
    name,
    value: values[name] ?? '',
    onChange: (e) => onChange(name, e.target.value),
    error: Boolean(errors[name]),
    helperText: errors[name] || '',
    fullWidth: true,
    size: 'small',
  });

  // Cuando cambia la ubicación, se limpia el departamento (las opciones cambian).
  const handleUbicacionChange = (e) => {
    const newUbic = e.target.value;
    onChange('ubicacion', newUbic);
    if (values.departamento) onChange('departamento', '');
  };

  const handleAsignarChange = (e) => {
    const checked = e.target.checked;
    setAsignar(checked);
    if (!checked) {
      onChange('colaborador_nombre', '');
      onChange('colaborador_correo', '');
      onChange('colaborador_puesto', '');
    }
  };

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField label="Código interno *" {...field('codigo_interno')} />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField label="Marca *" {...field('marca')} />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField label="Modelo *" {...field('modelo')} />
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <TextField label="Número de serie" {...field('numero_serie')} />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField label="Tipo de equipo *" select {...field('tipo_equipo')}>
          {TIPO_EQUIPO_CHOICES.map(({ value, label }) => (
            <MenuItem key={value} value={value}>{label}</MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField
          label="Ubicación *"
          select
          {...field('ubicacion')}
          onChange={handleUbicacionChange}
        >
          <MenuItem value=""><em>— Seleccionar —</em></MenuItem>
          {ubicaciones.map((u) => (
            <MenuItem key={u.id} value={u.id}>{u.nombre}</MenuItem>
          ))}
        </TextField>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          label="Departamento"
          select
          {...field('departamento')}
          disabled={!values.ubicacion}
          helperText={
            errors.departamento ||
            (!values.ubicacion ? 'Selecciona primero la ubicación' : 'Opcional')
          }
        >
          <MenuItem value=""><em>— Sin departamento —</em></MenuItem>
          {departamentos.map((d) => (
            <MenuItem key={d.id} value={d.id}>{d.nombre}</MenuItem>
          ))}
        </TextField>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <FormControlLabel
          control={<Checkbox checked={asignar} onChange={handleAsignarChange} size="small" />}
          label="Asignar equipo a colaborador"
        />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Collapse in={asignar}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField label="Nombre del colaborador *" {...field('colaborador_nombre')} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField label="Correo del colaborador" type="email" {...field('colaborador_correo')} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField label="Puesto" {...field('colaborador_puesto')} />
            </Grid>
          </Grid>
        </Collapse>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          label="Fecha próximo mantenimiento"
          type="date"
          {...field('fecha_proximo_mantenimiento')}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Grid>
    </Grid>
  );
}
