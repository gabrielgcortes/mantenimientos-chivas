import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Grid,
  Typography,
  Alert,
  CircularProgress,
  Divider,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Chip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import BuildIcon from '@mui/icons-material/Build';
import BlockIcon from '@mui/icons-material/Block';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import SectionCard from '../../components/common/SectionCard';
import StatusChip from '../../components/common/StatusChip';
import BajaDialog from '../../components/equipos/BajaDialog';
import { equiposService } from '../../services/equipos';
import { useIniciarMantenimiento } from '../../hooks/useIniciarMantenimiento';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { TIPO_EQUIPO_MAP } from '../../utils/constants';

function InfoRow({ label, value }) {
  return (
    <Box sx={{ display: 'flex', py: 0.75 }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 200, fontWeight: 500 }}>
        {label}
      </Typography>
      <Typography variant="body2">{value || '—'}</Typography>
    </Box>
  );
}

export default function EquipoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [equipo, setEquipo] = useState(null);
  const [mantenimientos, setMantenimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bajaOpen, setBajaOpen] = useState(false);
  const [bajaLoading, setBajaLoading] = useState(false);
  const [bajaError, setBajaError] = useState('');
  const { iniciar, registrandoId } = useIniciarMantenimiento();
  const registrando = registrandoId !== null;

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([equiposService.get(id), equiposService.mantenimientos(id)])
      .then(([eq, mants]) => {
        setEquipo(eq);
        setMantenimientos(mants.results ?? mants);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleBaja = async (motivo) => {
    setBajaLoading(true);
    setBajaError('');
    try {
      await equiposService.baja(id, motivo);
      setBajaOpen(false);
      load();
    } catch (e) {
      setBajaError(e.message);
    } finally {
      setBajaLoading(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!equipo) return null;

  return (
    <Box>
      <PageHeader
        title={`${equipo.codigo_interno} — ${equipo.marca} ${equipo.modelo}`}
        backTo="/equipos"
        actions={
          <>
            <Button
              startIcon={registrando ? <CircularProgress size={16} color="inherit" /> : <BuildIcon />}
              variant="contained"
              disabled={registrando}
              onClick={() => iniciar(equipo.id)}
            >
              Registrar mantenimiento
            </Button>
            <Button startIcon={<EditIcon />} variant="outlined" onClick={() => navigate(`/equipos/${id}/editar`)}>
              Editar
            </Button>
            {equipo.activo && (
              <Button startIcon={<BlockIcon />} color="error" variant="outlined" onClick={() => setBajaOpen(true)}>
                Dar de baja
              </Button>
            )}
          </>
        }
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <SectionCard title="Datos del equipo">
            <InfoRow label="Código interno" value={equipo.codigo_interno} />
            <Divider sx={{ my: 0.5 }} />
            <InfoRow label="Marca" value={equipo.marca} />
            <InfoRow label="Modelo" value={equipo.modelo} />
            <InfoRow label="Número de serie" value={equipo.numero_serie} />
            <InfoRow label="Tipo" value={TIPO_EQUIPO_MAP[equipo.tipo_equipo] ?? equipo.tipo_equipo} />
            <InfoRow label="Ubicación" value={equipo.ubicacion_nombre} />
            <InfoRow label="Departamento" value={equipo.departamento_nombre} />
            <Divider sx={{ my: 0.5 }} />
            <InfoRow label="Colaborador" value={equipo.colaborador_nombre} />
            <InfoRow label="Correo" value={equipo.colaborador_correo} />
            <InfoRow label="Puesto" value={equipo.colaborador_puesto} />
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <SectionCard title="Estado actual">
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>ESTADO</Typography>
              <Box sx={{ mt: 0.5 }}>
                <StatusChip type="equipo_estado" value={equipo.estado} size="medium" />
              </Box>
            </Box>
            {equipo.estado === 'BAJA' && (
              <>
                <InfoRow label="Fecha de baja" value={formatDate(equipo.fecha_baja)} />
                <InfoRow label="Motivo" value={equipo.motivo_baja} />
              </>
            )}
            <Divider sx={{ my: 1.5 }} />
            <InfoRow label="Fecha alta" value={formatDate(equipo.fecha_alta)} />
            <InfoRow label="Último mantenimiento" value={formatDate(equipo.fecha_ultimo_mantenimiento)} />
            <InfoRow
              label="Próximo mantenimiento"
              value={formatDate(equipo.fecha_proximo_mantenimiento)}
            />
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 0 }}>
            <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #e5e7eb' }}>
              <Typography variant="subtitle1">Historial de mantenimientos</Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Técnico</TableCell>
                    <TableCell>Estado post</TableCell>
                    <TableCell>Estatus</TableCell>
                    <TableCell>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mantenimientos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                        Sin mantenimientos registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    mantenimientos.map((m) => (
                      <TableRow key={m.id} hover>
                        <TableCell>{m.id}</TableCell>
                        <TableCell>{formatDate(m.fecha_ejecucion)}</TableCell>
                        <TableCell>{m.tecnico_nombre}</TableCell>
                        <TableCell>
                          {m.estado_equipo_post ? (
                            <StatusChip type="estado_equipo" value={m.estado_equipo_post} />
                          ) : '—'}
                        </TableCell>
                        <TableCell><StatusChip type="estatus" value={m.estatus} /></TableCell>
                        <TableCell>
                          <Button size="small" onClick={() => navigate(`/mantenimientos/${m.id}`)}>
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      <BajaDialog
        open={bajaOpen}
        onClose={() => { setBajaOpen(false); setBajaError(''); }}
        onConfirm={handleBaja}
        loading={bajaLoading}
        error={bajaError}
      />
    </Box>
  );
}
