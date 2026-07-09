import { useEffect, useState } from "react";
import * as supplierUrls from '@/helpers/constants/rest_urls/SupplierUrls';
import api from "@/services/api";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import RitzModal from "@/components/Ritz/RitzModal";
import RitzTable from "@/components/Ritz/RitzTable";
import { ColumnDef } from "@tanstack/react-table";
import { Box, Button, Checkbox, Typography } from "@mui/material";
import SaveSpinner from "@/components/SaveSpinner";
import { DEFAULT_SUCCESS, VALIDATION_ERROR_CODE } from "@/helpers/constants/Constants";


const ConsolidateInquiryModal = ({ versionId, modalOpen, setModalOpen, selected, suppliers, materialData, refreshData }: any) => {
    const [isSaving, setIsSaving] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);
    const [selectedSuppliers, setSelectedSuppliers] = useState<any>({});

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: 'id',
            header: ({ table }) => (
                <Checkbox
                    size='small'
                    checked={table.getIsAllRowsSelected()}
                    indeterminate={table.getIsSomeRowsSelected()}
                    onChange={table.getToggleAllRowsSelectedHandler()}
                />
            ),
            cell: ({ row, getValue }) => (
                <Checkbox
                    size='small'
                    checked={row.getIsSelected()}
                    indeterminate={row.getIsSomeSelected()}
                    onChange={row.getToggleSelectedHandler()}
                />
            ),
            enableSorting: false,
            enableColumnFilter: false
        },
        { accessorKey: 'id', header: 'ID' },
        { accessorKey: 'name', header: 'Supplier' },
        { accessorKey: 'email', header: 'Email' },
        { accessorKey: 'phone_number', header: 'Phone' },
        { accessorKey: 'fax', header: 'Fax' },
        { accessorKey: 'address_line_1', header: 'Address Line 1' },
        { accessorKey: 'address_line_2', header: 'Address Line 2' },
    ];

    useEffect(() => {
        let selectedItems: any[] = [];
        Object.keys(selected).forEach((key: any) => {
            const sel = selected[key];
            selectedItems = selectedItems.concat(sel);
        });
        setSelectedItems(selectedItems);
    }, []);

    const onRowSelect = (selection: any, supplierKey: string, supplierValue: any) => {
        const supplierData = getSuppliers(supplierKey, supplierValue);
        const selectedIndexes = Object.keys(selection).map((i: any) => +i);
        const selectedData = selectedIndexes.map((i: number) => supplierData[i]);

        const newState = {
            ...selectedSuppliers,
            [supplierKey]: selectedData
        }
        setSelectedSuppliers(newState);
    }

    const getSuppliers = (key: string, value: any): any[] => {
        const materialName = value?.[0]?.material_type || key?.toLowerCase();
        // Return the suppliers for this material or service
        // if ('service_id' in value?.[0]) {
        //     // it is a service, return service suppliers
        //     return suppliers?.filter((i: any) => i.service);
        // } else {
        //     return suppliers?.filter((i: any) => i.material_names.includes(materialName));
        // }
        return suppliers
    }

    const getPayload = () => {
        let payload: any[] = [];
        Object.keys(selectedSuppliers)?.forEach(key => {
            const suppliers = selectedSuppliers[key];
            const supplierIds = suppliers?.map((i: any) => ({
                id: i.id,
                consolidate: true,
            }));
            // const matData = materialData?.find((i: any) => i.display_name === key)?.data;
            const matData = selected[key];

            const matKey = 'service_id' in matData?.[0] ? 'service_id' : 'customer_brand_material_id';
            const matIds = matData?.map((i: any) => i[matKey]);

            if (supplierIds?.length > 0) {
                payload.push({
                    [matKey]: matIds,
                    supplier_ids: supplierIds
                });
            }
        });
        return payload;
    }

    const onSubmit = () => {
        setIsSaving(true);

        const payload = getPayload();
        console.log(payload)

        api.post(supplierUrls.sendSupplierInquriesURL(+versionId), payload).then(resp => {
            // console.log(resp)
            toast.success(DEFAULT_SUCCESS);
            setModalOpen(false);
            refreshData();
        }).catch(error => {
            if (VALIDATION_ERROR_CODE === error?.response?.status && error?.message) {
                // setErrors([{ status: true, message: error.message }])
                console.log(error)
            }
            toast.error(getDefaultError(error?.response?.status))
        }).finally(() => {
            setIsSaving(false);
        });
    }

    return (
        <RitzModal open={modalOpen} title='Send Inquiry' onClose={() => setModalOpen(false)} maxWidth='xl'>
            {/* <Box sx={{ mb: 3 }}>
                Selected Materials:
                <Typography variant='body1' component='ul' sx={{ pl: 2.5, pt: 1 }}>
                    {Object.keys(selected).map((s: any, i: number) => (
                        selected[s]?.length > 0 && <li key={i}>{s} ({selected[s]?.length})</li>
                    ))}
                </Typography>
            </Box> */}

            {Object.keys(selected)?.map((key: string, i: number) => (
                selected[key]?.length > 0 && (
                    <Box key={i} sx={{ mb: 3 }}>
                        <RitzTable
                            title={key}
                            data={getSuppliers(key, selected[key])}
                            columns={columns}
                            rowSelect
                            multiRowSelect
                            onRowSelect={(e: any) => onRowSelect(e, key, selected[key])}
                           // hideFilters
                        />
                    </Box>
                )
            ))}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                <Button variant='contained' onClick={onSubmit} disabled={isSaving || !Object.keys(selectedSuppliers)?.length}>
                    {isSaving && <SaveSpinner />}Submit
                </Button>
            </Box>
        </RitzModal>
    );
};

export default ConsolidateInquiryModal;