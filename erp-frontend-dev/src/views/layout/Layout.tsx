import { Box, CssBaseline } from '@mui/material';
import TopBar from './nav/Topbar';
import Footer from './Footer';
import { Sidebar } from './nav/Sidebar';
import { useAppTheme } from '@/styles/ThemeContext';
import theme1 from '@/styles/theme1/theme1';

const Layout = ({ sidebarOpen, setSidebarOpen, children }: any) => {
    const { theme } = useAppTheme();

    return (
        theme === theme1 ? (
            <Box sx={{ display: 'flex', flexGrow: 1 }}>
                <CssBaseline />
                <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                <Box 
                    sx={{
                        flexGrow: 1,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'auto'
                    }}
                >
                    <TopBar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                    <Box
                        id='main-container' 
                        component='main' 
                        sx={{
                            flexGrow: 1,
                            p: 4,
                            background: (theme) => theme.palette.mainBackground,
                            overflow: 'auto'
                        }}
                    >
                        {children}
                    </Box>
                    <Footer />
                </Box>
            </Box>
        ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <CssBaseline />
                <TopBar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                <Box sx={{ flexGrow: 1, display: 'flex' }}>
                    <Sidebar sidebarOpen={sidebarOpen} />
                    <Box
                        id='main-container' 
                        component='main' 
                        sx={{
                            flexGrow: 1,
                            p: 4,
                            background: (theme) => theme.palette.mainBackground,
                            overflow: 'auto'
                        }}
                    >
                        {children}
                    </Box>
                </Box>
                <Footer />
            </Box>
        )
    )
}

export default Layout;