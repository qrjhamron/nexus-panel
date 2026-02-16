import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Card, CardContent, TextField, Button, Grid } from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { serversApi } from '../../api/servers';

interface StartupVariable {
  name: string;
  description: string;
  envVariable: string;
  defaultValue: string;
  serverValue: string;
  rules: string;
}

export function StartupPage() {
  const { uuid = '' } = useParams<{ uuid: string }>();
  const [variables, setVariables] = useState<StartupVariable[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    serversApi.getStartup(uuid).then(({ data }) => {
      const vars: StartupVariable[] = data.data || [];
      setVariables(vars);
      const initial: Record<string, string> = {};
      vars.forEach((v) => { initial[v.envVariable] = v.serverValue || v.defaultValue; });
      setValues(initial);
    }).catch(() => {});
  }, [uuid]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await serversApi.updateStartup(uuid, values);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Startup Variables</Typography>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </Box>

      <Grid container spacing={2.5}>
        {variables.map((v) => (
          <Grid key={v.envVariable} size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={600} mb={0.5}>
                  {v.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                  {v.description}
                </Typography>
                <TextField
                  fullWidth
                  label={v.envVariable}
                  value={values[v.envVariable] || ''}
                  onChange={(e) => setValues((prev) => ({ ...prev, [v.envVariable]: e.target.value }))}
                  placeholder={v.defaultValue}
                  helperText={`Rules: ${v.rules || 'none'}`}
                  slotProps={{ input: { sx: { fontFamily: "'JetBrains Mono', monospace", fontSize: 13 } } }}
                />
              </CardContent>
            </Card>
          </Grid>
        ))}
        {variables.length === 0 && (
          <Grid size={12}>
            <Typography color="text.secondary" textAlign="center" py={4}>
              No startup variables found.
            </Typography>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
