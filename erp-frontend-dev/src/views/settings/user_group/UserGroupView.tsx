import React, { useEffect, useState } from "react"
import Button from "@mui/material/Button";
import { Box, IconButton, Link, Menu, MenuItem } from '@mui/material';
import { useRouter } from "next/router";
import * as RestUrls from '../../../helpers/constants/RestUrls';
import RitzModal from "@/components/Ritz/RitzModal";
import RitzTable from "@/components/Ritz/RitzTable";
import { ColumnDef } from "@tanstack/react-table";
import api from "@/services/api";
import DeleteIcon from '@mui/icons-material/Delete';
import NextLink from 'next/link';
import TabContext from '@mui/lab/TabContext';
import RitzCheckBox from "@/components/Ritz/RitzCheckBox";
import DefaultLoader from "@/components/DefaultLoader";
import { userProfileURL } from "../../../helpers/constants/FrontEndUrls";
import SaveSpinner from "@/components/SaveSpinner";
import { RitzTabPanel, RitzTabs } from "@/components/Ritz/RitzTabs";
import { DEFAULT_SUCCESS, VALIDATION_ERROR_CODE } from "@/helpers/constants/Constants";
import { toast } from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";
import RitzBreadcrumbs from "@/components/Ritz/RitzBreadcrumbs";
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { DeleteModal } from "../DeleteModal";


const AssignModal = ({ open, onClose, refreshData, group={}, roles=[] } : any) => {
    const [selected, setSelected] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState({});

    const handleOnChangeRole = (event: any) => {
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

    const handleSaveRole = () => {
        setIsSaving(true);
        setErrors({});

        const payload = {
            role_set: selected.map((i: any) => i.id),
            name: group?.name
        }
        
        api.put(RestUrls.updateUserGroupURL(group.id), payload).then(resp => {
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
        setSelected(group?.role_set || []);
    }, [roles]);

    return (
        <RitzModal open={open} onClose={onClose} title='Assign User Role'>
            <Box marginBottom={3}>
                <RitzCheckBox
                    id={'id'}
                    name={'name'}
                    isRequired={true}
                    options={roles}
                    optionValue={'id'}
                    optionText={'name'}
                    // labelText={"Role names:"}
                    row={true}
                    selectedValues={selected}
                    selectedOptionValue={'id'}
                    handleOnChange={handleOnChangeRole}
                />
            </Box>
            {/* {Object.keys(errors)?.length > 0 && <FormErrorMessage type='alert' message={errors} /> } */}
            <Box marginTop={3}>
                <Button onClick={handleSaveRole} variant="contained" style={{ float: 'right' }} disabled={isSaving}>
                    {isSaving && <SaveSpinner />}Assign
                </Button>
            </Box>
        </RitzModal>
    )
}

const UserGroupView = () => {
    const router = useRouter();
    const userGroupId = Array.isArray(router.query.id) ? parseInt(router.query.id[0]) : parseInt(router.query.id);
    const [group, setGroup] = useState({ id: 0, name: "", user_set: [], role_set: [] });
    const [roles, setRoles] = useState<any>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = React.useState('1');
    const [deleteData, setDeleteData] = useState({});
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [openAssignModal, setOpenAssignModal] = useState(false);
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

    const usersColumns: ColumnDef<any>[] = [
        {
            accessorKey: 'username',
            header: 'Username',
            cell: props => (
                <Link component={NextLink} href={userProfileURL(props.row.getValue('id'))}>{props.row.getValue('username') ?? ''}</Link>
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
        setOpenDeleteModal(true);
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

    const fetchData = () => {
        setIsLoading(true);

        Promise.all([
            api.get(RestUrls.userGroupURL(+userGroupId)),
            api.get(RestUrls.userRolesURL())
        ]).then(resp => {
            const respData = resp.map((d: any) => d.data);
            const [group, roles] = respData;
            setGroup(group || {});
            setRoles(roles || []);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    }

    useEffect(() => {
        if (userGroupId) {
            fetchData();
        }
    }, [userGroupId]);

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
                    { url: '/admin/user_group', label: 'User Groups' },
                    { label: 'Group Details' }
                ]}
                title={group?.name}
            />

            <TabContext value={activeTab}>
                <Box sx={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                    <RitzTabs tabs={['Roles', 'Users']} activeTab={activeTab} emitChange={handleChangeTabs} />
                    <Box sx={{ position: 'absolute', right: 0 }}>
                        <Button
                            variant='outlined'
                            onClick={handleManageClick}
                            endIcon={<KeyboardArrowDownIcon />}
                        >
                            Manage Group
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
                            <MenuItem onClick={() => {setOpenAssignModal(true), setMenuAnchorEl(null)}}>
                                Assign Roles
                            </MenuItem>
                            {/* <MenuItem disabled>
                                Assign Users
                            </MenuItem> */}
                        </Menu>
                    </Box>
                </Box>

                <RitzTabPanel value="1" sx={{ pt: 2 }}>
                    <RitzTable
                        title="Assigned Roles"
                        data={group?.role_set || []}
                        columns={rolesColumns}
                        border={false}
                    />
                </RitzTabPanel>

                <RitzTabPanel value="2" sx={{ pt: 2 }}>
                    <RitzTable
                        title="Assigned Users"
                        data={group?.user_set || []}
                        columns={usersColumns}
                        border={false}
                    />
                </RitzTabPanel>
            </TabContext>

            {openAssignModal && (
                <AssignModal
                    open={openAssignModal}
                    onClose={() => setOpenAssignModal(false)}
                    refreshData={fetchData}
                    group={group}
                    roles={roles}
                />
            )}

            {openDeleteModal && (
                <DeleteModal
                    open={openDeleteModal}
                    onClose={() => setOpenDeleteModal(false)}
                    refreshData={fetchData}
                    deleteId={group?.id}
                    page='group'
                    deleteData={deleteData}
                />
            )}
        </>
        )
    )
}

export default UserGroupView;