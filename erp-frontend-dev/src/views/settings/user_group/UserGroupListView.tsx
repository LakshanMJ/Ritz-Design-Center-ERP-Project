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
import { userGroupViewURL } from "../../../helpers/constants/FrontEndUrls";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";


const GroupListView = () => {

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: 'name',
            header: 'Group Name',
            cell: (props: any) => (
                <Link component={NextLink} href={userGroupViewURL(props.row.getValue('id'))}>{props.row.getValue('name') ?? ''}</Link>
            )
        },
        {
            accessorKey: "id",
            header: 'Edit',
            enableSorting: false,
            enableColumnFilter: false,
            enableGlobalFilter: false,
            cell: props => (
                <IconButton size='small' color='primary' onClick={() => modalOpen(true, "Edit Group", props.getValue())}>
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
    const [group, setGroup] = useState({ id: 0, name: "" });
    const [errors, setErrors] = useState<any>({});
    const [editGroupId, setEditGroupId] = useState(0);
    const [groups, setGroups] = useState<any>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalLoading, setIsModalLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);


    const handleChange = (event: any) => {
        setGroup({
            ...group,
            [event?.target?.name]: event?.target?.value,
        });
    };

    const formFields: any[] = [
        { label: 'Group Name', name: 'name', value: group?.name || '', type: 'text', onChange: handleChange },
    ]

    const modalOpen = (isOpen: any, title: string, groupId: any) => {
        setTitle(title);
        setEditGroupId(groupId);
        setOpen(isOpen);

        if (groupId === 0) {
            setGroup({ id: 0, name: '' });
        } else {
            setIsModalLoading(true);
            api.get(RestUrls.userGroupURL(groupId)).then(resp => {
                const reseditdata = resp?.data || {};
                setGroup({ ...reseditdata });
            }).catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            }).finally(() => setIsModalLoading(false));
        }
    };

    const modalClose = () => {
        setOpen(false);
        setErrors({});
    };

    const getGroups = () => {
        setIsLoading(true);
        api.get(RestUrls.userGroupsURL()).then(resp => {
            const resdata = resp?.data || [];
            setGroups([...resdata]);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    };

    const handleSave = () => {
        setIsSaving(true);
        setErrors({});

        const request = {
            method: editGroupId === 0 ? 'post' : 'put',
            url: editGroupId === 0 ? RestUrls.createUserGroupURL() : RestUrls.updateUserGroupURL(editGroupId),
            data: editGroupId === 0 ? group : { name: group.name }
        }

        api(request).then(() => {
            toast.success(DEFAULT_SUCCESS);
            setOpen(false);
            getGroups();
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
            if (error?.response?.data) {
                setErrors(error.response.data);
            }
        }).finally(() => setIsSaving(false));
    };

    useEffect(() => {
        getGroups();
    }, []);

    return (
        <>
            <Typography variant='h1'>User Groups</Typography>

            {isLoading ? <DefaultLoader /> : <>
                <Button variant="contained" onClick={() => { modalOpen(true, "Create New Group", 0) }}>Add Group</Button>
                <RitzTable
                    data={groups}
                    columns={columns}
                />
            </>}

            <RitzModal open={open} onClose={modalClose} title={title} isLoading={isModalLoading}>
                <RitzGenericForm fields={formFields} onSumbit={handleSave} submitId={editGroupId} errors={errors} isSaving={isSaving} />
            </RitzModal>
        </>
    );
};

export default GroupListView;
