import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import apiClient from '../../api/client';
import { nestsApi } from '../../api/nests';
import { nodesApi } from '../../api/nodes';

interface Nest {
  id: string;
  name: string;
  description?: string;
  eggs: Egg[];
}

interface Egg {
  id: string;
  name: string;
  description?: string;
  dockerImage: string;
  startup: string;
  nestId: string;
  variables?: EggVariable[];
}

interface EggVariable {
  id: string;
  name: string;
  description: string;
  envVariable: string;
  defaultValue: string;
  rules: string;
}

interface User {
  id: string;
  email: string;
  username: string;
}

interface Node {
  id: string;
  name: string;
  fqdn: string;
}

interface Allocation {
  id: string;
  ip: string;
  port: number;
  serverId?: string | null;
}

const steps = ['Basic Info', 'Configuration', 'Resources', 'Node & Allocation', 'Environment'];

interface CreateServerDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateServerDialog({ open, onClose, onCreated }: CreateServerDialogProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Step 1 - Basic Info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [userId, setUserId] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Step 2 - Configuration
  const [nests, setNests] = useState<Nest[]>([]);
  const [nestId, setNestId] = useState('');
  const [eggs, setEggs] = useState<Egg[]>([]);
  const [eggId, setEggId] = useState('');
  const [dockerImage, setDockerImage] = useState('');
  const [startup, setStartup] = useState('');
  const [nestsLoading, setNestsLoading] = useState(false);

  // Step 3 - Resources
  const [memory, setMemory] = useState('1024');
  const [cpu, setCpu] = useState('100');
  const [disk, setDisk] = useState('5120');
  const [swap, setSwap] = useState('0');

  // Step 4 - Node & Allocation
  const [nodes, setNodes] = useState<Node[]>([]);
  const [nodeId, setNodeId] = useState('');
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [allocationId, setAllocationId] = useState('');
  const [nodesLoading, setNodesLoading] = useState(false);
  const [allocationsLoading, setAllocationsLoading] = useState(false);

  // Step 5 - Environment Variables
  const [eggVariables, setEggVariables] = useState<EggVariable[]>([]);
  const [envValues, setEnvValues] = useState<Record<string, string>>({});

  const resetForm = useCallback(() => {
    setActiveStep(0);
    setError('');
    setSuccess(false);
    setName('');
    setDescription('');
    setUserId('');
    setNestId('');
    setEggId('');
    setDockerImage('');
    setStartup('');
    setMemory('1024');
    setCpu('100');
    setDisk('5120');
    setSwap('0');
    setNodeId('');
    setAllocationId('');
    setEggVariables([]);
    setEnvValues({});
  }, []);

  // Fetch users on open
  useEffect(() => {
    if (!open) return;
    resetForm();
    setUsersLoading(true);
    apiClient.get('/admin/users', { params: { perPage: 100 } })
      .then(({ data }) => setUsers(data.data || []))
      .catch(() => setUsers([]))
      .finally(() => setUsersLoading(false));
  }, [open, resetForm]);

  // Fetch nests when reaching step 2
  useEffect(() => {
    if (activeStep < 1 || nests.length > 0) return;
    setNestsLoading(true);
    nestsApi.list()
      .then(({ data }) => {
        const nestData = data.data || data;
        setNests(Array.isArray(nestData) ? nestData : []);
      })
      .catch(() => setNests([]))
      .finally(() => setNestsLoading(false));
  }, [activeStep, nests.length]);

  // Filter eggs when nest changes
  useEffect(() => {
    if (!nestId) {
      setEggs([]);
      return;
    }
    const selectedNest = nests.find((n) => n.id === nestId);
    if (selectedNest?.eggs) {
      setEggs(selectedNest.eggs);
    } else {
      apiClient.get('/eggs', { params: { nestId } })
        .then(({ data }) => {
          const eggData = data.data || data;
          setEggs(Array.isArray(eggData) ? eggData : []);
        })
        .catch(() => setEggs([]));
    }
    setEggId('');
    setDockerImage('');
    setStartup('');
  }, [nestId, nests]);

  // Auto-fill docker image and startup from selected egg
  useEffect(() => {
    if (!eggId) return;
    const egg = eggs.find((e) => e.id === eggId);
    if (egg) {
      setDockerImage(egg.dockerImage || '');
      setStartup(egg.startup || '');
    }
  }, [eggId, eggs]);

  // Fetch nodes when reaching step 4
  useEffect(() => {
    if (activeStep < 3 || nodes.length > 0) return;
    setNodesLoading(true);
    nodesApi.list()
      .then(({ data }) => setNodes(data.data || []))
      .catch(() => setNodes([]))
      .finally(() => setNodesLoading(false));
  }, [activeStep, nodes.length]);

  // Fetch allocations when node changes
  useEffect(() => {
    if (!nodeId) {
      setAllocations([]);
      setAllocationId('');
      return;
    }
    setAllocationsLoading(true);
    setAllocationId('');
    nodesApi.getAllocations(nodeId)
      .then(({ data }) => {
        const allocs: Allocation[] = data.data || [];
        setAllocations(allocs.filter((a) => !a.serverId));
      })
      .catch(() => setAllocations([]))
      .finally(() => setAllocationsLoading(false));
  }, [nodeId]);

  // Fetch egg variables when reaching step 5
  useEffect(() => {
    if (activeStep < 4 || !eggId) return;
    apiClient.get(`/eggs/${eggId}`)
      .then(({ data }) => {
        const egg = data.data || data;
        const vars: EggVariable[] = egg.variables || [];
        setEggVariables(vars);
        const defaults: Record<string, string> = {};
        for (const v of vars) {
          defaults[v.envVariable] = v.defaultValue || '';
        }
        setEnvValues((prev) => {
          const merged = { ...defaults };
          for (const key of Object.keys(prev)) {
            if (key in merged) merged[key] = prev[key] ?? '';
          }
          return merged;
        });
      })
      .catch(() => setEggVariables([]));
  }, [activeStep, eggId]);

  const validateStep = (): boolean => {
    switch (activeStep) {
      case 0:
        if (!name.trim()) { setError('Server name is required'); return false; }
        if (!userId) { setError('Owner is required'); return false; }
        break;
      case 1:
        if (!nestId) { setError('Nest is required'); return false; }
        if (!eggId) { setError('Egg is required'); return false; }
        if (!dockerImage.trim()) { setError('Docker image is required'); return false; }
        if (!startup.trim()) { setError('Startup command is required'); return false; }
        break;
      case 2: {
        const mem = Number(memory);
        const cpuVal = Number(cpu);
        const diskVal = Number(disk);
        if (isNaN(mem) || mem < 64) { setError('Memory must be at least 64 MB'); return false; }
        if (isNaN(cpuVal) || cpuVal < 1) { setError('CPU must be at least 1%'); return false; }
        if (isNaN(diskVal) || diskVal < 256) { setError('Disk must be at least 256 MB'); return false; }
        break;
      }
      case 3:
        if (!nodeId) { setError('Node is required'); return false; }
        if (!allocationId) { setError('Allocation is required'); return false; }
        break;
    }
    setError('');
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setError('');
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setSaving(true);
    setError('');
    try {
      await apiClient.post('/servers', {
        name: name.trim(),
        description: description.trim() || undefined,
        userId,
        nodeId,
        eggId,
        allocationId,
        nestId,
        memory: Number(memory),
        cpu: Number(cpu),
        disk: Number(disk),
        swap: Number(swap),
        startup,
        image: dockerImage,
        envVariables: Object.keys(envValues).length > 0 ? envValues : undefined,
      });
      setSuccess(true);
      onCreated();
      setTimeout(() => onClose(), 1000);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to create server';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              label="Server Name"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              required
            />
            <TextField
              fullWidth
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={2}
            />
            <TextField
              select
              fullWidth
              label="Owner"
              value={userId}
              onChange={(e) => { setUserId(e.target.value); setError(''); }}
              required
              disabled={usersLoading}
              helperText={usersLoading ? 'Loading users...' : undefined}
            >
              {users.map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  {u.username} ({u.email})
                </MenuItem>
              ))}
            </TextField>
          </Box>
        );
      case 1:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {nestsLoading ? (
              <Box display="flex" justifyContent="center" py={2}><CircularProgress size={24} /></Box>
            ) : (
              <>
                <TextField
                  select
                  fullWidth
                  label="Nest"
                  value={nestId}
                  onChange={(e) => { setNestId(e.target.value); setError(''); }}
                  required
                >
                  {nests.map((n) => (
                    <MenuItem key={n.id} value={n.id}>{n.name}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  fullWidth
                  label="Egg"
                  value={eggId}
                  onChange={(e) => { setEggId(e.target.value); setError(''); }}
                  required
                  disabled={!nestId || eggs.length === 0}
                  helperText={nestId && eggs.length === 0 ? 'No eggs available for this nest' : undefined}
                >
                  {eggs.map((e) => (
                    <MenuItem key={e.id} value={e.id}>{e.name}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  fullWidth
                  label="Docker Image"
                  value={dockerImage}
                  onChange={(e) => { setDockerImage(e.target.value); setError(''); }}
                  required
                  helperText="Auto-filled from egg, but editable"
                />
                <TextField
                  fullWidth
                  label="Startup Command"
                  value={startup}
                  onChange={(e) => { setStartup(e.target.value); setError(''); }}
                  required
                  multiline
                  rows={2}
                  helperText="Auto-filled from egg, but editable"
                />
              </>
            )}
          </Box>
        );
      case 2:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              label="Memory (MB)"
              type="number"
              value={memory}
              onChange={(e) => { setMemory(e.target.value); setError(''); }}
              required
              helperText="Minimum: 64 MB"
              slotProps={{ htmlInput: { min: 64 } }}
            />
            <TextField
              fullWidth
              label="CPU (%)"
              type="number"
              value={cpu}
              onChange={(e) => { setCpu(e.target.value); setError(''); }}
              required
              helperText="Minimum: 1%"
              slotProps={{ htmlInput: { min: 1 } }}
            />
            <TextField
              fullWidth
              label="Disk (MB)"
              type="number"
              value={disk}
              onChange={(e) => { setDisk(e.target.value); setError(''); }}
              required
              helperText="Minimum: 256 MB"
              slotProps={{ htmlInput: { min: 256 } }}
            />
            <TextField
              fullWidth
              label="Swap (MB)"
              type="number"
              value={swap}
              onChange={(e) => setSwap(e.target.value)}
              helperText="0 to disable, -1 for unlimited"
              slotProps={{ htmlInput: { min: -1 } }}
            />
          </Box>
        );
      case 3:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {nodesLoading ? (
              <Box display="flex" justifyContent="center" py={2}><CircularProgress size={24} /></Box>
            ) : (
              <>
                <TextField
                  select
                  fullWidth
                  label="Node"
                  value={nodeId}
                  onChange={(e) => { setNodeId(e.target.value); setError(''); }}
                  required
                >
                  {nodes.map((n) => (
                    <MenuItem key={n.id} value={n.id}>{n.name} ({n.fqdn})</MenuItem>
                  ))}
                </TextField>
                {allocationsLoading ? (
                  <Box display="flex" justifyContent="center" py={2}><CircularProgress size={24} /></Box>
                ) : (
                  <TextField
                    select
                    fullWidth
                    label="Allocation"
                    value={allocationId}
                    onChange={(e) => { setAllocationId(e.target.value); setError(''); }}
                    required
                    disabled={!nodeId || allocations.length === 0}
                    helperText={
                      !nodeId
                        ? 'Select a node first'
                        : allocations.length === 0
                          ? 'No available allocations for this node'
                          : undefined
                    }
                  >
                    {allocations.map((a) => (
                      <MenuItem key={a.id} value={a.id}>{a.ip}:{a.port}</MenuItem>
                    ))}
                  </TextField>
                )}
              </>
            )}
          </Box>
        );
      case 4:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {eggVariables.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                No environment variables for this egg.
              </Typography>
            ) : (
              eggVariables.map((v) => (
                <Box key={v.id}>
                  <TextField
                    fullWidth
                    label={v.name}
                    value={envValues[v.envVariable] ?? v.defaultValue}
                    onChange={(e) =>
                      setEnvValues((prev) => ({ ...prev, [v.envVariable]: e.target.value }))
                    }
                    helperText={
                      <>
                        <Typography component="span" variant="caption" fontFamily="monospace">
                          {v.envVariable}
                        </Typography>
                        {v.description && ` — ${v.description}`}
                      </>
                    }
                  />
                </Box>
              ))
            )}
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create Server</DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mt: 1, mb: 2 }} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        <Divider sx={{ mb: 1 }} />
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>Server created successfully!</Alert>
        )}
        {renderStepContent()}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        {activeStep > 0 && (
          <Button onClick={handleBack} disabled={saving}>Back</Button>
        )}
        {activeStep < steps.length - 1 ? (
          <Button variant="contained" onClick={handleNext}>Next</Button>
        ) : (
          <Button variant="contained" onClick={handleSubmit} disabled={saving || success}>
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Create Server'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
