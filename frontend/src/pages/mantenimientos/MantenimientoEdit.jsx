import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Grid,
  Button,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  FormControlLabel,
  Switch,
  Typography,
  Snackbar,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import SectionCard from '../../components/common/SectionCard';
import ChecklistGroup from '../../components/mantenimientos/ChecklistGroup';
import SignaturePad from '../../components/mantenimientos/SignaturePad';
import CatalogoCheckboxList from '../../components/mantenimientos/CatalogoCheckboxList';
import EvidenciaUploader from '../../components/mantenimientos/EvidenciaUploader';
import FileActionButtons from '../../components/common/FileActionButtons';
import { mantenimientosService } from '../../services/mantenimientos';
import { tecnicosService } from '../../services/tecnicos';
import { equiposService } from '../../services/equipos';
import { ESTADO_EQUIPO_CHOICES, TIPO_MANTENIMIENTO_CHOICES } from '../../utils/constants';
import { todayISO } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';

const EDITABLE = [
  'departamento_area', 'responsable_area', 'tecnico', 'tipo_mantenimiento',
  'fecha_ejecucion', 'hora_inicio', 'hora_fin',
  'actividades_realizadas', 'materiales_utilizados',
  'estado_equipo_post', 'observaciones_tecnico',
  'riesgo_presentado', 'descripcion_riesgo', 'acciones_tomadas',
  'fecha_sugerida_proximo_mantenimiento',
];

