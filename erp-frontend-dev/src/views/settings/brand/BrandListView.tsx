import React, { useEffect, useState } from "react"
import Button from "@mui/material/Button";
import EditIcon from '@mui/icons-material/Edit';
import { IconButton, Typography } from '@mui/material';
import * as RestUrls from '../../../helpers/constants/RestUrls';
import RitzModal from "@/components/Ritz/RitzModal";
import RitzGenericForm from "@/components/Ritz/RitzGenericForm";
import RitzTable from "@/components/Ritz/RitzTable";
import { ColumnDef } from "@tanstack/react-table";
import api from "@/services/api";
import DefaultLoader from "@/components/DefaultLoader";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';


const BrandListView = () => {

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: 'name',
            header: 'Brand',
        },
        {
            accessorKey: 'code',
            header: 'Code',
        },
        {
            accessorKey: "id",
            header: 'Action',
            enableSorting: false,
            enableColumnFilter: false,
            enableGlobalFilter: false,
            cell: props => (
                <IconButton size='small' color='primary' onClick={() => modalOpen(true, "Edit Brand", props.getValue())}>
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
    const [brand, setBrand] = useState({ id: 0, name: "", code: "" });
    const [editBrandId, setEditBrandId] = useState(0);
    const [errors, setErrors] = useState<any>({});
    const [brands, setBrands] = useState<any>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalLoading, setIsModalLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (event: any) => {
        setBrand({
            ...brand,
            [event?.target?.name]: event?.target?.value,
        });
    };

    const formFields:any[] = [
        { label: 'Brand Name', name: 'name', value: brand?.name || '', type: 'text', onChange: handleChange },
        { label: 'Code', name: 'code', value: brand?.code || '', type: 'text', onChange: handleChange }
    ]

    const modalOpen = (isOpen: any, title: string, brandId: any) => {
        setTitle(title);
        setEditBrandId(brandId);
        setOpen(isOpen);

        if (brandId === 0) {
            setBrand({ id: 0, name: '', code: '' });
        } else {
            setIsModalLoading(true);
            api.get(RestUrls.brandURL(brandId)).then(resp => {
                const reseditdata = resp?.data || {};
                setBrand({ ...reseditdata });
            }).catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            }).finally(() => setIsModalLoading(false));
        }
    };

    const modalClose = () => {
        setOpen(false);
        setErrors({});
    };

    const getBrands = () => {
        setIsLoading(true);
        api.get(RestUrls.brandsURL()).then(resp => {
            const resdata = resp?.data || [];
            setBrands([...resdata]);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    };

    const handleSave = () => {
        setIsSaving(true);

        const request = {
            method: editBrandId === 0 ? 'post' : 'put',
            url: editBrandId === 0 ? RestUrls.createBrandURL() : RestUrls.updateBrandURL(editBrandId),
            data: brand
        }

        api(request).then(() => {
            setOpen(false);
            getBrands();
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
            if (error?.response?.data) {
                setErrors(error.response.data);
            }
        }).finally(() => setIsSaving(false));
    };

    useEffect(() => {
        getBrands();
    }, []);


    return (
        <>
            <Typography variant='h1'>Brand List</Typography>
            {isLoading ? <DefaultLoader /> : <>
                <Button variant="contained" onClick={() => { modalOpen(true, "Create New Brand", 0) }}>Add Brand</Button>
                <RitzTable
                    data={brands}
                    columns={columns}
                />
            </>}

            <RitzModal open={open} onClose={modalClose} title={title} isLoading={isModalLoading}>
                <RitzGenericForm fields={formFields} onSumbit={handleSave} submitId={editBrandId} errors={errors} isSaving={isSaving} />
            </RitzModal>
        </>
    );
};

export default BrandListView;
