import SidebarContent from './SidebarContent';
import { Box, Collapse, Drawer } from '@mui/material';

const SIDEBAR_WIDTH = 245;
const SIDEBAR_COLLAPSED_WIDTH = 65;

export const Sidebar = ({ sidebarOpen, setSidebarOpen }: any) => {
    return (
        <Box
            sx={{
                display: {
                    xs: 'none',
                    sm: 'block'
                },
                zIndex: (theme) => theme.zIndex.drawer,
                borderRight: (theme) => `1px solid ${theme.palette.grey[300]}`,
                // ...(sidebarOpen && {
                    background: (theme) => theme.palette.sidebar.background,
                    color: (theme) => theme.palette.sidebar.color    
                // })
            }}
        >
            <Collapse orientation='horizontal' in={sidebarOpen} collapsedSize={SIDEBAR_COLLAPSED_WIDTH}>
                <Box sx={{ width: sidebarOpen ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED_WIDTH }}>
                    <SidebarContent open={sidebarOpen} setSidebarOpen={setSidebarOpen} />
                </Box>
            </Collapse>
        </Box>
    )
}

export const SidebarDrawer = ({ drawerOpen, setDrawerOpen, handleDrawerOpen }: any) => {
    return (
        <Drawer
            variant='temporary'
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            ModalProps={{
                keepMounted: true
            }}
            sx={{
                display: {
                    xs: 'block',
                    sm: 'none'
                },
                '& .MuiDrawer-paper': {
                    height: '100%',
                    boxSizing: 'border-box', 
                    width: SIDEBAR_WIDTH,
                    background: (theme) => theme.palette.sidebar.background,
                    color: (theme) => theme.palette.sidebar.color
                }
            }}
        >
            <Box sx={{ minHeight: 64 }} />
            <SidebarContent open={drawerOpen} isMobileNav={true} handleDrawerOpen={handleDrawerOpen} />
        </Drawer>
    )
}
