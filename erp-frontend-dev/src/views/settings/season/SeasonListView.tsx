import React, { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import EditIcon from '@mui/icons-material/Edit';
import { IconButton, Typography } from '@mui/material';
import * as RestUrls from '../../../helpers/constants/RestUrls';
import { ACTIVE_STATUS, INACTIVE_STATUS } from "@/helpers/constants/Constants";
import RitzModal from "@/components/Ritz/RitzModal";
import RitzGenericForm from "@/components/Ritz/RitzGenericForm";
import RitzTable from "@/components/Ritz/RitzTable";
import { ColumnDef } from "@tanstack/react-table";
import api from "@/services/api";
import DefaultLoader from "@/components/DefaultLoader";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';


const SeasonListView = () => {
    const columns: ColumnDef<any>[] = [
        {
            accessorKey: 'name',
            header: 'Season',
        },
        {
            accessorKey: 'customer_brand_name',
            header: 'Customer and Brand',
        },
        {
            accessorKey: 'code',
            header: 'Code',
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
                <IconButton size='small' color='primary' onClick={() => modalOpen(true, "Edit Season", props.getValue())}>
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
    const [season, setSeason] = useState({ id: 0, name: '', code: "", customer_brand: 0, active: true });
    const [editSeasonId, setEditSeasonId] = useState(0);
    const [seasons, setSeasons] = useState<any>([]);
    const [customerBrandData, setCustomerBrandData] = useState<any>([]);
    const [errors, setErrors] = useState<any>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isModalLoading, setIsModalLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (event: any) => {
        setSeason({
            ...season,
            [event?.target?.name]: event?.target?.value,
        });
    };

    const handleChangeChacked = (event: any) => {
        setSeason({
            ...season,
            [event?.target?.name]: event?.target?.checked,
        });
    };

    const formFields: any[] = [
        { label: 'Season Name', name: 'name', value: season?.name || '', type: 'text', onChange: handleChange },
        { label: 'Customer & Brand', name: 'customer_brand', value: season?.customer_brand || '', type: 'select', optionText: 'customer_brand_name', optionValue: 'id', options: customerBrandData, onChange: handleChange },
        { label: 'Code', name: 'code', value: season?.code || '', type: 'text', onChange: handleChange },
        { label: 'Status', name: 'active', value: season?.active, type: 'switch', onChange: handleChangeChacked },
    ];

    const modalOpen = (isOpen: any, title: string, seasonId: any) => {
        setTitle(title);
        setEditSeasonId(seasonId);
        setOpen(isOpen);

        if (seasonId === 0) {
            setSeason({ id: 0, name: "", code: "", customer_brand: 0,  active: true });
        } else {
            setIsModalLoading(true);
            api.get(RestUrls.seasonURL(seasonId)).then(resp => {
                const reseditdata = resp?.data || {};
                setSeason({ ...reseditdata });
            }).catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            }).finally(() => setIsModalLoading(false));
        }
    };

    const modalClose = () => {
        setOpen(false);
        setErrors({});
    };

    const getData = () => {
        setIsLoading(true);
        Promise.all([
            api.get(RestUrls.seasonsURL()),
            api.get(RestUrls.customerBrandListURL())   
        ]).then(resp => {
            const [seasonsList, customerBrandData] = resp.map(r => r.data)
            seasonsList.sort((a: any, b: any) => b.id - a.id);
            setSeasons([...seasonsList]);
            setCustomerBrandData([...customerBrandData]);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    };

    const handleSave = () => {
        setIsSaving(true);
        setErrors({});

        const request = {
            method: editSeasonId == 0 ? 'post' : 'put',
            url: editSeasonId == 0 ? RestUrls.createSeasonURL() : RestUrls.updateSeasonURL(editSeasonId),
            data: season
        }

        api(request).then(() => {
            setOpen(false);
            getData();
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
        getData();
    }, []);


    return (
        <>
            <Typography variant='h1'>Season List</Typography>

            {isLoading ? <DefaultLoader /> : <>
                <Button variant="contained" onClick={() => { modalOpen(true, "Create Season", 0) }}>Add Season</Button>
                <RitzTable
                    data={seasons}
                    columns={columns}
                />
            </>}
            <RitzModal open={open} onClose={modalClose} title={title} isLoading={isModalLoading}>
                <RitzGenericForm fields={formFields} onSumbit={handleSave} submitId={editSeasonId} errors={errors} isSaving={isSaving} />
            </RitzModal>
        </>
    );
};

export default SeasonListView;
