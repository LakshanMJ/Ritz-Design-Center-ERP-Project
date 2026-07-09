import React, { useState, useEffect } from "react";
import RitzTable from "../../../components/Ritz/RitzTable";
import { ColumnDef } from "@tanstack/react-table";
import { Typography, Button, IconButton, Link } from "@mui/material";
import RitzModal from "@/components/Ritz/RitzModal";
import RitzGenericForm from "@/components/Ritz/RitzGenericForm";
import { toast } from 'react-hot-toast';
import EditIcon from '@mui/icons-material/Edit';
import api from "@/services/api";
import NextLink from 'next/link';
import { warehouseListURL, createWarehouseListURL, editWarehouseListURL} from "@/helpers/constants/rest_urls/VirtualWarehouseUrls";
import { warehouseDetailURL, warehouseManagersURL } from "@/helpers/constants/FrontEndUrls";
import { factoryListURL } from "@/helpers/constants/rest_urls/POUrls";

const WarehouseListView = () => {

    const [data, setData] = useState([]);
    const [open, setOpen] = useState(false);
    const [isUpdate, setIsUpdate] = useState(false);
    const [warehouse, setWarehouse] = useState({id: 0,plant: '',warehouse_name: '',role: ''});
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [warehouseManagers, setWarehouseManagers] = useState([]);
    const [plants, setPlants] = useState([]);

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: 'id',
            header: 'Warehouse Number',
            cell: props => (
                <Link 
                    component={NextLink} 
                    href={warehouseDetailURL(props.row.getValue('id'))}
                >
                    {props.row.original.display_number ?? ''}
                </Link>
            )
        },
        {
            accessorKey: 'plant_name',
            header: 'Plant'
        },
        {
            accessorKey: 'warehouse_name',
            header: 'Name'
        },
        {
            accessorKey: 'role_full_name',
            header: 'Warehouse Manager'
        },
        {
            accessorKey: 'actions',
            header: 'Actions',
            cell: props => (
                <IconButton 
                    size='small' 
                    color='primary' 
                    onClick={() => handleEdit(props.row.original)}
                >
                    <EditIcon fontSize='inherit' />
                </IconButton>
            ),
            meta: {
                align: 'center',
                width: 100
            },
            enableSorting: false,
        }
    ];

    

    const fetchData = () => {
        api.get(warehouseListURL())
            .then(response => {
                setData(response.data);
            })
            .catch(error => {
                toast.error("Failed to fetch warehouses");
            });
    };

    useEffect(() => {
        fetchData();

        Promise.all([
            api.get(warehouseManagersURL()),
            api.get(factoryListURL())
        ])
        .then(([managersResponse, plantsResponse]) => {
            setWarehouseManagers(managersResponse.data);
            setPlants(plantsResponse.data);
        })
        .catch(error => {
            toast.error("Failed to fetch data");
        });
    }, []);

    const handleChange = (event: any) => {
        setWarehouse({
            ...warehouse,
            [event?.target?.name]: event?.target?.value,
        });
    };

    const formFields = [
        { 
            label: 'Plant', 
            name: 'plant', 
            value: warehouse?.plant || '', 
            type: 'select',
            optionText: 'name',
            optionValue: 'id',
            options: plants,
            onChange: handleChange 
        },
        { 
            label: 'Name', 
            name: 'warehouse_name', 
            value: warehouse?.warehouse_name || '', 
            type: 'text', 
            onChange: handleChange 
        },
        { 
            label: 'Warehouse Manager', 
            name: 'role', 
            value: warehouse?.role || '', 
            type: 'select', 
            optionText: 'user_full_name',
            optionValue: 'id',
            options: warehouseManagers, 
            onChange: handleChange 
        }
    ];

    const modalOpen = () => {
        setIsUpdate(false);
        setWarehouse({ id: 0, plant: '', warehouse_name: '', role: '' });
        setOpen(true);
    };

    const modalClose = () => {
        setErrors({});
        setOpen(false);
    };

    const handleEdit = (warehouseData: any) => {
        setIsUpdate(true);
        setWarehouse({
            id: warehouseData.id,
            plant: warehouseData.plant,
            warehouse_name: warehouseData.warehouse_name,
            role: warehouseData.role
        });
        setOpen(true);
    };

    const handleSave = () => {
        setIsSaving(true);
        setErrors({});

        const method = warehouse.id === 0 ? 'post' : 'put';
        const url = warehouse.id === 0 
            ? createWarehouseListURL() 
            : editWarehouseListURL(warehouse.id);

        api({ method, url, data: warehouse })
            .then(response => {
                toast.success(warehouse.id === 0 
                    ? "Warehouse created successfully" 
                    : "Warehouse updated successfully"
                );
                fetchData();
                setOpen(false);
            })
            .catch(error => {
                toast.error("Failed to save warehouse");
                if (error?.response?.data) {
                    setErrors(error.response.data);
                }
            })
            .finally(() => {
                setIsSaving(false);
            });
    };

    return (
        <>
            <Typography variant='h1'>Warehouse List</Typography>

            <Button variant="contained" onClick={modalOpen}>
                Add Warehouse
            </Button>

            <RitzTable
                data={data}
                columns={columns}
                size="medium"
                enableGlobalFilter={true}
                enableColumnFilter={true}
                pagination={true}
            />

            <RitzModal 
                open={open} 
                onClose={modalClose} 
                title={isUpdate ? "Update Warehouse" : "Add Warehouse"}
            >
                <RitzGenericForm 
                    fields={formFields} 
                    onSumbit={handleSave} 
                    errors={errors} 
                    isSaving={isSaving} 
                    submitId={warehouse.id} 
                />
            </RitzModal>
        </>
    );
};

export default WarehouseListView;