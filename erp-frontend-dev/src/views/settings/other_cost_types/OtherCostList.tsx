import React, { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import EditIcon from '@mui/icons-material/Edit';
import { IconButton, Link, Typography } from '@mui/material';
import { ACTIVE_STATUS, INACTIVE_STATUS } from "@/helpers/constants/Constants";
import RitzModal from "@/components/Ritz/RitzModal";
import RitzGenericForm from "@/components/Ritz/RitzGenericForm";
import RitzTable from "@/components/Ritz/RitzTable";
import { ColumnDef } from "@tanstack/react-table";
import api from "@/services/api";
import DefaultLoader from "@/components/DefaultLoader";
import NextLink from 'next/link';
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import { otherCostTypesURL, getDetailOtherCostTypeURL} from "@/helpers/constants/rest_urls/CostingUrls";

const OtherCostTypes = () => {

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: 'name',
            header: 'Other Cost Type',
            cell: props => (
                <Link component={NextLink} href={'#'}>{props.row.getValue('name') ?? ''}</Link>
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
    const [otherCostType, setOtherCost] = useState({ id: 0, name: '', active: true });
    const [editOtherCostTypeId, setEditOtherCostTypeId] = useState(0);
    const [otherCostTypes, seOtherCostTypes] = useState<any>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalLoading, setIsModalLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState({});

    const handleChange = (event: any) => {
        setOtherCost({
            ...otherCostType,
            [event?.target?.name]: event?.target?.value,
        });
    };

    const handleChangeChacked = (event: any) => {
        setOtherCost({
            ...otherCostType,
            [event?.target?.name]: event?.target?.checked,
        });
    };

    const formFields: any[] = [
        { label: 'Other Cost Name', name: 'name', value: otherCostType?.name || '', type: 'text', onChange: handleChange },
        { label: 'Status', name: 'active', value: otherCostType?.active, type: 'switch', onChange: handleChangeChacked },
    ];

    const modalOpen = (isOpen: any, title: string, otherCostTypeId: any) => {
        setEditOtherCostTypeId(otherCostTypeId);
        setTitle(title);
        setOpen(isOpen);

        if (otherCostTypeId === 0) {
            setOtherCost({ id: 0, name: '', active: true });
        } else {
            setIsModalLoading(true);

            api.get(getDetailOtherCostTypeURL(otherCostTypeId)).then(resp => {
                const reseditdata = resp?.data || {};
                setOtherCost({ ...reseditdata });
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

    const getOtherCostTypeList = () => {
        setIsLoading(true);
        api.get(otherCostTypesURL()).then(resp => {
            const resdata = resp?.data || [];
            seOtherCostTypes([...resdata]);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    };

    const handleSave = () => {
        setIsSaving(true);
        setErrors({});

        const request = {
            method: editOtherCostTypeId === 0 ? 'post' : 'put',
            url: editOtherCostTypeId === 0 ? otherCostTypesURL() : getDetailOtherCostTypeURL(editOtherCostTypeId),
            data: otherCostType
        };

        api(request).then(() => {
            setOpen(false);
            getOtherCostTypeList();
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
        getOtherCostTypeList();
    }, []);

    return (
        <>
            <Typography variant='h1'>Other Cost Types</Typography>

            {isLoading ? <DefaultLoader /> : <>
                <Button variant="contained" onClick={() => { modalOpen(true, "Create Other Cost", 0) }}>Add Other Cost</Button>
                <RitzTable
                    data={otherCostTypes}
                    columns={columns}
                />
            </>}

            <RitzModal open={open} onClose={modalClose} title={title} isLoading={isModalLoading}>
                <RitzGenericForm fields={formFields} onSumbit={handleSave} submitId={editOtherCostTypeId} errors={errors} isSaving={isSaving} />
            </RitzModal>
        </>
    );
};

export default OtherCostTypes;
