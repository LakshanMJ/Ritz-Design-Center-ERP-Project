import React, { useEffect, useState } from "react"
import Button from "@mui/material/Button";
import { Box, Card, Divider, Grid, IconButton, Menu, MenuItem } from '@mui/material';
import { useRouter } from "next/router";
import * as RestUrls from '../../../helpers/constants/RestUrls';
import RitzModal from "@/components/Ritz/RitzModal";
import RitzTable from "@/components/Ritz/RitzTable";
import { ColumnDef } from "@tanstack/react-table";
import api from "@/services/api";
import DeleteIcon from '@mui/icons-material/Delete';
import TabContext from '@mui/lab/TabContext';
import RitzCheckBox from "@/components/Ritz/RitzCheckBox";
import DefaultLoader from "@/components/DefaultLoader";
import SaveSpinner from "@/components/SaveSpinner";
import { RitzTabPanel, RitzTabs } from "@/components/Ritz/RitzTabs";
import { DEFAULT_SUCCESS, VALIDATION_ERROR_CODE } from "@/helpers/constants/Constants";
import { toast } from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";
import RitzBreadcrumbs from "@/components/Ritz/RitzBreadcrumbs";
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { DeleteModal } from "../DeleteModal";

const AssignModal = ({ open, onClose, refreshData, user={}, roles=[], groups=[], assignType='' } : any) => {
    const [selected, setSelected] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState({});

    const handleOnChange = (event: any) => {
        const { value, checked } = event.target;
        if (checked) {
            setSelected([
                ...selected,
                { id: value?.toString() }
            ]);
        } else {
            let updated = [...selected].filter((i: any) => i.id?.toString() !== value?.toString());
            setSelected(updated);
        }
    }

    const handleSave = () => {
        setIsSaving(true);
        setErrors({});

        let payload;
        if (assignType === 'role') {
            payload = {
                role_set: selected.map((i: any) => i.id),
                groups: (user?.groups || []).map((i: any) => i.id)
            }   
        } else {
            payload = {
                role_set: (user?.role_set || []).map((i: any) => i.id),
                groups: selected.map((i: any) => i.id)
            }
        }
        
        api.put(RestUrls.userRoleGroupAddingURL(user.id), payload).then(resp => {
            toast.success(DEFAULT_SUCCESS);
            onClose();
            refreshData();
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
            if (error?.response?.status === VALIDATION_ERROR_CODE && error?.response?.data) {
                setErrors(error.response.data);
            }
        }).finally(() => {
            setIsSaving(false);
        });
    };
    
    useEffect(() => {
        if (assignType === 'role') {
            setSelected(user?.role_set || []);
        } else {
            setSelected(user?.groups || []);
        }
    }, [user]);

    return (
        <RitzModal open={open} onClose={onClose} title={`Assign User ${assignType === 'role' ? 'Role' : 'Group'}`}>
            <Box marginBottom={3}>
                <RitzCheckBox
                    id={'id'}
                    name={'name'}
                    isRequired={true}
                    options={assignType === 'role' ? roles : groups}
                    optionValue={'id'}
                    optionText={'name'}
                    row={true}
                    selectedValues={selected}
                    selectedOptionValue={'id'}
                    handleOnChange={handleOnChange}
                />
            </Box>
            {/* {Object.keys(errors)?.length > 0 && <FormErrorMessage type='alert' message={errors} /> } */}
            <Box marginTop={3}>
                <Button onClick={handleSave} variant="contained" style={{ float: 'right' }} disabled={isSaving}>
                    {isSaving && <SaveSpinner />}Assign
                </Button>
            </Box>
        </RitzModal>
    )
}