export default function MantenimientoEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const equipoIdParam = searchParams.get('equipoId');
  const { user } = useAuth();
  const isCreate = !id;
  const [form, setForm] = useState(isCreate
    ? { equipo: equipoIdParam || '', fecha_ejecucion: todayISO(), riesgo_presentado: false, tipo_mantenimiento: 'PREVENTIVO' }
    : {});
  const [estatus, setEstatus] = useState('BORRADOR');
  const [equipos, setEquipos] = useState([]);
  const [selectedEquipo, setSelectedEquipo] = useState(null);
  const [tecnicos, setTecnicos] = useState([]);
  const [checklistItems, setChecklistItems] = useState([]);
  const [checklistValues, setChecklistValues] = useState({});
  const [evidencias, setEvidencias] = useState([]);
  const [loading, setLoading] = useState(!isCreate);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmCompletar, setConfirmCompletar] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [apiError, setApiError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [pdfUrl, setPdfUrl] = useState('');
  const [firmaDefaults, setFirmaDefaults] = useState({ tecnico: { nombre: '', cargo: '' }, usuario: { nombre: '', cargo: '' } });
  const [firmasGuardadas, setFirmasGuardadas] = useState({ TECNICO: false, USUARIO: false });
  const [firmaImagenes, setFirmaImagenes] = useState({ TECNICO: '', USUARIO: '' });
  const [actividadesCatalogo, setActividadesCatalogo] = useState([]);
  const [materialesCatalogo, setMaterialesCatalogo] = useState([]);
  const [loadingCatalogos, setLoadingCatalogos] = useState(true);
  const [actividadesSeleccionadas, setActividadesSeleccionadas] = useState([]);
  const [materialesSeleccionados, setMaterialesSeleccionados] = useState([]);

  const firmaTecnicoRef = useRef(null);
  const firmaUsuarioRef = useRef(null);

  const showSnack = (message, severity = 'success') =>
    setSnackbar({ open: true, message, severity });

  useEffect(() => {
    tecnicosService.list({ activo: 'true' }).then((d) => {
      const list = d.results ?? d;
      setTecnicos(list);
      if (isCreate && user) {
        const self = list.find((t) => t.id === user.id);
        if (self) setForm((p) => ({ ...p, tecnico: self.id }));
      }
    });

    equiposService.list({ activo: 'true' }).then((d) => setEquipos(d.results ?? d));

    mantenimientosService.checklistItems().then((d) => {
      setChecklistItems(d.results ?? d);
    });

    Promise.all([
      mantenimientosService.actividadesCatalogo(),
      mantenimientosService.materialesCatalogo(),
    ]).then(([acts, mats]) => {
      setActividadesCatalogo(acts.results ?? acts);
      setMaterialesCatalogo(mats.results ?? mats);
    }).finally(() => setLoadingCatalogos(false));

    if (isCreate) return;

    mantenimientosService
      .get(id)
      .then((data) => {
        if (data.estatus === 'COMPLETADO') {
          navigate(`/mantenimientos/${id}`, { replace: true });
          return;
        }
        setEstatus(data.estatus);
        const v = { equipo: data.equipo };
        EDITABLE.forEach((f) => { v[f] = data[f] ?? ''; });
        setForm(v);
        if (data.actividades_realizadas) {
          setActividadesSeleccionadas(data.actividades_realizadas.split(', ').filter(Boolean));
        }
        if (data.materiales_utilizados) {
          setMaterialesSeleccionados(data.materiales_utilizados.split(', ').filter(Boolean));
        }

        if (data.checklist_respuestas && data.checklist_respuestas.length > 0) {
          const respuestas = {};
          data.checklist_respuestas.forEach((resp) => {
            respuestas[resp.checklist_item] = {
              realizado: resp.realizado,
              observacion: resp.observacion || '',
            };
          });
          setChecklistValues(respuestas);
        }

        if (data.evidencias && Array.isArray(data.evidencias)) {
          setEvidencias(data.evidencias);
        }

        if (data.documento_pdf_url) {
          setPdfUrl(data.documento_pdf_url);
        }
      })
      .catch((e) => setApiError(e.message))
      .finally(() => setLoading(false));

    mantenimientosService.getFirmas(id).then((firmas) => {
      if (!firmas) return;
      const firmaTec = firmas.find?.((f) => f.tipo_firma === 'TECNICO');
      const firmaUsr = firmas.find?.((f) => f.tipo_firma === 'USUARIO');
      setFirmaDefaults({
        tecnico: { nombre: firmaTec?.nombre_firmante || '', cargo: firmaTec?.cargo_firmante || '' },
        usuario: { nombre: firmaUsr?.nombre_firmante || '', cargo: firmaUsr?.cargo_firmante || '' },
      });
      setFirmasGuardadas({ TECNICO: !!firmaTec, USUARIO: !!firmaUsr });
      setFirmaImagenes({
        TECNICO: firmaTec?.firma_imagen_url || '',
        USUARIO: firmaUsr?.firma_imagen_url || '',
      });
    }).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!equipos.length || !form.equipo) { setSelectedEquipo(null); return; }
    const eq = equipos.find((e) => String(e.id) === String(form.equipo));
    setSelectedEquipo(eq || null);

    // Pre-llenar departamento_area y responsable_area desde el equipo si están
    // vacíos (override-able por el técnico). Solo aplica al primer "encuentro"
    // con el equipo: si el usuario los modifica, no los sobreescribimos.
    if (eq) {
      setForm((prev) => {
        const updates = {};
        if (!prev.departamento_area && eq.departamento_nombre) {
          updates.departamento_area = eq.departamento_nombre;
        }
        if (!prev.responsable_area && eq.colaborador_nombre) {
          updates.responsable_area = eq.colaborador_nombre;
        }
        return Object.keys(updates).length ? { ...prev, ...updates } : prev;
      });
    }
  }, [form.equipo, equipos]);

  const handleField = (name, value) => {
    setForm((p) => ({ ...p, [name]: value }));
    setFieldErrors((p) => ({ ...p, [name]: false }));
  };

  const FIELD_LABELS = {
    equipo: 'Equipo',
    tecnico: 'Técnico responsable',
    departamento_area: 'Departamento / Área',
    responsable_area: 'Responsable del área',
    fecha_ejecucion: 'Fecha de ejecución',
    hora_inicio: 'Hora inicio',
    hora_fin: 'Hora fin',
    actividades_realizadas: 'Actividades realizadas',
    estado_equipo_post: 'Estado del equipo',
    fecha_sugerida_proximo_mantenimiento: 'Fecha próximo mantenimiento',
  };

  const handleApiFieldErrors = (e) => {
    const data = e.responseData;
    if (data && typeof data === 'object' && !data.detail) {
      const fe = {};
      const msgs = [];
      Object.entries(data).forEach(([field, errs]) => {
        const msg = Array.isArray(errs) ? errs[0] : errs;
        fe[field] = msg;
        const label = FIELD_LABELS[field] || field;
        msgs.push(`${label}: ${msg}`);
      });
      setFieldErrors(fe);
      setApiError(msgs.join(' · '));
      return true;
    }
    return false;
  };

  const handleUploadEvidencia = async (file, tipo, descripcion) => {
    const fd = new FormData();
    fd.append('imagen', file);
    fd.append('tipo', tipo);
    if (descripcion) fd.append('descripcion', descripcion);
    const nueva = await mantenimientosService.uploadEvidencia(id, fd);
    setEvidencias((prev) => [...prev, nueva]);
    showSnack('Evidencia subida correctamente');
  };

  const handleDeleteEvidencia = async (evidenciaId) => {
    await mantenimientosService.deleteEvidencia(id, evidenciaId);
    setEvidencias((prev) => prev.filter((e) => e.id !== evidenciaId));
    showSnack('Evidencia eliminada');
  };

  const f = (name) => ({
    value: form[name] ?? '',
    onChange: (e) => handleField(name, e.target.value),
    size: 'small',
    fullWidth: true,
    error: !!fieldErrors[name],
    helperText: fieldErrors[name] || '',
  });

  const handleSubmit = async () => {
    if (isCreate && !form.equipo) {
      setFieldErrors((p) => ({ ...p, equipo: 'Obligatorio' }));
      setApiError('Selecciona el equipo para guardar el borrador.');
      return;
    }
    setSaving(true);
    setApiError('');
    try {
      const payload = {
        ...form,
        actividades_realizadas: actividadesSeleccionadas.join(', '),
        materiales_utilizados: materialesSeleccionados.join(', '),
      };
      if (isCreate) payload.equipo = parseInt(form.equipo);
      if (!payload.hora_fin) delete payload.hora_fin;
      if (!payload.hora_inicio) delete payload.hora_inicio;
      if (!payload.fecha_ejecucion) delete payload.fecha_ejecucion;
      if (!payload.fecha_sugerida_proximo_mantenimiento) delete payload.fecha_sugerida_proximo_mantenimiento;

      if (isCreate) {
        const mant = await mantenimientosService.create(payload);
        if (mant.existing_borrador) {
          showSnack('Ya existe un borrador para este equipo. Abriendo...', 'info');
        } else {
          showSnack('Borrador creado correctamente.');
        }
        navigate(`/mantenimientos/${mant.id}/editar`, { replace: true });
        return;
      }

      await mantenimientosService.update(id, payload);

      const respuestas = Object.entries(checklistValues).map(([itemId, val]) => ({
        checklist_item: parseInt(itemId),
        realizado: val.realizado,
        observacion: val.observacion || '',
      }));
      if (respuestas.length > 0) {
        await mantenimientosService.saveChecklist(id, respuestas);
      }

      const firmas = [
        { ref: firmaTecnicoRef, tipo: 'TECNICO' },
        { ref: firmaUsuarioRef, tipo: 'USUARIO' },
      ];
      for (const { ref, tipo } of firmas) {
        if (!ref.current?.isEmpty()) {
          const data = ref.current.getData();
          if (data) {
            const fd = new FormData();
            fd.append('tipo_firma', data.tipo_firma);
            fd.append('nombre_firmante', data.nombre_firmante);
            fd.append('cargo_firmante', data.cargo_firmante);
            fd.append('firma_imagen', data.file);
            try {
              const saved = await mantenimientosService.saveFirma(id, fd);
              setFirmasGuardadas((p) => ({ ...p, [tipo]: true }));
              if (saved?.firma_imagen_url) {
                setFirmaImagenes((p) => ({ ...p, [tipo]: saved.firma_imagen_url }));
              }
            } catch {
            }
          }
        }
      }

      showSnack('Cambios guardados correctamente.');
      return true;
    } catch (e) {
      if (!handleApiFieldErrors(e)) setApiError(e.message);
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const validarParaCompletar = () => {
    const errores = [];
    const fe = {};
    if (!form.tecnico) { errores.push('Falta el técnico responsable.'); fe.tecnico = 'Obligatorio'; }
    if (!form.fecha_ejecucion) { errores.push('Falta la fecha de ejecución.'); fe.fecha_ejecucion = 'Obligatorio'; }
    if (!form.hora_inicio) { errores.push('Falta la hora de inicio.'); fe.hora_inicio = 'Obligatorio'; }
    if (!form.hora_fin) { errores.push('Falta la hora de fin.'); fe.hora_fin = 'Obligatorio'; }
    if (!(form.departamento_area || '').trim()) { errores.push('Falta el departamento / área.'); fe.departamento_area = 'Obligatorio'; }
    if (!(form.responsable_area || '').trim()) { errores.push('Falta el responsable del área.'); fe.responsable_area = 'Obligatorio'; }
    if (actividadesSeleccionadas.length === 0) { errores.push('Falta seleccionar al menos una actividad realizada.'); fe.actividades_realizadas = 'Obligatorio'; }
    if (!form.estado_equipo_post) { errores.push('Falta el estado del equipo post-mantenimiento.'); fe.estado_equipo_post = 'Obligatorio'; }
    if (!form.fecha_sugerida_proximo_mantenimiento) { errores.push('Falta la fecha sugerida del próximo mantenimiento.'); fe.fecha_sugerida_proximo_mantenimiento = 'Obligatorio'; }
    setFieldErrors(fe);
    const firmaT = firmaTecnicoRef.current;
    const firmaU = firmaUsuarioRef.current;
    firmaT?.markAllTouched();
    firmaU?.markAllTouched();
    const tecCanvasOk = firmaT && !firmaT.isEmpty();
    const usrCanvasOk = firmaU && !firmaU.isEmpty();
    if (!tecCanvasOk && !firmasGuardadas.TECNICO) { errores.push('Falta dibujar la firma del técnico.'); }
    else if (tecCanvasOk && firmaT.isNombreVacio()) { errores.push('Falta el nombre del firmante (técnico).'); }
    else if (tecCanvasOk && firmaT.isCargoVacio()) { errores.push('Falta el puesto del firmante (técnico).'); }
    if (!usrCanvasOk && !firmasGuardadas.USUARIO) { errores.push('Falta dibujar la firma del usuario.'); }
    else if (usrCanvasOk && firmaU.isNombreVacio()) { errores.push('Falta el nombre del firmante (usuario).'); }
    else if (usrCanvasOk && firmaU.isCargoVacio()) { errores.push('Falta el puesto del firmante (usuario).'); }
    return errores;
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await mantenimientosService.delete(id);
      showSnack('Borrador eliminado.');
      navigate('/mantenimientos', { replace: true });
    } catch (e) {
      showSnack(e.responseData?.detail || e.message, 'error');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleCompletar = async () => {
    const errores = validarParaCompletar();
    if (errores.length > 0) {
      showSnack(errores[0], 'error');
      setApiError(errores.join(' · '));
      return;
    }
    setApiError('');
    setCompleting(true);
    try {
      // Guardamos cambios y generamos un PDF preview (borrador con marca de agua)
      // para que el usuario vea cómo quedará el documento antes de cerrar.
      await handleSubmit();
      const mant = await mantenimientosService.generarPDF(id);
      const url = mant.documento_pdf_url || '';
      setPdfUrl(url);
      // Cache-buster para que el iframe siempre muestre la última versión.
      setPreviewPdfUrl(url ? `${url}?t=${Date.now()}` : '');
      setConfirmCompletar(true);
    } catch (e) {
      const data = e.responseData;
      if (data?.errores) {
        showSnack(data.errores[0], 'error');
        setApiError(data.errores.join(' · '));
      } else if (!handleApiFieldErrors(e)) {
        showSnack(e.message, 'error');
        setApiError(e.message);
      }
    } finally {
      setCompleting(false);
    }
  };

  const confirmarCompletar = async () => {
    setCompleting(true);
    try {
      await mantenimientosService.cerrar(id);
      setConfirmCompletar(false);
      setPreviewPdfUrl('');
      showSnack('Mantenimiento completado correctamente.');
      navigate(`/mantenimientos/${id}`);
    } catch (e) {
      const data = e.responseData;
      if (data?.errores) {
        showSnack(data.errores[0], 'error');
        setApiError(data.errores.join(' · '));
      } else if (!handleApiFieldErrors(e)) {
        showSnack(e.message, 'error');
        setApiError(e.message);
      }
      setConfirmCompletar(false);
    } finally {
      setCompleting(false);
    }
  };

  const handleGenerarPDF = async () => {
    // Validar los campos mínimos que exige el backend para generar el PDF.
    const fe = {};
    const errores = [];
    if (!form.tecnico) { fe.tecnico = 'Obligatorio para generar el PDF'; errores.push('Falta el técnico responsable.'); }
    if (!form.fecha_ejecucion) { fe.fecha_ejecucion = 'Obligatorio para generar el PDF'; errores.push('Falta la fecha de ejecución.'); }
    if (errores.length > 0) {
      setFieldErrors((prev) => ({ ...prev, ...fe }));
      setApiError(errores.join(' · '));
      showSnack(errores[0], 'error');
      return;
    }

    setGenerating(true);
    try {
      // Guardamos antes por si hay cambios pendientes que todavía no se persisten.
      await handleSubmit();
      const mant = await mantenimientosService.generarPDF(id);
      const url = mant.documento_pdf_url || '';
      setPdfUrl(url);
      showSnack('PDF generado correctamente.');
    } catch (e) {
      if (!handleApiFieldErrors(e)) {
        setApiError(e.message);
        showSnack(e.message, 'error');
      }
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <CircularProgress sx={{ mt: 4, ml: 4 }} />;

  return (
    <Box>
      <PageHeader
        title={isCreate ? 'Nuevo mantenimiento' : `Editar mantenimiento #${id}`}
        backTo={isCreate ? '/mantenimientos' : `/mantenimientos/${id}`}
      />

      {apiError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setApiError('')}>
          {apiError}
        </Alert>
      )}

      <SectionCard title="Datos generales">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label={isCreate ? 'Equipo *' : 'Equipo'}
              select
              {...f('equipo')}
              disabled={!isCreate || !!equipoIdParam}
            >
              {equipos.map((eq) => (
                <MenuItem key={eq.id} value={eq.id}>
                  {eq.codigo_interno} — {eq.marca} {eq.modelo}
                </MenuItem>
              ))}
            </TextField>
            {selectedEquipo && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {[
                  selectedEquipo.colaborador_nombre,
                  selectedEquipo.ubicacion_nombre,
                  selectedEquipo.departamento_nombre,
                ].filter(Boolean).join(' · ')}
              </Typography>
            )}
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField label="Técnico responsable" select {...f('tecnico')}>
              {tecnicos.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.full_name || `${t.first_name} ${t.last_name}`} — {t.puesto || 'Técnico'}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField label="Tipo de mantenimiento" select {...f('tipo_mantenimiento')}>
              {TIPO_MANTENIMIENTO_CHOICES.map(({ value, label }) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label="Departamento / Área"
              {...f('departamento_area')}
              helperText={
                fieldErrors.departamento_area
                  ? 'Obligatorio'
                  : 'Pre-llenado desde el equipo. Puede modificarse si el servicio se hizo en otra área.'
              }
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField label="Responsable del área" {...f('responsable_area')} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField label="Fecha de ejecución" type="date" {...f('fecha_ejecucion')} slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField label="Hora inicio" type="time" {...f('hora_inicio')} slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField label="Hora fin" type="time" {...f('hora_fin')} slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
        </Grid>
      </SectionCard>

      {!isCreate && (
      <SectionCard
        title="Checklist técnico"
        subtitle="Guía de revisión del técnico (uso interno). Queda como evidencia y aparece en el anexo técnico del PDF; no se muestra al usuario en la sección de conformidad."
      >
        {checklistItems.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Cargando checklist...</Typography>
        ) : (
          <ChecklistGroup
            items={checklistItems}
            values={checklistValues}
            onChange={(itemId, val) =>
              setChecklistValues((p) => ({ ...p, [itemId]: val }))
            }
          />
        )}
      </SectionCard>
      )}

      <SectionCard
        title="Actividades y materiales"
        subtitle="Resumen visible para el colaborador. Esto aparece en el documento de conformidad que firma el usuario."
      >
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <CatalogoCheckboxList
              label="ACTIVIDADES REALIZADAS"
              items={actividadesCatalogo}
              loading={loadingCatalogos}
              selected={actividadesSeleccionadas}
              onChange={(v) => { setActividadesSeleccionadas(v); setFieldErrors((p) => ({ ...p, actividades_realizadas: false })); }}
              error={!!fieldErrors.actividades_realizadas}
              helperText={fieldErrors.actividades_realizadas || ''}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <CatalogoCheckboxList
              label="MATERIALES UTILIZADOS"
              items={materialesCatalogo}
              loading={loadingCatalogos}
              selected={materialesSeleccionados}
              onChange={setMaterialesSeleccionados}
            />
          </Grid>
        </Grid>
      </SectionCard>

      <SectionCard title="Estado post-mantenimiento">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField label="Estado del equipo" select {...f('estado_equipo_post')}>
              <MenuItem value=""><em>— Seleccionar —</em></MenuItem>
              {ESTADO_EQUIPO_CHOICES.map(({ value, label }) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label="Fecha sugerida próximo mantenimiento"
              type="date"
              {...f('fecha_sugerida_proximo_mantenimiento')}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField label="Observaciones del técnico" {...f('observaciones_tecnico')} multiline rows={3} />
          </Grid>
        </Grid>
      </SectionCard>

      <SectionCard title="Riesgos">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(form.riesgo_presentado)}
                  onChange={(e) => handleField('riesgo_presentado', e.target.checked)}
                />
              }
              label="Se presentó algún riesgo durante el mantenimiento"
            />
          </Grid>
          {form.riesgo_presentado && (
            <>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField label="Descripción del riesgo" {...f('descripcion_riesgo')} multiline rows={3} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField label="Acciones tomadas" {...f('acciones_tomadas')} multiline rows={3} />
              </Grid>
            </>
          )}
        </Grid>
      </SectionCard>

      {!isCreate && (
      <SectionCard title="Evidencias fotográficas">
        <EvidenciaUploader
          evidencias={evidencias}
          onUpload={handleUploadEvidencia}
          onDelete={handleDeleteEvidencia}
        />
      </SectionCard>
      )}

      {!isCreate && (
      <SectionCard title="Firmas">
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'primary.main',
            borderRadius: 1,
            bgcolor: 'primary.50',
            p: 2,
            mb: 3,
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Declaración de conformidad del usuario
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Yo, <strong>{firmaDefaults.usuario.nombre || '_______________________________'}</strong>, declaro que:
          </Typography>
          <Typography variant="body2" component="div" sx={{ lineHeight: 1.7 }}>
            • He verificado el estado del equipo/área tras la intervención.<br />
            • La información brindada por el técnico es clara y suficiente.<br />
            • Acepto las actividades realizadas y su resultado conforme a lo descrito.<br />
            • Cualquier observación adicional fue registrada en este documento.
          </Typography>
        </Box>
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 6 }}>
            <SignaturePad
              key={`tec-${firmaDefaults.tecnico.nombre}`}
              ref={firmaTecnicoRef}
              label="Firma del técnico de TI"
              tipoFirma="TECNICO"
              defaultNombre={firmaDefaults.tecnico.nombre || tecnicos.find((t) => t.id === form.tecnico)?.full_name || ''}
              defaultCargo={firmaDefaults.tecnico.cargo}
              firmaGuardada={firmasGuardadas.TECNICO}
            />
            {firmasGuardadas.TECNICO && firmaImagenes.TECNICO && (
              <Box sx={{ mt: 1.5, p: 1.5, border: '1px solid #e5e7eb', borderRadius: 1, bgcolor: 'grey.50' }}>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                  Firma guardada actualmente (se reemplazará si dibujas una nueva)
                </Typography>
                <Box component="img" src={firmaImagenes.TECNICO} alt="Firma guardada" sx={{ maxHeight: 70, maxWidth: '100%' }} />
              </Box>
            )}
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <SignaturePad
              key={`usr-${firmaDefaults.usuario.nombre}`}
              ref={firmaUsuarioRef}
              label="Firma del usuario / colaborador"
              tipoFirma="USUARIO"
              defaultNombre={firmaDefaults.usuario.nombre}
              defaultCargo={firmaDefaults.usuario.cargo}
              firmaGuardada={firmasGuardadas.USUARIO}
            />
            {firmasGuardadas.USUARIO && firmaImagenes.USUARIO && (
              <Box sx={{ mt: 1.5, p: 1.5, border: '1px solid #e5e7eb', borderRadius: 1, bgcolor: 'grey.50' }}>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                  Firma guardada actualmente (se reemplazará si dibujas una nueva)
                </Typography>
                <Box component="img" src={firmaImagenes.USUARIO} alt="Firma guardada" sx={{ maxHeight: 70, maxWidth: '100%' }} />
              </Box>
            )}
          </Grid>
        </Grid>
      </SectionCard>
      )}

      <SectionCard title="Acciones">
        <Stack spacing={2}>
          {pdfUrl && (
            <FileActionButtons pdfUrl={pdfUrl} onGenerate={handleGenerarPDF} generating={generating} />
          )}
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
              onClick={handleSubmit}
              disabled={saving || completing || deleting}
            >
              {isCreate ? 'Guardar borrador' : 'Guardar cambios'}
            </Button>

            {!isCreate && !pdfUrl && (
              <Button
                variant="outlined"
                startIcon={generating ? <CircularProgress size={16} color="inherit" /> : null}
                onClick={handleGenerarPDF}
                disabled={generating || saving}
              >
                Generar PDF
              </Button>
            )}

            {!isCreate && (
            <Button
              variant="contained"
              color="success"
              startIcon={completing ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
              onClick={handleCompletar}
              disabled={completing || saving || deleting}
            >
              Completar mantenimiento
            </Button>
            )}

            <Button
              onClick={() => navigate(isCreate ? '/mantenimientos' : `/mantenimientos/${id}`)}
              disabled={saving || completing || deleting}
            >
              Cancelar
            </Button>

            {!isCreate && estatus === 'BORRADOR' && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => setConfirmDelete(true)}
                disabled={saving || completing || deleting}
                sx={{ ml: 'auto' }}
              >
                Eliminar borrador
              </Button>
            )}
          </Stack>
        </Stack>
      </SectionCard>

      <Dialog
        open={confirmCompletar}
        onClose={() => !completing && setConfirmCompletar(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Vista previa antes de completar</DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <Box sx={{ px: 3, py: 2 }}>
            <DialogContentText>
              Revisa cómo lucirá el documento. Una vez completado el mantenimiento no podrá modificarse.
              El PDF mostrado es el borrador (con marca de agua); al confirmar se generará la versión final sin marca de agua.
            </DialogContentText>
          </Box>
          {previewPdfUrl ? (
            <Box
              component="iframe"
              src={previewPdfUrl}
              title="Vista previa del PDF"
              sx={{ width: '100%', height: '70vh', border: 'none', display: 'block' }}
            />
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 240 }}>
              <CircularProgress size={28} />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setConfirmCompletar(false)} disabled={completing}>
            Cancelar
          </Button>
          <Button
            onClick={confirmarCompletar}
            color="success"
            variant="contained"
            disabled={completing || !previewPdfUrl}
            startIcon={completing ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
          >
            Completar mantenimiento
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmDelete} onClose={() => !deleting && setConfirmDelete(false)}>
        <DialogTitle>Eliminar borrador</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Seguro que deseas eliminar este borrador? Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)} disabled={deleting}>Cancelar</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((p) => ({ ...p, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
