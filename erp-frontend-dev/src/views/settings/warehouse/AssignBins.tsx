import React, { useEffect, useState } from 'react'; 
import { Box, Button, Typography, Checkbox } from '@mui/material'; 
import api from '@/services/api'; 
import toast from 'react-hot-toast'; 
import RitzModal from '@/components/Ritz/RitzModal'; 
import RitzSearchableSelection from '@/components/Ritz/RitzSearchableSelection'; 
import RitzTable from '@/components/Ritz/RitzTable'; 
import { customersURL} from '@/helpers/constants/RestUrls';
import { warehouseAssignRackCreateURL, warehouseAssignRackURL} from '@/helpers/constants/rest_urls/VirtualWarehouseUrls';

const AssignBins = ({ open, onClose, warehouseId }: any) => { 
    const [isLoading, setIsLoading] = useState(false); 
    const [customers, setCustomers] = useState<any[]>([]); 
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [rackData, setRackData] = useState<any[]>([]);
    const [selectedRows, setSelectedRows] = useState<any[]>([]);

    const fetchData = (retainCustomer: boolean = false) => {
        setIsLoading(true);
        Promise.all([
            api({ method: 'get', url: customersURL() }),
            api({ method: 'get', url: warehouseAssignRackURL(warehouseId) })
        ])
        .then(([customersResponse, rackResponse]) => {
            setCustomers(customersResponse.data);
            setRackData(rackResponse.data);
            if (retainCustomer) {
                const customerRacks = rackResponse.data.filter((rack:any) => rack.customer === selectedCustomer);
                setSelectedRows(customerRacks);
            }
        })
        .catch(error => {
            toast.error('An error occurred while loading data');
        })
        .finally(() => {
            setIsLoading(false);
        });
    };

    useEffect(() => {
        if (open) {
            fetchData();
        }
    }, [open]);

    const handleAssign = () => {

        if (!selectedCustomer ) {
            toast.error('Please select a customer before assigning.');
            return;
        }
    
        if (selectedRows.length === 0) {
            toast.error('Please select at least one rack to assign.');
            return;
        }
    
        const payload = {
            customer_id: selectedCustomer,
            bins: selectedRows.map((row) => row.id), 
        };
    
        api({
            method: 'post',
            url: warehouseAssignRackCreateURL(),
            data: payload,
        })
            .then(() => {
                toast.success('Racks assigned successfully!');
                fetchData(true); 
            })
            .catch(() => {
                toast.error('An error occurred while assigning racks.');
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    const handleRowSelect = (row: any) => {
        setSelectedRows((prev) =>
            prev.includes(row)
                ? prev.filter((r) => r !== row)
                : [...prev, row]
        );
    };

    const handleSelectAll = (isChecked: boolean) => {
        if (isChecked) {
            setSelectedRows(rackData);
        } else {
            setSelectedRows([]);
        }
    };

    const handleCustomerChange = (customer: any) => {
        setSelectedCustomer(customer);
        const customerRacks = rackData.filter((rack) => rack.customer === customer);
        setSelectedRows(customerRacks);
    };

    const columns = [
        {
            id: 'select',
            header: ({ table }: any) => (
                <Checkbox
                    checked={selectedRows.length === rackData.length && rackData.length > 0}
                    indeterminate={selectedRows.length > 0 && selectedRows.length < rackData.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                />
            ),
            cell: ({ row }: any) => (
                <Checkbox
                    checked={selectedRows.includes(row.original)}
                    onChange={() => handleRowSelect(row.original)}
                />
            ),
        },
        { 
            accessorKey: 'plant_name', 
            header: 'Plant Name' 
        },
        { 
            accessorKey: 'warehouse_name', 
            header: 'Warehouse Name' 
        },
        { 
            accessorKey: 'rack_display_number', 
            header: 'Rack Display Number' 
        },
        { 
            accessorKey: 'display_number', 
            header: 'Bin Number' 
        },
        {
            accessorKey: 'customer_name',
            header: 'Assigned Customer',
            cell: (props:any) => props.row.original.customer_name || 'Unassigned',
        },
    ];

    return (
        <RitzModal open={open} onClose={onClose} title="Assign Bins" isLoading={isLoading} maxWidth="lg" fullWidth={true}>
            <Box>
                <Typography variant="h6" gutterBottom>
                    Customer
                </Typography>
                <Box sx={{ width: '400px' }}> 
                    <RitzSearchableSelection
                        label="Select Customer"
                        options={customers}
                        optionText="name"
                        optionValue="id"
                        handleOnChange={handleCustomerChange}
                        value={selectedCustomer}
                    />
                </Box>
                <Box sx={{ mt: 2 }}>
                    <RitzTable
                        title="Rack Data"
                        data={rackData}
                        columns={columns}
                        isLoading={isLoading}
                    />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button variant='contained' color='primary' onClick={handleAssign}>Assign</Button>
                </Box>
            </Box>
        </RitzModal>
    );
};

export default AssignBins;