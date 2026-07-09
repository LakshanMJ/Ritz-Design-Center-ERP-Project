import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Menu from '@mui/material/Menu';
import MenuIcon from '@mui/icons-material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import { Button, IconButton, darken, useMediaQuery, useTheme } from '@mui/material';
import Logo from './Logo';
import { SidebarDrawer } from './Sidebar';
import { BsChevronDown } from 'react-icons/bs';
import NextLink from 'next/link';
import { useSelector } from 'react-redux';
import { logout } from '@/services/api';
import { grey } from '@mui/material/colors';
import { useAppTheme } from '@/styles/ThemeContext';
import theme2 from '@/styles/theme2/theme2';
import theme1 from '@/styles/theme1/theme1';

const TopBar = ({ sidebarOpen, setSidebarOpen }: any) => {
    const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const authUser = useSelector((state: any) => state.AuthReducer.authUser);
    const { theme } = useAppTheme();
    const isSmall = useMediaQuery(useTheme().breakpoints.down('sm'));

    const handleToggle = () => {
        if (!isSmall) {
            setSidebarOpen(!sidebarOpen);
        } else {
            setDrawerOpen(!drawerOpen);
        }
    };

    const onLogout = () => {
        logout();
        setAnchorElUser(null);
    }

    const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorElUser(event.currentTarget);
    };

    useEffect(() => {
        const handleResize = () => {
            if (window.outerWidth >= 600) {
                setDrawerOpen(false);
            }
        }

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <>
            <SidebarDrawer drawerOpen={drawerOpen} setDrawerOpen={setDrawerOpen} handleDrawerOpen={handleToggle} />
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    minHeight: 64,
                    maxHeight: 64,
                    background: (theme) => theme.palette.topbar.background,
                    boxShadow: (theme) => theme.palette.topbar.boxShadow,
                    pr: 3,
                    pl: 2,
                    py: 2,
                    zIndex: (theme) => theme.zIndex.drawer + 1
                }}
            >
                <Box sx={{ display: 'flex' }}>
                    {(theme === theme2 || isSmall) && (<IconButton
                        onClick={handleToggle}
                        sx={{
                            mr: 2,
                            borderRadius: '50%',
                            ':hover': {
                                backgroundColor: (theme) => darken(theme.palette.topbar.background, 0.1)
                            },
                            ':focus': {
                                backgroundColor: (theme) => darken(theme.palette.topbar.background, 0.2)
                            }
                        }}>
                        <MenuIcon
                            sx={{
                                color: (theme) => theme.palette.topbar.color,
                                fontSize: '1rem'
                            }}
                        />
                    </IconButton>)}
                    {(theme === theme2 || (theme === theme1 && (isSmall || !sidebarOpen))) && <Logo />}
                </Box>

                <Box sx={{ flexGrow: 0, display: 'flex', alignItems: 'center' }}>
                    <Button
                        sx={{
                            mr: 1,
                            px: 1,
                            py: 0.25,
                            background: (theme) => anchorElUser ? darken(theme.palette.topbar.background, 0.2) : 'transparent',
                            borderRadius: 1,
                            '&:hover, &:focus, &:active': {
                                background: (theme) => darken(theme.palette.topbar.background, 0.1)
                            }
                        }}
                        onClick={handleOpenUserMenu}
                        endIcon={<BsChevronDown style={{ color: theme === theme2 ? 'white' : grey[600], fontSize: 'small' }} />}
                    >
                        <Stack direction='row' spacing={2} alignItems='center' sx={{ p: 0.5 }}>
                            {authUser?.username && 
                                <Typography variant='subtitle1' sx={{ color: (theme) => theme.palette.topbar.color }}>
                                    {(authUser?.first_name && authUser?.last_name) ? `${authUser.first_name} ${authUser.last_name}` : authUser.username}
                                </Typography>
                            }
                        </Stack>
                    </Button>
                    <Menu
                        transitionDuration={100}
                        PaperProps={{  
                            sx: {
                                width: 180,
                                '& .MuiMenuItem-root': {
                                    '&:active': {
                                        backgroundColor: (theme) => theme.palette.grey[200]
                                    }
                                }
                            }
                        }}
                        elevation={1}
                        sx={{
                            mt: '49px'
                        }}
                        id='menu-appbar'
                        anchorEl={anchorElUser}
                        anchorOrigin={{
                            vertical: 'top',
                            horizontal: 'right',
                        }}
                        keepMounted
                        transformOrigin={{
                            vertical: 'top',
                            horizontal: 'right',
                        }}
                        open={Boolean(anchorElUser)}
                        onClose={() => setAnchorElUser(null)}
                    >
                        <NextLink href={'/user_account'}>
                            <MenuItem onClick={() => setAnchorElUser(null)}>
                                <Typography fontSize='.8rem'>Account</Typography>
                            </MenuItem>
                        </NextLink>
                        {/* <MenuItem onClick={handleThemeToggle}>
                            <Typography fontSize='.8rem'>Theme: {theme}</Typography>
                        </MenuItem> */}
                        <MenuItem onClick={() => {setAnchorElUser(null), onLogout()}}>
                            <Typography fontSize='.8rem'>Logout</Typography>
                        </MenuItem>
                    </Menu>
                </Box>
            </Box>
        </>
    );
}

export default TopBar;