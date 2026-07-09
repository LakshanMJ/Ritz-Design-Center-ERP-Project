import SimpleBar from 'simplebar-react';
import List from '@mui/material/List';
import Collapse from '@mui/material/Collapse';
import Tooltip from '@mui/material/Tooltip';
import NextLink from 'next/link';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import { BsChevronRight, BsChevronDown } from 'react-icons/bs';
import React, { useEffect, useState } from 'react';
import NavItems from './NavItems';
import { useSelector } from 'react-redux';
import Alert from '@mui/material/Alert';
import Logo from './Logo';
import { Box, IconButton, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

const listItemButtonStyle = (open: boolean) => ({
    minHeight: 50,
    maxHeight: 50,
    height: 50,
    justifyContent: open ? 'initial' : 'center',
});

const listItemIconStyle = (open: boolean) => ({
    mr: open ? 1.5 : 0,
    minWidth: 0,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 1
});

const listItemIconArrowStyle = {
    ml: 3,
    minWidth: 0,
    position: 'absolute',
    zIndex: 2
}

const filterAllowedItems = (items: any[], authRoles: string[]) => {
    return items.filter(item => {
        const allowed = !item?.allow_roles?.length || item?.allow_roles?.some((role: string) => authRoles.includes(role));

        if (allowed && item?.children?.length > 0) {
            item.children = filterAllowedItems(item.children, authRoles);
        }

        return allowed;
    });
}

const getSelectedItem = (items: any[]) => {
    let selectedItems: any[] = [];
  
    const findSelected = (arr: any[], parent?: any) => {
        arr.forEach((item: any) => {
            if (item?.selected) {
                selectedItems.push({
                    ...item,
                    parent: parent
                });
            }
            if (item.children?.length > 0) {
                findSelected(item.children, item);
            }
        });
    }
  
    findSelected(items);
    return selectedItems;
}

const NavItem = (props: any) => {
    const open = props?.open;
    const item = props?.item;
    const isChild = props?.isChild;
    const isMobileNav = props?.isMobileNav;
    const handleDrawerOpen = props?.handleDrawerOpen;

    const handleClick: any = () => {
        if (isMobileNav) {
            handleDrawerOpen();
        }
    }

    return (
        <ListItem
            disablePadding
            sx={{
                display: 'block',
                // background: (theme) => isChild ? theme.palette.grey[50] : ''
            }}
            component={NextLink}
            href={item?.url}
        >
            <Tooltip title={ !open ? item?.name : null } placement='right'>
                <ListItemButton
                    disableRipple={false}
                    selected={item?.selected}
                    onClick={handleClick}
                    sx={{
                        ...listItemButtonStyle(open),
                        px: isChild ? (!open ? 3 : 6.5) : 3,
                        '&.Mui-selected, &.Mui-selected:hover': {
                            color: (theme) => theme.palette.sidebar.selected.color,
                            borderRight: (theme) => `2px solid ${theme.palette.sidebar.selected.border}`,
                            backgroundColor: (theme) => theme.palette.sidebar.selected.background
                        },
                        '&:hover': {
                            color: (theme) => theme.palette.sidebar.hover.color,
                            backgroundColor: (theme) => theme.palette.sidebar.hover.background
                        }
                    }}
                >
                    {(!isChild || !open) && <ListItemIcon
                        sx={{
                            ...listItemIconStyle(open),
                            color: (theme) => item.selected ? theme.palette.sidebar.selected.color : theme.palette.sidebar.color,
                        }}
                    >
                        {item?.icon}
                    </ListItemIcon>}

                    <ListItemText 
                        primaryTypographyProps={{ fontSize: '0.875rem' }}
                        primary={item?.name} 
                        sx={{
                            opacity: open ? 1 : 0
                        }}
                    />
                </ListItemButton>
            </Tooltip>
        </ListItem>
    )
}

const NavGroup = (props: any) => {
    const open = props?.open;
    const group = props?.group;
    const selectedGroup = props?.selectedGroup;
    const [collapsed, setCollapsed] = useState(false);

    const handleCollapse = () => {
        setCollapsed(!collapsed);
    };

    useEffect(() => {
        if (selectedGroup === group?.name) {
            setCollapsed(true);
        }
    }, [selectedGroup]);

    return (
        <>
            <ListItem disablePadding>
                <Tooltip title={ !open ? group.name : null } placement='right'>
                    <ListItemButton
                        onClick={handleCollapse} 
                        disableRipple={false}
                        sx={{
                            ...listItemButtonStyle(open),
                            pl: 3,
                            pr: open ? 2 : 3,
                            '&:hover': {
                                color: (theme) => collapsed? theme.palette.sidebar.color : theme.palette.sidebar.hover.color,
                                backgroundColor: (theme) => collapsed ? theme.palette.sidebar.background : theme.palette.sidebar.hover.background
                            }
                        }}
                    >
                        {open && <ListItemIcon 
                            sx={{
                                ...listItemIconStyle(open),
                                color: (theme) => theme.palette.sidebar.color,
                            }}>
                            {group.icon}
                        </ListItemIcon>}

                        <ListItemText 
                            primaryTypographyProps={{ fontSize: '0.875rem' }}
                            primary={group.name} 
                            sx={{
                                opacity: open ? 1 : 0
                            }}
                        />

                        <ListItemIcon 
                            sx={{
                                ...listItemIconStyle(open),
                                mr: open ? 0 : 0.5,
                                // mr: 0,
                                color: (theme) => collapsed ? theme.palette.sidebar.selected.color : theme.palette.sidebar.color,
                            }}
                        >
                            {!open ? group?.icon : (collapsed ? <BsChevronDown fontSize='0.8rem' /> : <BsChevronRight fontSize='0.8rem' />)}
                        </ListItemIcon>

                        {!open && 
                            <ListItemIcon
                                sx={{
                                    ...listItemIconArrowStyle,
                                    mr: 0,
                                    color: (theme) => collapsed ? theme.palette.sidebar.selected.color : theme.palette.sidebar.color,
                                }}
                            >
                                {collapsed ? <BsChevronDown fontSize='0.7rem' /> : <BsChevronRight fontSize='0.7rem' />}
                            </ListItemIcon>
                        }
                    </ListItemButton>
                </Tooltip>
            </ListItem>
            <Collapse in={collapsed} unmountOnExit>
                {group.children.length && group.children.map((child: any) => <NavItem item={child} key={child.name} isChild={true} {...props} />)}
            </Collapse>
        </>
    )
}

const SidebarHeader = (props: any) => {
    const open = props?.open;

    const handleToggle = () => {
        if (!props?.isMobileNav) {
            props?.setSidebarOpen(!open);
        } else {
            props?.handleDrawerOpen(!open);
        }
    }

    return (
        <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 1,
            pl: open ? 3: 2,
            pr: 2,
            py: 2,
            background: open ? 'inherit' : '#313946'
        }}>
            {open && <Logo sidebar/>}
            <IconButton
                onClick={handleToggle} 
                sx={{
                    borderRadius: 1,
                    color: (theme) => theme.palette.grey[300],
                    ':focus': {
                        color: (theme) => theme.palette.sidebar.selected.color,
                        backgroundColor: (theme) => theme.palette.sidebar.selected.background
                    },
                }}
            >
                <MenuIcon sx={{ color: (theme) => theme.palette.grey[500], fontSize: '1rem' }}/>
            </IconButton>
        </Box>
    )
}

