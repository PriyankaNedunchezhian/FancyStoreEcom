import { useId, useState } from 'react';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import ContrastIcon from '@mui/icons-material/Contrast';
import { useTheme } from '../context/ThemeContext';

export default function ThemeSwitcher({ variant = 'navbar' }) {
  const { theme, setTheme, themes } = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const listId = useId();
  const current = themes.find((item) => item.id === theme) || themes[0];
  const open = Boolean(anchorEl);

  if (variant === 'panel') {
    return (
      <Stack spacing={1.5}>
        <div>
          <Typography
            component="h2"
            sx={{ m: 0, fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.02em' }}
          >
            Appearance
          </Typography>
          <Typography color="text.secondary" variant="body2" sx={{ mt: 0.25 }}>
            Choose a theme for the admin console.
          </Typography>
        </div>
        <Stack spacing={1}>
          {themes.map((item) => {
            const selected = item.id === theme;
            return (
              <Box
                key={item.id}
                component="button"
                type="button"
                onClick={() => setTheme(item.id)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  width: '100%',
                  p: 1.25,
                  borderRadius: 2,
                  border: 1,
                  borderColor: selected ? 'primary.main' : 'divider',
                  bgcolor: selected ? 'var(--info-bg)' : 'background.paper',
                  color: 'text.primary',
                  cursor: 'pointer',
                  textAlign: 'left',
                  font: 'inherit',
                }}
              >
                <Stack direction="row" spacing={0.5}>
                  {item.preview.map((color) => (
                    <Box
                      key={color}
                      sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: color, border: '1px solid', borderColor: 'divider' }}
                    />
                  ))}
                </Stack>
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>{item.label}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.description}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Stack>
      </Stack>
    );
  }

  return (
    <>
      <IconButton
        aria-label={`Theme: ${current.label}`}
        aria-controls={open ? listId : undefined}
        aria-haspopup="true"
        aria-expanded={open || undefined}
        onClick={(event) => setAnchorEl(event.currentTarget)}
      >
        <ContrastIcon fontSize="small" />
      </IconButton>
      <Menu
        id={listId}
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {themes.map((item) => (
          <MenuItem
            key={item.id}
            selected={item.id === theme}
            onClick={() => {
              setTheme(item.id);
              setAnchorEl(null);
            }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              {item.preview.map((color) => (
                <Box
                  key={color}
                  sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: color, border: '1px solid', borderColor: 'divider' }}
                />
              ))}
              <span>{item.label}</span>
            </Stack>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
