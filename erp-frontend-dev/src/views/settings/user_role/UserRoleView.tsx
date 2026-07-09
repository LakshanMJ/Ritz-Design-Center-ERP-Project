import React, { useEffect, useState } from "react"
import { Box, Button, IconButton, Link, Menu, MenuItem } from '@mui/material';
import { useRouter } from "next/router";
import * as RestUrls from '../../../helpers/constants/RestUrls';
import RitzTable from "@/components/Ritz/RitzTable";
import { ColumnDef } from "@tanstack/react-table";
import api from "@/services/api";
import DeleteIcon from '@mui/icons-material/Delete';
import NextLink from 'next/link';
import TabContext from '@mui/lab/TabContext';
import DefaultLoader from "@/components/DefaultLoader";
import { userProfileURL } from "../../../helpers/constants/FrontEndUrls";
import { RitzTabPanel, RitzTabs } from "@/components/Ritz/RitzTabs";
import { toast } from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";
import RitzBreadcrumbs from "@/components/Ritz/RitzBreadcrumbs";
import { DeleteModal } from "../DeleteModal";
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

const UserRoleView = () => {
    const router = useRouter();
    let userRoleId = Array.isArray(router.query.id) ? parseInt(router.query.id[0]) : parseInt(router.query.id);

    const [role, setRole] = useState({ id: 0, name: "", users: [], groups: [] });
    const [users, setUsers] = useState([]);
    const [groups, setGroups] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('1');
    const [assignData, setAssignData] = useState({});
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [deleteData, setDeleteData] = useState({});
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
    const menuOpen = Boolean(menuAnchorEl);

    const groupsColumns: ColumnDef<any>[] = [
        {
            accessorKey: 'name',
            header: 'Group',
        },
        {
            accessorKey: "id",
            header: 'Delete',
            enableSorting: false,
            enableColumnFilter: false,
            enableGlobalFilter: false,
            cell: props => (
                <IconButton
                    size='small'
                    color='error'
                    onClick={() => handleDelete('group', props.row.original)}
                >
                    <DeleteIcon fontSize='inherit' />
                </IconButton>
            ),
            meta: {
                align: 'center',
                width: 100
            }
        }
    ];

    const usersColumns: ColumnDef<any>[] = [
        {
            accessorKey: 'name',
            header: 'Username',
            cell: props => (
                <Link component={NextLink} href={userProfileURL(props.row.getValue('id'))}>{props.row.getValue('name') ?? ''}</Link>
            )
        },
        {
            accessorKey: 'first_name',
            header: 'First Name',
            cell: props => props.row.getValue('first_name') ?? ''
        },
        {
            accessorKey: 'last_name',
            header: 'Last Name',
            cell: props => props.row.getValue('last_name') ?? ''
        },
        {
            accessorKey: 'email',
            header: 'Email',
            cell: props => props.row.getValue('email') ?? ''
        },
        {
            accessorKey: "id",
            header: 'Delete',
            enableSorting: false,
            enableColumnFilter: false,
            enableGlobalFilter: false,
            cell: props => (
                <IconButton
                    size='small'
                    color='error'
                    onClick={() => handleDelete('user', props.row.original)}
                >
                    <DeleteIcon fontSize='inherit' />
                </IconButton>
            ),
            meta: {
                align: 'center',
                width: 100
            }
        }
    ];

    const handleDelete = (type: string, data: any) => {
        setDeleteData({
            type: type,
            data: data
        });
        setDeleteModalOpen(true);
    }

    const handleChangeTabs = (event: string) => {
        const url = {
            pathname: router.pathname,
            query: {...router.query, tab: event}
        }
        router.replace(url, undefined, { shallow: true });
    };

    const handleManageClick = (event: React.MouseEvent<HTMLElement>) => {
        setMenuAnchorEl(event.currentTarget);
    };

    const handleAssignClick = (type: string) => {
        const selected = type === 'group' ? role?.groups : role?.users;
        const options = type === 'group' ? groups : users;

        setAssignData({
            id: userRoleId,
            type: type,
            selected: selected,
            options: options
        })
        setMenuAnchorEl(null);
        setAssignModalOpen(true);
    }

    const fetchData = () => {
        setIsLoading(true);

        Promise.all([
            api.get(RestUrls.userRoleURL(userRoleId)),
            api.get(RestUrls.usersURL()),
            api.get(RestUrls.userGroupsURL()),
        ]).then(resp => {
            const respData = resp.map((d: any) => d.data);
            const [role, users, groups] = respData;
            setRole(role || {});
            setUsers(users || []);
            setGroups(groups || []);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    }

    useEffect(() => {
        if (userRoleId) {
            fetchData();
        }
    }, [userRoleId]);

    useEffect(() => {
        const { tab } = router.query;
        if (tab) {
            setActiveTab(tab.toString());
        }
    }, [router.query]);


    return (
        isLoading ? <DefaultLoader /> : (
        <>
            <RitzBreadcrumbs 
                items={[
                    { url: '/admin/user_role', label: 'User Roles' },
                    { label: 'Role Details' }
                ]}
                title={role?.name}
            />
            
            <TabContext value={activeTab}>
                <Box sx={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                    <RitzTabs tabs={['Groups', 'Users']} activeTab={activeTab} emitChange={handleChangeTabs} />
                    {/* <Box sx={{ position: 'absolute', right: 0 }}>
                        <Button
                            variant='outlined'
                            onClick={handleManageClick}
                            endIcon={<KeyboardArrowDownIcon />}
                        >
                            Manage Role
                        </Button>
                        <Menu
                            anchorEl={menuAnchorEl}
                            open={menuOpen}
                            onClose={() => setMenuAnchorEl(null)}
                            anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'right',
                            }}
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                            }}
                        >
                            <MenuItem disabled>
                                Assign Groups
                            </MenuItem>
                            <MenuItem disabled>
                                Assign Users
                            </MenuItem>
                        </Menu>
                    </Box> */}
                </Box>

                <RitzTabPanel value="1" sx={{ pt: 2 }}>
                    <RitzTable
                        title="Assigned Groups"
                        data={role?.groups}
                        columns={groupsColumns}
                        border={false}
                    />
                </RitzTabPanel>

                <RitzTabPanel value="2" sx={{ pt: 2 }}>
                    <RitzTable
                        title="Assigned Users"
                        data={role?.users}
                        columns={usersColumns}
                        border={false}
                    />
                </RitzTabPanel>
            </TabContext>

            {deleteModalOpen && (
                <DeleteModal
                    open={deleteModalOpen}
                    onClose={() => setDeleteModalOpen(false)}
                    refreshData={fetchData}
                    page='role'
                    deleteId={role?.id}
                    deleteData={deleteData}
                />
            )}
        </>
        )
    );
};

export default UserRoleView;