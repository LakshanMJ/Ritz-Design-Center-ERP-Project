import React, { useEffect, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableRow, useTheme } from '@mui/material';
import api from "@/services/api";
import DefaultLoader from "@/components/DefaultLoader";

const CPIData = ({ materialId }: any) => {
    const theme = useTheme()
    const [isLoading, setIsLoading] = useState(false);

    return (
        <>
            {isLoading ? <DefaultLoader /> : <>
                <Table >
                    <TableHead>
                        <TableRow sx={{ background: theme.palette.grey[100] }}>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Delivery</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>Fabric Description</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>Color</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>Pack List</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>Batch#</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>Roll#</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>Total Quantity</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>Inspection Report</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>No Of 'Pcs'</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>CPI Cost for Price</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>CPI Cost</TableCell>
                        </TableRow>

                    </TableHead>
                    <TableBody>
                        <TableRow>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Delivery 01</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>CB000014-R300-GREEN</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>Green</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>PL000018</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>Batch01</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>12</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>100 Meters</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>150 Meters</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>D1</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>2023-05-12</TableCell>
                        </TableRow>

                    </TableBody>
                </Table>
            </>}
        </>
    );
};

export default CPIData;
