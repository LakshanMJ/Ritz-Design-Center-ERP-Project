import React, { useEffect, useState } from "react"
import Button from "@mui/material/Button";
import EditIcon from '@mui/icons-material/Edit';
import { IconButton, Link, Typography } from '@mui/material';
import * as RestUrls from '../../../helpers/constants/RestUrls';
import RitzModal from "@/components/Ritz/RitzModal";
import RitzGenericForm from "@/components/Ritz/RitzGenericForm";
import RitzTable from "@/components/Ritz/RitzTable";
import { ColumnDef } from "@tanstack/react-table";
import api from "@/services/api";
import NextLink from 'next/link';
import DefaultLoader from "@/components/DefaultLoader";
import { userRoleViewURL } from "../../../helpers/constants/FrontEndUrls";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";


const RoleListView = () => {

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: 'name',
            header: 'Role Name',
            cell: (props: any) => (
                <Link component={NextLink} href={userRoleViewURL(props.row.getValue('id'))}>{props.getValue() ?? ''}</Link>
            )
        },
        {
            accessorKey: "id",
            header: 'Edit',
            enableSorting: false,
            enableColumnFilter: false,
            enableGlobalFilter: false,
            cell: props => (
                <IconButton size='small' color='primary' onClick={() => modalOpen(true, "Edit Role", props.getValue())}>
                    <EditIcon fontSize='inherit' />
                </IconButton>
            ),
            meta: {
                align: 'center',
                width: 100
            }
        }
    ];

    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState<string>();
    const [role, setRole] = useState({ id: 0, name: "" });
    const [errors, setErrors] = useState<any>({});
    const [editRoleId, setEditRoleId] = useState(0);
    const [roles, setRoles] = useState<any>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalLoading, setIsModalLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);


    const handleChange = (event: any) => {
        setRole({
            ...role,
            [event?.target?.name]: event?.target?.value,
        });
    };

    const formFields: any[] = [
        { label: 'Role Name', name: 'name', value: role?.name || '', type: 'text', onChange: handleChange },
    ]

    const modalOpen = (isOpen: any, title: string, roleId: any) => {
        setTitle(title);
        setEditRoleId(roleId);
        setOpen(isOpen);

        if (roleId === 0) {
            setRole({ id: 0, name: '' });
        } else {
            setIsModalLoading(true);
            api.get(RestUrls.userRoleURL(roleId)).then(resp => {
                const reseditdata = resp?.data || {};
                setRole({ ...reseditdata });
            }).catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            }).finally(() => setIsModalLoading(false));
        }
    };

    const modalClose = () => {
        setOpen(false);
        setErrors({});
    };

    const getRoles = () => {
        setIsLoading(true);

        api.get(RestUrls.userRolesURL()).then(resp => {
            const resdata = resp?.data || [];
            setRoles([...resdata]);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    };

    const handleSave = () => {
        setIsSaving(true);
        setErrors({});

        const request = {
            method: editRoleId === 0 ? 'post' : 'put',
            url: editRoleId === 0 ? RestUrls.createUserRoleURL() : RestUrls.updateUserRoleURL(editRoleId),
            data: role
        }

        api(request).then(() => {
            toast.success(DEFAULT_SUCCESS);
            setOpen(false);
            getRoles();
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
            if (error?.response?.data) {
                setErrors(error.response.data);
            }
        }).finally(() => setIsSaving(false));
    };

    useEffect(() => {
        getRoles();
    }, []);


    return (
        <>
            <Typography variant='h1'>User Roles</Typography>

            {isLoading ? <DefaultLoader /> : <>
                <Button variant="contained" onClick={() => { modalOpen(true, "Create New Role", 0) }}>Add Role</Button>
                <RitzTable
                    data={roles}
                    columns={columns}
                />
            </>}

            <RitzModal open={open} onClose={modalClose} title={title} isLoading={isModalLoading}>
                <RitzGenericForm fields={formFields} onSumbit={handleSave} submitId={editRoleId} errors={errors} isSaving={isSaving} />
            </RitzModal>
        </>
    );
};

export default RoleListView;