import React, { useEffect, useState } from "react"
import Button from "@mui/material/Button";
import EditIcon from '@mui/icons-material/Edit';
import { IconButton, Typography } from '@mui/material';
import * as RestUrls from '../../helpers/constants/RestUrls';
import { ACTIVE_STATUS, INACTIVE_STATUS } from "@/helpers/constants/Constants";
import RitzModal from "@/components/Ritz/RitzModal";
import RitzGenericForm from "@/components/Ritz/RitzGenericForm";
import RitzTable from "@/components/Ritz/RitzTable";
import { ColumnDef } from "@tanstack/react-table";
import api from "@/services/api";
import DefaultLoader from "@/components/DefaultLoader";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';


const FolderListView = () => {

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: 'name',
            header: 'Folder',
        },
        {
            accessorKey: 'active',
            header: 'Status',
            accessorFn: (row: any) => row['active'] ? ACTIVE_STATUS : INACTIVE_STATUS
        },
        {
            accessorKey: 'id',
            header: 'Action',
            enableSorting: false,
            enableColumnFilter: false,
            enableGlobalFilter: false,
            cell: props => (
                <IconButton size='small' color='primary' onClick={() => modalOpen(true, "Edit Folder", props.getValue())}>
                    <EditIcon fontSize='inherit' />
                </IconButton>
            ),
            meta: {
                align: 'center',
                width: 100
            }
        }
    ]

    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState<string>();
    const [folder, setFolder] = useState({ id: 0, name: '', active: true });
    const [editFolderId, setEditFolderId] = useState(0);
    const [folders, setFolders] = useState<any>([]);
    const [errors, setErrors] = useState<any>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isModalLoading, setIsModalLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);


    const handleChange = (event: any) => {
        setFolder({
            ...folder,
            [event?.target?.name]: event?.target?.value,
        });
    };

    const handleChangeChacked = (event: any) => {
        setFolder({
            ...folder,
            [event?.target?.name]: event?.target?.checked,
        });
    };

    const formFields: any[] = [
        { label: 'Folder Name', name: 'name', value: folder?.name || '', type: 'text', onChange: handleChange },
        { label: 'Status', name: 'active', value: folder?.active, type: 'switch', onChange: handleChangeChacked },
    ];

    const modalOpen = (isOpen: any, title: string, folderId: any) => {
        setEditFolderId(folderId);
        setTitle(title);
        setOpen(isOpen);

        if (folderId === 0) {
            setFolder({ id: 0, name: "", active: true });
        } else {
            setIsModalLoading(true);

            api.get(RestUrls.folderURL(folderId)).then(resp => {
                const reseditdata = resp?.data || {};
                setFolder({ ...reseditdata });
            }).catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            }).finally(() => {
                setIsModalLoading(false);
            });
        }
    };

    const modalClose = () => {
        setOpen(false);
        setErrors({});
    };

    const getFolders = () => {
        setIsLoading(true);
        api.get(RestUrls.foldersURL()).then(resp => {
            const resdata = resp?.data || [];
            setFolders([...resdata]);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    };

    const handleSave = () => {
        setIsSaving(true);
        setErrors({});

        const request = {
            method: editFolderId === 0 ? 'post' : 'put',
            url: editFolderId === 0 ? RestUrls.createFolderURL() : RestUrls.updateFolderURL(editFolderId),
            data: folder
        };

        api(request).then(() => {
            setOpen(false);
            getFolders();
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
            if (error?.response?.data) {
                setErrors(error.response.data);
            }
        }).finally(() => {
            setIsSaving(false);
        });
    };

    useEffect(() => {
        getFolders();
    }, []);


    return (
        <>
            <Typography variant='h1'>Folder List</Typography>
            {isLoading ? <DefaultLoader /> : <>
                <Button variant="contained" onClick={() => { modalOpen(true, "Create Folder", 0) }}>Add Folder</Button>

                <RitzTable data={folders} columns={columns} />
            </>}

            <RitzModal open={open} onClose={modalClose} title={title} isLoading={isModalLoading}>
                <RitzGenericForm fields={formFields} onSumbit={handleSave} submitId={editFolderId} errors={errors} isSaving={isSaving} />
            </RitzModal>
        </>
    );
};
export default FolderListView;