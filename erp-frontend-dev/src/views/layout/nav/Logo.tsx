import { APP_TITLE } from '@/helpers/constants/Constants';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';

const LOGO_PATH = '/images/sidebar.png';
const SUBTITLE = 'Beta';

const Logo = ({ sidebar=false }: any) => (
    <Box
        component={NextLink}
        href='/'
        sx={{
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
        }}
    >
        <img src={LOGO_PATH} alt='Ritz' height='25'/>
        <Typography
            sx={{
                ml: 2,
                mr: 1, 
                fontSize: sidebar ? '1.2rem' : '1.4rem',
                fontWeight: 700,
                lineHeight: 1,
                color: (theme) => sidebar ? theme.palette.grey[100] : theme.palette.topbar.logo,
            }}
        >
            {APP_TITLE}
        </Typography>
        {(!sidebar && SUBTITLE) && (
            <Chip 
                label={SUBTITLE}
                size='small'
                sx={{
                    color: (theme) => theme.palette.topbar.logo,
                    cursor: 'pointer',
                    height: 16,
                    '& .MuiChip-label': {
                        fontFamily: 'sans-serif',
                    }
                }}
            />
        )}
    </Box>
);

export default Logo;