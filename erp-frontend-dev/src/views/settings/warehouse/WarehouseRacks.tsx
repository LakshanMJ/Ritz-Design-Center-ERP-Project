import { Box, Button, IconButton, Typography } from "@mui/material";
import React, { useState } from "react";
import RitzTable from "@/components/Ritz/RitzTable";
import { ColumnDef } from "@tanstack/react-table";
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RitzModal from '@/components/Ritz/RitzModal';
import RitzGenericForm from '@/components/Ritz/RitzGenericForm';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { createWarehouseRackURL, editWarehouseRackURL, deleteWarehouseRackURL } from '@/helpers/constants/rest_urls/VirtualWarehouseUrls';
import { ADMIN } from "@/helpers/constants/RoleManager";
import { hasRole } from "@/helpers/Utilities";
import Warehouse2D from "@/views/settings/warehouse/Warehouse2D";

const WarehouseRacks = ({ warehouseId, racks, refreshRacks }:any) => {
    const [open, setOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [title, setTitle] = useState<string>('');
    const [rack, setRack] = useState({ id: 0, rack_number: '', number_of_bins: '', location_x: '', location_y: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [selectedRackId, setSelectedRackId] = useState<number | null>(null);
    const [show2DView, setShow2DView] = useState(false);
    const [formErrors, setFormErrors] = useState<any>({});
    const canEdit = hasRole(ADMIN);

    const handleSave = () => {
        setIsSaving(true);
        setFormErrors({});
        const method = rack.id === 0 ? 'post' : 'put';
        const url = rack.id === 0 ? createWarehouseRackURL() : editWarehouseRackURL(rack.id);
    
        const payload = { ...rack, warehouse: warehouseId };
    
        api({ method, url, data: payload })
            .then(() => {
                toast.success(`Rack ${rack.id === 0 ? 'created' : 'updated'} successfully`);
                setOpen(false);
                refreshRacks();
            })
            .catch((error) => {
                if (error.response?.data) {
                    setFormErrors(error.response.data); 
                } else {
                    toast.error('An error occurred');
                }
            })
            .finally(() => setIsSaving(false));
    };

    const confirmDelete = () => {
        setIsSaving(true);
        api.delete(deleteWarehouseRackURL(selectedRackId!))
            .then(() => {
                toast.success('Rack deleted successfully');
                refreshRacks();
            })
            .catch((error) => toast.error(error?.response?.status ? `Error: ${error.response.status}` : 'An error occurred'))
            .finally(() => {
                setIsSaving(false);
                setDeleteOpen(false);
            });
    };

    const warehouseRacksColumn: ColumnDef<any>[] = [
        { accessorKey: 'rack_number', header: 'Rack Number' },
        { accessorKey: 'number_of_bins', header: 'Number of Bins' },
        { accessorKey: 'location_x', header: 'Location X' },
        { accessorKey: 'location_y', header: 'Location Y' },
        {
            accessorKey: 'id',
            header: 'Action',
            cell: ({ row }) => (
                <>
                    <IconButton size='small' color='primary' onClick={() => handleEditRackDetails(row.original)}>
                        <EditIcon fontSize='inherit' />
                    </IconButton>
                    {canEdit && (
                        <IconButton size='small' color='warning' onClick={() => handleDeleteRack(row.original.id)}>
                            <DeleteIcon fontSize='inherit' />
                        </IconButton>
                    )}
                </>
            ),
            meta: { align: 'center', width: 100 },
            enableSorting: false,
        }
    ];

    const handleAddRackDetails = () => {
        setTitle('Add Rack Details');
        setRack({ id: 0, rack_number: '', number_of_bins: '', location_x: '', location_y: '' });
        setOpen(true);
    };

    const handleEditRackDetails = (rack: any) => {
        setTitle('Edit Rack Details');
        setRack(rack);
        setOpen(true);
    };

    const handleDeleteRack = (id: number) => {
        setSelectedRackId(id);
        setDeleteOpen(true);
    };

    const formFields = [
        { label: 'Rack Number', name: 'rack_number', value: rack.rack_number, type: 'text', onChange: (e: any) => setRack({ ...rack, rack_number: e.target.value }) },
        { label: 'Number of Bins', name: 'number_of_bins', value: rack.number_of_bins, type: 'text', onChange: (e: any) => setRack({ ...rack, number_of_bins: e.target.value }) },
        { label: 'Location X', name: 'location_x', value: rack.location_x, type: 'text', onChange: (e: any) => setRack({ ...rack, location_x: e.target.value }) },
        { label: 'Location Y', name: 'location_y', value: rack.location_y, type: 'text', onChange: (e: any) => setRack({ ...rack, location_y: e.target.value }) },
    ];

    return (
        <>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, mb: 1, gap: 1 }}>
                <Button variant='contained' size="small" onClick={handleAddRackDetails}>Add Rack Details</Button>
                <Button variant="contained" color="secondary" size="small" onClick={() => setShow2DView(true)}>Show 2D View</Button>
            </Box>

            <RitzTable title="Plant Warehouse Racks" data={racks} columns={warehouseRacksColumn} />

            <RitzModal open={open} onClose={() => setOpen(false)} title={title} isLoading={isSaving}>
            <RitzGenericForm fields={formFields} onSumbit={handleSave} errors={formErrors} isSaving={isSaving} submitId={rack.id}/>
            </RitzModal>

            <RitzModal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Confirm Delete" isLoading={isSaving}>
                <Typography>Are you sure you want to delete this rack?</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button variant='contained' color='secondary' onClick={() => setDeleteOpen(false)}>Cancel</Button>
                    <Button variant='contained' color='primary' onClick={confirmDelete} sx={{ ml: 2 }}>Yes</Button>
                </Box>
            </RitzModal>

            <RitzModal open={show2DView} onClose={() => setShow2DView(false)} title="Warehouse 2D View" maxWidth="md" fullWidth>
                <Warehouse2D racks={racks} />
            </RitzModal>
        </>
    );
};

export default WarehouseRacks;