const SidebarContent = (props: any) => {
    const navItems = NavItems();
    const authUser = useSelector((state: any) => state.AuthReducer.authUser);
    const authRoles = (authUser?.role_set || []).map((i: any) => i.name);
    const theme = useTheme()?.['name'];

    // const allowedItems = navItems.filter((i: any) => !i.allow_roles.length || i.allow_roles.some((j: any) => authRoles.includes(j)));
    const allowedItems = filterAllowedItems(navItems, authRoles);
    const [selectedGroup, setSelectedGroup] = useState('');

    useEffect(() => {
        const selected = getSelectedItem(navItems);
        if (selected?.length === 1 && selected[0]?.parent?.name) {
            setSelectedGroup(selected[0].parent.name)
        }
    }, []);

    return (
        <SimpleBar style={{ maxHeight: '100%', overflowX: 'hidden' }}>
            {(theme === 'theme1' && !props?.isMobileNav) && <SidebarHeader {...props}/>}
            {allowedItems?.length > 0 ? (
                <List sx={{ py: 0 }}>
                    {allowedItems.map((item: any, i: number) => 
                        <React.Fragment key={i}>
                            {item.isGroupLabel ? <NavGroup group={item} selectedGroup={selectedGroup} {...props} /> : <NavItem item={item} key={item.name} {...props} />}
                        </React.Fragment>
                    )}
                </List>
            ) : (
                <Alert severity='error' sx={{ m: props?.open ? 2 : 0, px: props?.open ? 2 : 2.5 }}>{props?.open && <>No roles are assigned to your user account.</>}</Alert>
            )}
        </SimpleBar>
    )
}

export default SidebarContent;