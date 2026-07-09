import React, { useEffect, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableRow, useTheme } from '@mui/material';
import api from "@/services/api";
import DefaultLoader from "@/components/DefaultLoader";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import { supplierPOGRNInvoiceDetailsURL } from "@/helpers/constants/rest_urls/SupplierPoUrls";

const InvoiceDetails = ({ invoiceId, spoId }: any) => {
    const theme = useTheme()
    const [isLoading, setIsLoading] = useState(true);
    const [invoiceDetails, setinvoiceDetails] = useState<any>({});

    const fetchData = () => {
        setIsLoading(true);
        api.get(supplierPOGRNInvoiceDetailsURL(invoiceId, spoId)).then(resp => {
            const resdata = resp?.data || [];
            setinvoiceDetails(resdata);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    };

    useEffect(() => {
        if (setinvoiceDetails) {
            fetchData();
        }
    }, [setinvoiceDetails]);

    return (
        <>

            {isLoading ? <DefaultLoader /> : <>
                <Table>
                    <TableHead>
                        <TableRow sx={{background: theme.palette.grey[100]}}>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Material</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Ritz Code</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Planed Date</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Actual Date</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>CI Quantity</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>PL Quantity</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Rejected Quantity</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Short/Excess Quantity</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Usable Quantity</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {invoiceDetails.quantity_summary?.length > 0 ? (
                            invoiceDetails.quantity_summary?.map((material: any, materialIndex: any) => (
                                <TableRow key={materialIndex}>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{material.material?.material_label}</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{material.material?.ritz_customer_brand_reference_code}</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', width:'15%' }}>{invoiceDetails.plan_date?.join(', ')}</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', width:'15%'}}>{invoiceDetails.actual_date?.join(', ')}</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{material.grn_indicated_quantity?.quantity }</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{material.grn_total_actual_quantity?.quantity }</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{material.supplier_po_rejected_quantity?.quantity }</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{material.supplier_po_in_housed_excess?.quantity }</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{material.grn_usable_quantity?.quantity }</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={9} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>No data available</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>


            </>}
        </>
    );
};

export default InvoiceDetails;
