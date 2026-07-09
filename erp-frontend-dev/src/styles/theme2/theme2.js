import { createTheme } from '@mui/material';
import { Palette } from './palette';
import { Typography } from '../typography';
import { Components } from './components';

const theme2 = createTheme({
    name: 'theme2',
    typography: Typography,
    components: Components,
    palette: Palette,
    shape: {
        borderRadius: 5
    }
});

export default theme2;