const UserProfileView = () => {
    const router = useRouter();
    const userId = Array.isArray(router.query.id) ? parseInt(router.query.id[0]) : parseInt(router.query.id);
    const [user, setUser] = useState({ id: 0, first_name: "", last_name: "", email: "", username: "", groups: [], role_set: [] });
    const [groups, setGroups] = useState<any>([]);
    const [roles, setRoles] = useState<any>([]);
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [assignType, setAssignType] = useState('');
    const [deleteData, setDeleteData] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [tabState, setTabState] = useState('1');
    const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
    const menuOpen = Boolean(menuAnchorEl);

    const rolesColumns: ColumnDef<any>[] = [
        {
            accessorKey: 'name',
            header: 'Role',
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
                    onClick={() => handleDelete('role', props.row.original)}
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
    }

    const handleManageClick = (event: React.MouseEvent<HTMLElement>) => {
        setMenuAnchorEl(event.currentTarget);
    }

    const handleAssignClick = (type: string) => {
        setAssignType(type);
        setMenuAnchorEl(null);
        setAssignModalOpen(true);
    }

    const fetchData = () => {
        setIsLoading(true);
        Promise.all([
            api.get(RestUrls.userURL(userId)),
            api.get(RestUrls.userGroupsURL()),
            api.get(RestUrls.userRolesURL())
        ]).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [user, groups, roles] = respData;
            setUser({
                ...user,
                id: userId
            });
            setGroups(groups);
            setRoles(roles);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    }

    useEffect(() => {
        if (userId) {
            fetchData();
        }
    }, [userId]);

    useEffect(() => {
        const { tab } = router.query;
        if (tab) {
            setTabState(tab.toString());
        }
    }, [router.query]);

    return (
        isLoading ? <DefaultLoader /> : (
        <>
            <RitzBreadcrumbs
                items={[
                    { url: '/admin/user', label: 'Users' },
                    { label: 'User Details' }
                ]}
                title={user?.username}
            />

            <Card variant='outlined' sx={{ mb: 2 }}>
                <Grid container columnSpacing={2} px={2}>
                    <Grid item sm={4} xs={6}>
                        <dl>
                            <dt>First name</dt>
                            <dd>{user?.first_name || '--'}</dd>
                            <dt style={{ marginTop: 5 }}>Last name</dt>
                            <dd>{user?.last_name || '--'}</dd>
                        </dl>
                    </Grid>
                    <Divider orientation='vertical' variant='middle' flexItem />
                    <Grid item sm={4} xs={6}>
                        <dl>
                            <dt>Email</dt>
                            <dd>{user?.email || '--'}</dd>
                            <dt style={{ marginTop: 5 }}>Username</dt>
                            <dd>{user?.username || '--'}</dd>
                        </dl>
                    </Grid>
                </Grid>
            </Card>

            <TabContext value={tabState}>
                <Box sx={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                    <RitzTabs tabs={['Roles', 'Groups']} activeTab={tabState} emitChange={handleChangeTabs} />
                    <Box sx={{ position: 'absolute', right: 0 }}>
                        <Button
                            variant='outlined'
                            onClick={handleManageClick}
                            endIcon={<KeyboardArrowDownIcon />}
                        >
                            Manage User
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
                            <MenuItem onClick={() => handleAssignClick('role')}>
                                Assign Roles
                            </MenuItem>
                            <MenuItem  onClick={() => handleAssignClick('group')}>
                                Assign Groups
                            </MenuItem>
                        </Menu>
                    </Box>
                </Box>

                <RitzTabPanel value='1' sx={{ pt: 2 }}>
                    <RitzTable
                        title="Assigned Roles"
                        data={user?.role_set || []}
                        columns={rolesColumns}
                        border={false}
                    />
                </RitzTabPanel>

                <RitzTabPanel value='2' sx={{ pt: 2 }}>
                    <RitzTable
                        title="Assigned Groups"
                        data={user?.groups || []}
                        columns={groupsColumns}
                        border={false}
                    />
                </RitzTabPanel>
            </TabContext>

            {assignModalOpen && (
                <AssignModal
                    open={assignModalOpen}
                    onClose={() => setAssignModalOpen(false)}
                    refreshData={fetchData}
                    user={user}
                    roles={roles}
                    groups={groups}
                    assignType={assignType}
                />
            )}

            {deleteModalOpen && (
                <DeleteModal
                    open={deleteModalOpen}
                    onClose={() => setDeleteModalOpen(false)}
                    refreshData={fetchData}
                    page='user'
                    deleteId={user?.id}
                    deleteData={deleteData}
                />
            )}
        </>
        )
    );
};

export default UserProfileView;
