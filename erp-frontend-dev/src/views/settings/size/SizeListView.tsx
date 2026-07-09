import React, { useEffect, useState } from "react"
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


const SizeListView = () => {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState<string>();
    const [size, setSize] = useState({ id: 0, name: "", sorting_order: 0, category: "", abbreviation: "", active: true });
    const [editSizeId, setEditSizeId] = useState(0);
    const [errors, setErrors] = useState<any>({});
    const [sizecategory, setSizeCategory] = useState<any>([]);
    const [allSizes, setAllSizes] = useState<any>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalLoading, setIsModalLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (event: any) => {
        setSize({
            ...size,
            [event?.target?.name]: event?.target?.value,
        });
    };

    const handleChangeChacked = (event: any) => {
        setSize({
            ...size,
            [event?.target?.name]: event?.target?.checked,
        });
    };

    const handleSelectChange = (event: any) => {
        setSize({ ...size, category: event.target.value });
    };

    const formFields: any[] = [
        { label: 'Category Type', name: 'category', value: size?.category || '', type: 'select', optionText: 'name', optionValue: 'id', options: sizecategory, onChange: handleSelectChange },
        { label: 'Size', name: 'name', value: size?.name || '', type: 'text', onChange: handleChange },
        { label: 'Sorting Order', name: 'sorting_order', value: size?.sorting_order || 0, type: 'number', onChange: handleChange },
        { label: 'Abbreviation', name: 'abbreviation', value: size?.abbreviation || '', type: 'text', onChange: handleChange },
        { label: 'Status', name: 'active', value: size?.active, type: 'switch', onChange: handleChangeChacked },
    ];

    const modalOpen = (isOpen: any, title: string, sizeId: any) => {
        setTitle(title)
        setEditSizeId(sizeId);
        setOpen(isOpen);

        if (sizeId === 0) {
            setSize({ id: 0, name: "", sorting_order: 0, category: "", abbreviation: "", active: true });
        } else {
            setIsModalLoading(true);
            api.get(RestUrls.sizeURL(sizeId)).then(resp => {
                const ressizedata = resp?.data || {};
                setSize({ ...ressizedata });
            }).catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            }).finally(() => setIsModalLoading(false));
        }
    };

    const modalClose = () => {
        setErrors({});
        setOpen(false);
    };

    const getSizes = () => {
        setIsLoading(true);

        Promise.all([
            api.get(RestUrls.sizesURL()),
            api.get(RestUrls.allSizesURL())
        ]).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [sizeCats, sizes] = respData;
            setSizeCategory(sizeCats);
            setAllSizes(sizes);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        })
    }

    const handleSave = () => {
        setIsSaving(true);
        setErrors({});

        const request = {
            method: editSizeId === 0 ? 'post' : 'put',
            url: editSizeId === 0 ? RestUrls.createSizeURL() : RestUrls.updateSizeURL(editSizeId),
            data: size
        };

        api(request).then(() => {
            setOpen(false);
            getSizes();
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
        getSizes();
    }, []);

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: 'name',
            header: 'Size',
        },
        {
            accessorKey: 'category_name',
            header: 'Category Type',
        },
        {
            accessorKey: 'sorting_order',
            header: 'Sorting Order',
        },
        {
            accessorKey: 'abbreviation',
            header: 'Abbreviation',
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
                <IconButton size='small' color='primary' onClick={() => modalOpen(true, "Edit Size", props.getValue())}>
                    <EditIcon fontSize='inherit' />
                </IconButton>
            ),
            meta: {
                align: 'center',
                width: 100
            }
        }
    ];


    return (
        <>
            <Typography variant='h1'>Size List</Typography>

            {isLoading ? <DefaultLoader /> : <>
                <Button variant="contained" onClick={() => { modalOpen(true, "Create Size", 0) }}>Add Size</Button>

                <RitzTable
                    data={allSizes}
                    columns={columns}
                />
            </>}

            <RitzModal open={open} onClose={modalClose} title={title} isLoading={isModalLoading}>
                <RitzGenericForm fields={formFields} onSumbit={handleSave} submitId={editSizeId} errors={errors} isSaving={isSaving} />
            </RitzModal>
        </>
    );
};

export default SizeListView;
