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
import { itemPlacementURL } from "@/helpers/constants/FrontEndUrls";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';

const ItemListView = () => {

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: 'name',
            header: 'Item',
            cell: props => (
                <Link component={NextLink} href={itemPlacementURL(props.row.getValue('id'))}>{props.row.getValue('name') ?? ''}</Link>
            )
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
                <IconButton size='small' color='primary' onClick={() => modalOpen(true, "Edit Item", props.getValue())}>
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
    const [item, setItem] = useState({ id: 0, name: '', code: "", customer_brand: 0,  active: true });
    const [editItemId, setEditItemId] = useState(0);
    const [items, setItems] = useState<any>([]);
    const [customerBrandData, setCustomerBrandData] = useState<any>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalLoading, setIsModalLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState({});

    const handleChange = (event: any) => {
        setItem({
            ...item,
            [event?.target?.name]: event?.target?.value,
        });
    };

    const handleChangeChecked = (event: any) => {
        setItem({
            ...item,
            [event?.target?.name]: event?.target?.checked,
        });
    };

    const formFields: any[] = [
        { label: 'Item Name', name: 'name', value: item?.name || '', type: 'text', onChange: handleChange },
        { label: 'Customer & Brand', name: 'customer_brand', value: item?.customer_brand || '', type: 'select', optionText: 'customer_brand_name', optionValue: 'id', options: customerBrandData, onChange: handleChange },
        { label: 'Code', name: 'code', value: item?.code || '', type: 'text', onChange: handleChange },
        { label: 'Status', name: 'active', value: item?.active, type: 'switch', onChange: handleChangeChecked },
    ];

    const modalOpen = (isOpen: any, title: string, itemId: any) => {
        setEditItemId(itemId);
        setTitle(title);
        setOpen(isOpen);

        if (itemId === 0) {
            setItem({ id: 0, name: '', code: "", customer_brand: 0,  active: true });
        } else {
            setIsModalLoading(true);

            api.get(RestUrls.getDetailItemURL(itemId)).then(resp => {
                const reseditdata = resp?.data || {};
                setItem({ ...reseditdata });
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

    const getData = () => {
        setIsLoading(true);
        Promise.all([
            api.get(RestUrls.itemsURL()),
            api.get(RestUrls.customerBrandListURL())   
        ]).then(resp => {
            const [ItemList, customerBrandData] = resp.map(r => r.data)
            setItems([...ItemList]);
            setCustomerBrandData([...customerBrandData]);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    };

    const handleSave = () => {
        setIsSaving(true);
        setErrors({});

        const request = {
            method: editItemId === 0 ? 'post' : 'put',
            url: editItemId === 0 ? RestUrls.createItemURL() : RestUrls.updateItemURL(editItemId),
            data: item
        };

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
    }

    useEffect(() => {
        getData();
    }, []);

    return (
        <>
            <Typography variant='h1'>Item List</Typography>

            {isLoading ? <DefaultLoader /> : <>
                <Button variant="contained" onClick={() => { modalOpen(true, "Create Item", 0) }}>Add Item</Button>

                <RitzTable
                    data={items}
                    columns={columns}
                />
            </>}

            <RitzModal open={open} onClose={modalClose} title={title} isLoading={isModalLoading}>
                <RitzGenericForm fields={formFields} onSumbit={handleSave} submitId={editItemId} errors={errors} isSaving={isSaving} />
            </RitzModal>
        </>
    );
};

export default ItemListView;
