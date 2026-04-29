import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  InputAdornment,
  Alert,
  Skeleton,
  Stack,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import BuildIcon from '@mui/icons-material/Build';
import BlockIcon from '@mui/icons-material/Block';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import StatusChip from '../../components/common/StatusChip';
import BajaDialog from '../../components/equipos/BajaDialog';
import ImportarCSVDialog from '../../components/equipos/ImportarCSVDialog';
import { equiposService } from '../../services/equipos';
import { useIniciarMantenimiento } from '../../hooks/useIniciarMantenimiento';
import { formatDate } from '../../utils/formatters';
import { TIPO_EQUIPO_MAP } from '../../utils/constants';

const FILTROS = [
  { value: 'todos',       label: 'Todos' },
  { value: 'activos',     label: 'Activos' },
  { value: 'disponibles', label: 'Disponibles' },
  { value: 'inactivos',   label: 'Baja' },
  { value: 'proximos',    label: 'Próximos' },
  { value: 'vencidos',    label: 'Vencidos' },
];

export default function EquiposList() {
  const navigate = useNavigate();
  const [equipos, setEquipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('activos');
  const [search, setSearch] = useState('');
  const [bajaTarget, setBajaTarget] = useState(null);
  const [bajaLoading, setBajaLoading] = useState(false);
  const [bajaError, setBajaError] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const { iniciar, registrandoId } = useIniciarMantenimiento();

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    const params = {};
    if (filtro === 'activos')     params.estado = 'ACTIVO';
    if (filtro === 'disponibles') params.estado = 'DISPONIBLE';
    if (filtro === 'inactivos')   params.estado = 'BAJA';
    if (filtro === 'proximos')    params.proximo = 'true';
    if (filtro === 'vencidos')    params.vencido = 'true';
    equiposService
      .list(params)
      .then((data) => setEquipos(data.results ?? data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filtro]);

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? equipos.filter(
        (e) =>
          e.codigo_interno.toLowerCase().includes(search.toLowerCase()) ||
          e.marca.toLowerCase().includes(search.toLowerCase()) ||
          e.modelo.toLowerCase().includes(search.toLowerCase()) ||
          (e.colaborador_nombre || '').toLowerCase().includes(search.toLowerCase()) ||
          (e.ubicacion_nombre || '').toLowerCase().includes(search.toLowerCase()) ||
          (e.departamento_nombre || '').toLowerCase().includes(search.toLowerCase())
      )
    : equipos;

  const handleExport = async () => {
    setExportLoading(true);
    setError('');
    try {
      // Respetamos el filtro actual al exportar (mismo queryset que la lista).
      const params = {};
      if (filtro === 'activos')     params.estado = 'ACTIVO';
      if (filtro === 'disponibles') params.estado = 'DISPONIBLE';
      if (filtro === 'inactivos')   params.estado = 'BAJA';
      if (filtro === 'proximos')    params.proximo = 'true';
      if (filtro === 'vencidos')    params.vencido = 'true';
      await equiposService.exportarCSV(params);
    } catch (e) {
      setError(e.message || 'No se pudo exportar el CSV.');
    } finally {
      setExportLoading(false);
    }
  };

  const handleBaja = async (motivo) => {
    setBajaLoading(true);
    setBajaError('');
    try {
      await equiposService.baja(bajaTarget.id, motivo);
      setBajaTarget(null);
      load();
    } catch (e) {
      setBajaError(e.message);
    } finally {
      setBajaLoading(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title="Equipos"
        subtitle="Inventario de equipos de cómputo"
        actions={
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExport}
              disabled={exportLoading}
            >
              Exportar CSV
            </Button>
            <Button
              variant="outlined"
              startIcon={<UploadFileIcon />}
              onClick={() => setImportOpen(true)}
            >
              Importar CSV
            </Button>
            <Button variant="contained" onClick={() => navigate('/equipos/nuevo')}>
              + Nuevo equipo
            </Button>
          </Stack>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <ToggleButtonGroup
            value={filtro}
            exclusive
            onChange={(_, v) => v && setFiltro(v)}
            size="small"
          >
            {FILTROS.map(({ value, label }) => (
              <ToggleButton key={value} value={value}>{label}</ToggleButton>
            ))}
          </ToggleButtonGroup>
          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            size="small"
            sx={{ maxWidth: 280 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </Stack>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Código</TableCell>
              <TableCell>Marca / Modelo</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Ubicación</TableCell>
              <TableCell>Colaborador</TableCell>
              <TableCell>Próximo mant.</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No se encontraron equipos
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((eq) => (
                <TableRow key={eq.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/equipos/${eq.id}`)}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{eq.codigo_interno}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{eq.marca} {eq.modelo}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {TIPO_EQUIPO_MAP[eq.tipo_equipo] ?? eq.tipo_equipo}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{eq.ubicacion_nombre || '—'}</Typography>
                    {eq.departamento_nombre && (
                      <Typography variant="caption" color="text.secondary">
                        {eq.departamento_nombre}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color={eq.colaborador_nombre ? 'text.primary' : 'text.disabled'}>
                      {eq.colaborador_nombre || 'Sin asignar'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(eq.fecha_proximo_mantenimiento)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <StatusChip type="equipo_estado" value={eq.estado} />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title="Ver detalle">
                        <IconButton size="small" onClick={() => navigate(`/equipos/${eq.id}`)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => navigate(`/equipos/${eq.id}/editar`)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Registrar mantenimiento">
                        <IconButton
                          size="small"
                          color="primary"
                          disabled={registrandoId === eq.id}
                          onClick={() => iniciar(eq.id)}
                        >
                          <BuildIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <BajaDialog
        open={Boolean(bajaTarget)}
        onClose={() => { setBajaTarget(null); setBajaError(''); }}
        onConfirm={handleBaja}
        loading={bajaLoading}
        error={bajaError}
      />

      <ImportarCSVDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={equiposService.importarCSV}
        onSuccess={() => load()}
      />
    </Box>
  );
}
