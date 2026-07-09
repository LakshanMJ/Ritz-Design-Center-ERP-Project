import React, { useEffect, useState } from "react"
import Button from "@mui/material/Button";
import EditIcon from '@mui/icons-material/Edit';
import { IconButton, Typography } from "@mui/material";
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


const PlacementListView = () => {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState<string>()
    const [placement, setPlacement] = useState({ id: 0, placement: '', active: true, type: '', item: '', assign_type: '' });
    const [editPlacementId, setPlacementId] = useState(0);
    const [errors, setErrors] = useState<any>({});
    const [placements, setPlacements] = useState<any>([]);
    const [items, setitems] = useState<any>([]);
    const [placementTypes, setPlacementTypes] = useState<any>({});
    const [placementAssignmentTypes, setplacementAssignmentTypes] = useState<any>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isModalLoading, setIsModalLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (event: any) => {
        setPlacement({
            ...placement,
            [event?.target?.name]: event?.target?.value,
        });
    };

    const handleChangeChacked = (event: any) => {
        setPlacement({
            ...placement,
            [event?.target?.name]: event?.target?.checked,
        });
    };

    const handleSelectChangePlacementType = (event: any) => {
        setPlacement({ ...placement, type: event.target.value });
    };
    const handleSelectChangePlacemenAssigntType = (event: any) => {
        setPlacement({ ...placement, assign_type: event.target.value });
    };

    const handleSelectChangeItem = (event: any) => {
        setPlacement({ ...placement, item: event.target.value });
    };

    const formFields: any[] = [
        { label: 'Placement', name: 'placement', value: placement?.placement || '', type: 'text', onChange: handleChange },
        { label: 'Placement Type', name: 'type', value: placement?.type || '', type: 'select', optionText: 'name', optionValue: 'id', options: placementTypes.material_types, onChange: handleSelectChangePlacementType },
        {
            label: 'Placement Assignment Type', name: 'assign_type', value: placement?.assign_type || '', type: 'select',
            optionText: 'name', optionValue: 'id', options: placementAssignmentTypes.placement_assign_types, onChange: handleSelectChangePlacemenAssigntType
        },
        { label: 'Items', name: 'item', value: placement?.item || '', type: 'select', optionText: 'name', optionValue: 'id', options: items, onChange: handleSelectChangeItem },
        { label: 'Status', name: 'active', value: placement?.active, type: 'switch', onChange: handleChangeChacked },
    ];

    const modalOpen = (isOpen: any, title: string, itemId: any) => {
        setTitle(title)
        setPlacementId(itemId);
        setOpen(isOpen);

        if (itemId === 0) {
            setPlacement({ id: 0, placement: '', active: true, type: '', item: '', assign_type: '' });
        } else {
            setIsModalLoading(true);
            api.get(RestUrls.itemAttributeURL(itemId)).then(resp => {
                const resdata = resp?.data || {};
                setPlacement({ ...resdata });
            }).catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            }).finally(() => setIsModalLoading(false));
        }
    };

    const modalClose = () => {
        setErrors({});
        setOpen(false);
    };

    const handleSave = () => {
        setIsSaving(true);
        const request = {
            method: editPlacementId === 0 ? 'post' : 'put',
            url: editPlacementId === 0 ? RestUrls.createItemAttributeURL() : RestUrls.updateItemAttributeURL(editPlacementId),
            data: placement
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

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: 'item_name',
            header: 'Item',
        },
        {
            accessorKey: 'placement',
            header: 'Placement',
        },
        {
            accessorKey: 'type',
            header: 'Type',
        },
        {
            accessorKey: 'assign_type',
            header: 'Placement Assignment Type',
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
                <IconButton size='small' color='primary' onClick={() => modalOpen(true, "Edit Placement", props.getValue())}>
                    <EditIcon fontSize='inherit' />
                </IconButton>
            ),
            meta: {
                align: 'center',
                width: 100
            }
        }
    ];

    const getData = () => {
        setIsLoading(true);
        Promise.all([
            api.get(RestUrls.itemAttributesURL()),
            api.get(RestUrls.itemsURL()),
            api.get(RestUrls.itemAttributePlacemnetTypeURL()),
            api.get(RestUrls.itemAttributesPlacementAssignTypeURL())
        ]).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [placements, items, placementTypes, placementAssign] = respData;

            setPlacements([...placements]);
            setitems([...items]);
            setPlacementTypes({ ...placementTypes });
            setplacementAssignmentTypes({ ...placementAssign });
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    }

    useEffect(() => {
        getData();
    }, []);


    return (
        <>
            <Typography variant='h1'>Placement List</Typography>
            {isLoading ? <DefaultLoader /> : <>
                <Button variant="contained" onClick={() => { modalOpen(true, "Create Placement", 0) }}>Add Placement</Button>
                <RitzTable
                    data={placements}
                    columns={columns}
                />
            </>}

            <RitzModal open={open} onClose={modalClose} title={title} isLoading={isModalLoading}>
                <RitzGenericForm fields={formFields} onSumbit={handleSave} submitId={editPlacementId} errors={errors} isSaving={isSaving} />
            </RitzModal>
        </>
    );
};

export default PlacementListView;
