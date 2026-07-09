import React, { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import EditIcon from '@mui/icons-material/Edit';
import { IconButton, Link, Typography } from '@mui/material';
import * as RestUrls from '../../../helpers/constants/RestUrls';
import { ACTIVE_STATUS, INACTIVE_STATUS } from "@/helpers/constants/Constants";
import RitzModal from "@/components/Ritz/RitzModal";
import RitzGenericForm from "@/components/Ritz/RitzGenericForm";
import RitzTable from "@/components/Ritz/RitzTable";
import { ColumnDef } from "@tanstack/react-table";
import api from "@/services/api";
import DefaultLoader from "@/components/DefaultLoader";
import NextLink from 'next/link';
import { embellishmentDetailURL } from "@/helpers/constants/FrontEndUrls";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import {getDetailEmbellishmentTypeURL, createEmbellishmentTypeURL, updateEmbellishmentTypeURL} from "@/helpers/constants/rest_urls/CostingUrls";


const Embellishment = () => {

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: 'name',
            header: 'Embellishment',
            cell: props => (
                <Link component={NextLink} href={embellishmentDetailURL(props.row.getValue('id'))}>{props.row.getValue('name') ?? ''}</Link>
            )
        },
        {
            accessorKey: 'active',
            header: 'Status',
            accessorFn: (row: any) => row['active'] ? ACTIVE_STATUS : INACTIVE_STATUS
        },
        {
            accessorKey: "id",
            header: 'Action',
            enableSorting: false,
            enableColumnFilter: false,
            enableGlobalFilter: false,
            cell: props => (
                <IconButton size='small' color='primary' onClick={() => modalOpen(true, "Edit Embellishment", props.getValue())}>
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
    const [embellishment, setEmbellishment] = useState({ id: 0, name: '', active: true });
    const [editEmbellishmentTypeId, setEditEmbellishmentTypeId] = useState(0);
    const [embellishmentTypes, setEmbellishmentTypes] = useState<any>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalLoading, setIsModalLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState({});

    const handleChange = (event: any) => {
        setEmbellishment({
            ...embellishment,
            [event?.target?.name]: event?.target?.value,
        });
    };

    const handleChangeChacked = (event: any) => {
        setEmbellishment({
            ...embellishment,
            [event?.target?.name]: event?.target?.checked,
        });
    };

    const formFields: any[] = [
        { label: 'Embellishment Name', name: 'name', value: embellishment?.name || '', type: 'text', onChange: handleChange },
        { label: 'Status', name: 'active', value: embellishment?.active, type: 'switch', onChange: handleChangeChacked },
    ];

    const modalOpen = (isOpen: any, title: string, embellishmentId: any) => {
        setEditEmbellishmentTypeId(embellishmentId);
        setTitle(title);
        setOpen(isOpen);

        if (embellishmentId === 0) {
            setEmbellishment({ id: 0, name: '', active: true });
        } else {
            setIsModalLoading(true);

            api.get(getDetailEmbellishmentTypeURL(embellishmentId)).then(resp => {
                const reseditdata = resp?.data || {};
                setEmbellishment({ ...reseditdata });
            }).catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            }).finally(() => {
                setIsModalLoading(false);
            });
        }
    };

    const modalClose = () => {
        setErrors({});
        setOpen(false);
    };

    const getEmbellishmentList = () => {
        setIsLoading(true);
        api.get(createEmbellishmentTypeURL()).then(resp => {
            const resdata = resp?.data || [];
            setEmbellishmentTypes([...resdata]);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    };

    const handleSave = () => {
        setIsSaving(true);
        setErrors({});

        const request = {
            method: editEmbellishmentTypeId === 0 ? 'post' : 'put',
            url: editEmbellishmentTypeId === 0 ? createEmbellishmentTypeURL() : updateEmbellishmentTypeURL(editEmbellishmentTypeId),
            data: embellishment
        };

        api(request).then(() => {
            setOpen(false);
            getEmbellishmentList();
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
            if (error?.response?.data) {
                setErrors(error.response.data);
            }
        }).finally(() => {
            setIsSaving(false);
        });
    }

    useEffect(() => {
        getEmbellishmentList();
    }, []);

    return (
        <>
            <Typography variant='h1'>Embellishment List</Typography>

            {isLoading ? <DefaultLoader /> : <>
                <Button variant="contained" onClick={() => { modalOpen(true, "Create Embellishment", 0) }}>Add Embellishment</Button>
                <RitzTable
                    data={embellishmentTypes}
                    columns={columns}
                />
            </>}

            <RitzModal open={open} onClose={modalClose} title={title} isLoading={isModalLoading}>
                <RitzGenericForm fields={formFields} onSumbit={handleSave} submitId={editEmbellishmentTypeId} errors={errors} isSaving={isSaving} />
            </RitzModal>
        </>
    );
};

export default Embellishment;
