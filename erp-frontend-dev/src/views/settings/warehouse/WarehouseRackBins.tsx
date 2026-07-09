import React, { useEffect, useState } from 'react';
import { Card, CardContent, Typography, Box, Grid, List, ListItem, ListItemButton, ListItemText, Divider, Alert, IconButton, Button } from '@mui/material';
import api from '@/services/api';
import toast from 'react-hot-toast';
import DefaultLoader from '@/components/DefaultLoader';
import RitzTable from "@/components/Ritz/RitzTable";
import RitzModal from '@/components/Ritz/RitzModal';
import RitzGenericForm from '@/components/Ritz/RitzGenericForm';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AssignRack from './AssignBins'; 
import { getConsumptionMeasuringUnitsURL, customersURL } from '@/helpers/constants/RestUrls';
import { createWarehouseRackBinsURL, editWarehouseRackBinsURL, deleteWarehouseRackBinsURL, warehouseRackBinsListURL} from '@/helpers/constants/rest_urls/VirtualWarehouseUrls';
import { hasRole } from '@/helpers/Utilities';
import { ADMIN } from '@/helpers/constants/RoleManager';
import { ColumnDef } from '@tanstack/react-table';

const WarehouseRackBins = ({ warehouseId, racks }: any) => {
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRackId, setSelectedRackId] = useState<string | null>(null);
    const [rackDetails, setRackDetails] = useState<any>({});
    const [rackList, setRackList] = useState<any>([]);
    const [open, setOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [assignOpen, setAssignOpen] = useState(false);
    const [title, setTitle] = useState<string>();
    const [rack, setRack] = useState({ id: 0, bin_number:'', length: '', length_unit: 'inches', width: '', width_unit: 'inches', height: '', height_unit: 'inches', customer: '' });
    const [errors, setErrors] = useState<any>({});
    const [isSaving, setIsSaving] = useState(false);
    const [selectedDetailId, setSelectedDetailId] = useState<number | null>(null);
    const [consumptionUnits, setConsumptionUnits] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const canEdit = hasRole(ADMIN);

    console.log('rack:', rack);

    const fetchData = () => {
        if (racks && racks.length > 0) {
            setRackList(racks);
        }
        setIsLoading(false);
    };

    const loadRackDetailsAndConsumptionUnits = (rackId: any) => {
        setIsLoading(true);

        Promise.all([
            api({ method: 'get', url: warehouseRackBinsListURL(rackId) }),
            api({ method: 'get', url: getConsumptionMeasuringUnitsURL() }),
            api({ method: 'get', url: customersURL() }) 
        ])
        .then(([rackDetailsResponse, consumptionUnitsResponse, customersResponse]) => {
            const rackData = rackDetailsResponse.data;
            setRackDetails({
                id: rackData.id,
                display_number: rackData.display_number,
                rack_number: rackData.rack_number,
                name: `Rack ${rackData.rack_number}`,
                details: rackData.bin_details
            });

            setConsumptionUnits(consumptionUnitsResponse.data.all);
            setCustomers(customersResponse.data); 
        })
        .catch((error) => {
            toast.error(error?.response?.status ? `Error: ${error.response.status}` : 'An error occurred loading data');
            setRackDetails({
                id: rackId,
                name: `Rack ${rackId}`,
                details: []
            });
        })
        .finally(() => {
            setIsLoading(false);
        });
    };

    const handleRackClick = (rack: any) => {
        setSelectedRackId(rack.id);
        loadRackDetailsAndConsumptionUnits(rack.id);
    };

    const handleAddRackDetails = () => {
        
        setTitle('Add Bin Details');
        setRack({ id: 0, bin_number:'', length: '', length_unit: 'inches', width: '', width_unit: 'inches', height: '', height_unit: 'inches', customer: '' });
        setOpen(true);
    };

    const handleEditRackDetails = (rack: any) => {
        setTitle('Edit Rack Details');
        setRack(rack);
        setOpen(true);
    };

    const handleDeleteRackDetails = (id: number) => {
        setSelectedDetailId(id);
        setDeleteOpen(true);
    };

    const handleSave = () => {
        setIsSaving(true);
        setErrors({});
    
        const request = {
            method: rack.id === 0 ? 'post' : 'put',
            url: rack.id === 0 ? createWarehouseRackBinsURL() : editWarehouseRackBinsURL(rack.id),
            data: {
                ...rack,
                warehouse_rack: selectedRackId,
            },
        };
    
        api(request).then(() => {
            setOpen(false);
            toast.success(`Rack details ${rack.id === 0 ? 'created' : 'updated'} successfully`);
            loadRackDetailsAndConsumptionUnits(selectedRackId);
        }).catch(error => {
            toast.error(error?.response?.status ? `Error: ${error.response.status}` : 'An error occurred');
        
            if (error?.response?.data) {
                setErrors(error.response.data);
            }
        }).finally(() => {
            setIsSaving(false);
        });
    };

    const confirmDelete = () => {
        setIsSaving(true);
        api({
            method: 'delete',
            url: deleteWarehouseRackBinsURL(selectedDetailId),
        }).then(() => {
            setRackDetails((prevDetails: any) => ({
                ...prevDetails,
                details: prevDetails.details.filter((detail: any) => detail.id !== selectedDetailId)
            }));
            toast.success('Rack detail deleted successfully');
        }).catch(error => {
            toast.error(error?.response?.status ? `Error: ${error.response.status}` : 'An error occurred');
        }).finally(() => {
            setIsSaving(false);
            setDeleteOpen(false);
        });
    };

    const warehouseRackbinsColumns: ColumnDef<any>[] = [
        {
            accessorKey: 'bin_number',
            header: 'Bin Number',
        },
        {
            accessorKey: 'display_number',
            header: 'Bin Number',
        },
        {
            accessorKey: 'customer_name',
            header: 'Assigned Customer',
            cell: (props: any) => props.getValue() || 'Unassigned',
        },
        {
            accessorKey: 'length',
            header: 'Length',
        },
        {
            accessorKey: 'length_unit',
            header: 'Length Unit',
        },
        {
            accessorKey: 'width',
            header: 'Width',
        },
        {
            accessorKey: 'width_unit',
            header: 'Width Unit',
        },
        {
            accessorKey: 'height',
            header: 'Height',
        },
        {
            accessorKey: 'height_unit',
            header: 'Height Unit',
        },
        {
            accessorKey: 'id',
            header: 'Action',
            enableSorting: false,
            cell: props => (
                <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton size='small' color='primary' onClick={() => handleEditRackDetails(props.row.original)}>
                        <EditIcon fontSize='inherit' />
                    </IconButton>
                    {canEdit && (
                        <IconButton size='small' color='warning' onClick={() => handleDeleteRackDetails(props.row.original.id)}>
                            <DeleteIcon fontSize='inherit' />
                        </IconButton>
                    )}
                </Box>
                </>
            ),
            meta: {
                align: 'center',
                width: 100
            }
        }
    ];

    const formFields = [
        { label: 'Bin Number', name: 'bin_number', value: rack.bin_number || '', type: 'text', onChange: (e: any) => setRack({ ...rack, bin_number: e.target.value }), error: errors.bin_number },
        { label: 'Customer', name: 'customer', value: rack.customer || '', type: 'searchable', options: customers, optionText: 'name', optionValue: 'id', onChange: (name: string, selectedValue: any) => setRack({ ...rack, customer: selectedValue }) },
        { label: 'Length', name: 'length', value: rack.length || '', type: 'text', onChange: (e: any) => setRack({ ...rack, length: e.target.value }), error: errors.length },
        { label: 'Length Unit', name: 'length_unit', value: rack.length_unit || '', type: 'select', options: consumptionUnits, optionText: 'display_value', optionValue: 'value', onChange: (e: any) => setRack({ ...rack, length_unit: e.target.value }), error: errors.length_unit },
        { label: 'Width', name: 'width', value: rack.width || '', type: 'text', onChange: (e: any) => setRack({ ...rack, width: e.target.value }), error: errors.width },
        { label: 'Width Unit', name: 'width_unit', value: rack.width_unit || '', type: 'select', options: consumptionUnits, optionText: 'display_value', optionValue: 'value', onChange: (e: any) => setRack({ ...rack, width_unit: e.target.value }), error: errors.width_unit },
        { label: 'Height', name: 'height', value: rack.height || '', type: 'text', onChange: (e: any) => setRack({ ...rack, height: e.target.value }), error: errors.height },
        { label: 'Height Unit', name: 'height_unit', value: rack.height_unit || '', type: 'select', options: consumptionUnits, optionText: 'display_value', optionValue: 'value', onChange: (e: any) => setRack({ ...rack, height_unit: e.target.value }), error: errors.height_unit },
    ];

    useEffect(() => {
        fetchData();
    }, [racks]);

    return (
        <>
            {isLoading ? <DefaultLoader /> : (
                <>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, mb: 1 }}>
                        <Button variant='contained' size="small" onClick={handleAddRackDetails} disabled={!selectedRackId} >Add Bin Details</Button>
                        <Button variant='contained' size="small" onClick={() => setAssignOpen(true)}  sx={{ ml: 2 }}>Assign Bins</Button>
                    </Box>
                    <Grid
                        container direction="row"
                        sx={{ height: '100vh', display: 'flex' }}>
                        <Grid
                            item
                            xs={12}
                            md={2}
                            sx={{
                                backgroundColor: '#f5f5f5',
                                borderRight: '1px solid #ddd',
                                display: 'flex',
                                flexDirection: 'column',
                                height: '100%',
                            }}
                        >
                            <Card sx={{ flex: 1, boxShadow: 'none', borderRadius: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
                                <CardContent
                                    sx={{
                                        flex: 1,
                                        overflowY: 'auto',
                                        padding: 2,
                                        paddingTop: 1,
                                    }}
                                >
                                    <Box> 
                                        {rackList.map((rack: any) => (
                                            <Box key={rack.id} marginBottom={-1}>
                                                <List dense>
                                                    <ListItem
                                                        key={rack.id}
                                                        disablePadding
                                                        selected={selectedRackId === rack.id}
                                                    >
                                                        <ListItemButton onClick={() => handleRackClick(rack)}>
                                                            <ListItemText
                                                                primary={
                                                                    <Box display="flex" alignItems="center" justifyContent="space-between">
                                                                            <Typography
                                                                                color={selectedRackId === rack.id ? 'primary' : 'inherit'}
                                                                                fontWeight={selectedRackId === rack.id ? 'bold' : 'normal'}
                                                                            >
                                                                                {`Rack ${rack.rack_number || rack.id}`}
                                                                            </Typography>
                                                                    </Box>}
                                                                primaryTypographyProps={{
                                                                    color: selectedRackId === rack.id ? 'primary' : 'inherit',
                                                                    fontWeight: selectedRackId === rack.id ? 'bold' : 'normal',
                                                                }}
                                                            />
                                                        </ListItemButton>
                                                    </ListItem>
                                                </List>
                                                <Divider />
                                            </Box>
                                        ))}
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item
                            xs={12}
                            md={10}
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                height: '100%',
                            }}>

                            {selectedRackId ? (
                                isLoading ? <DefaultLoader /> : (
                                    <>
                                        <Box sx={{ marginLeft: 2, height: 'calc(100% - 16px)', overflow: 'auto' }}>
                                            <RitzTable
                                                title="Bins Details"
                                                data={rackDetails.details}
                                                columns={warehouseRackbinsColumns}
                                            />
                                        </Box>
                                    </>
                                )
                            ) : (
                                <Box sx={{ marginLeft: 2 }}>
                                    <Alert severity="info">Click on a Rack to view details.</Alert>
                                </Box>

                            )}
                        </Grid>
                    </Grid>
                </>
            )}
            <RitzModal open={open} onClose={() => setOpen(false)} title={title} isLoading={false}>
                <RitzGenericForm fields={formFields} onSumbit={handleSave} submitId={rack.id} errors={errors} isSaving={isSaving} />
            </RitzModal>
            <RitzModal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Confirm Delete" isLoading={isSaving}>
                <Typography>Are you sure you want to delete this rack detail?</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button variant='contained' color='secondary' onClick={() => setDeleteOpen(false)}>Cancel</Button>
                    <Button variant='contained' color='primary' onClick={confirmDelete} sx={{ ml: 2 }}>Yes</Button>
                </Box>
            </RitzModal>
            <AssignRack warehouseId={warehouseId} open={assignOpen} onClose={() => setAssignOpen(false)} />
        </>
    );
};

export default WarehouseRackBins;