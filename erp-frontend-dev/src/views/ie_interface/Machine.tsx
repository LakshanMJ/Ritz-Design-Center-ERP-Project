import React, { useEffect, useState } from 'react'
import Button from '@mui/material/Button';
import EditIcon from '@mui/icons-material/Edit';
import { IconButton, Typography } from '@mui/material';
import * as RestUrls from '../../helpers/constants/RestUrls';
import { ACTIVE_STATUS, INACTIVE_STATUS } from '@/helpers/constants/Constants';
import RitzModal from '@/components/Ritz/RitzModal';
import RitzGenericForm from '@/components/Ritz/RitzGenericForm';
import RitzTable from '@/components/Ritz/RitzTable';
import { ColumnDef } from '@tanstack/react-table';
import api from '@/services/api';
import DefaultLoader from '@/components/DefaultLoader';
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';


const MachineListView = () => {

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: 'name',
            header: 'Machine',
        },
        {
            accessorKey: 'short_name',
            header: 'Machine Short Name',
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
                <IconButton size='small' color='primary' onClick={() => modalOpen(true, 'Edit Machine', props.getValue())}>
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
    const [machine, setMachine] = useState({ id: 0, name: '', short_name: '', active: true });
    const [editMachineId, setEditMachineId] = useState(0);
    const [machines, setMachines] = useState<any>([]);
    const [errors, setErrors] = useState<any>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isModalLoading, setIsModalLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);


    const handleChange = (event: any) => {
        setMachine({
            ...machine,
            [event?.target?.name]: event?.target?.value,
        });
    };

    const handleChangeChacked = (event: any) => {
        setMachine({
            ...machine,
            [event?.target?.name]: event?.target?.checked,
        });
    };

    const formFields: any[] = [
        { label: 'Machine Name', name: 'name', value: machine?.name || '', type: 'text', onChange: handleChange },
        { label: 'Machine Short Name', name: 'short_name', value: machine?.short_name || '', type: 'text', onChange: handleChange },
        { label: 'Status', name: 'active', value: machine?.active, type: 'switch', onChange: handleChangeChacked },
    ];

    const modalOpen = (isOpen: any, title: string, machineId: any) => {
        setEditMachineId(machineId);
        setTitle(title);
        setOpen(isOpen);

        if (machineId === 0) {
            setMachine({ id: 0, name: '', short_name: '', active: true });
        } else {
            setIsModalLoading(true);

            api.get(RestUrls.machineURL(machineId)).then(resp => {
                const reseditdata = resp?.data || {};
                setMachine({ ...reseditdata });
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

    const getMachines = () => {
        setIsLoading(true);
        api.get(RestUrls.machinesURL()).then(resp => {
            const resdata = resp?.data || [];
            setMachines([...resdata]);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    };

    const handleSave = () => {
        setIsSaving(true);
        setErrors({});

        const request = {
            method: editMachineId === 0 ? 'post' : 'put',
            url: editMachineId === 0 ? RestUrls.createMachineURL() : RestUrls.updateMachineURL(editMachineId),
            data: machine
        };

        api(request).then(() => {
            setOpen(false);
            getMachines();
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
        getMachines();
    }, []);


    return (
        <>
            <Typography variant='h1'>Machine List</Typography>
            {isLoading ? <DefaultLoader /> : <>
                <Button variant='contained' onClick={() => { modalOpen(true, 'Create Machine', 0) }}>Add Machine</Button>

                <RitzTable data={machines} columns={columns} />
            </>}

            <RitzModal open={open} onClose={modalClose} title={title} isLoading={isModalLoading}>
                <RitzGenericForm fields={formFields} onSumbit={handleSave} submitId={editMachineId} errors={errors} isSaving={isSaving} />
            </RitzModal>
        </>
    );
};
export default MachineListView;