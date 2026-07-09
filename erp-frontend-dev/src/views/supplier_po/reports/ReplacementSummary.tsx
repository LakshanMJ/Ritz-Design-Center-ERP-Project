import React, { useEffect, useState } from "react"
import Button from "@mui/material/Button";
import { Table, TableBody, TableCell, TableHead, TableRow, useTheme } from '@mui/material';
import DefaultLoader from "@/components/DefaultLoader";


const ReplacementSummary = ({ dataList }: any) => {
    const theme = useTheme()
    const [isLoading, setIsLoading] = useState(false);
    const [replacementData, setReplacementData] = useState<any>([]);

    useEffect(() => {
        if (dataList) {
            setReplacementData([...dataList])
        }
    }, [dataList]);

    return (
        <>
            {isLoading ? <DefaultLoader /> : <>
                <Table >
                    <TableHead>
                        <TableRow sx={{ background: theme.palette.grey[100] }}>
                            <TableCell rowSpan={2} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Pack List</TableCell>
                            <TableCell rowSpan={2} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Reject Quantity</TableCell>
                            <TableCell rowSpan={2} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Replacement Quantity</TableCell>
                            <TableCell rowSpan={2} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Reason</TableCell>
                            <TableCell colSpan={3} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>Replacement Commitment</TableCell>
                        </TableRow>
                        <TableRow sx={{ background: theme.palette.grey[100] }}>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Delivery</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Date</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Quantity</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {replacementData.length == 0 ?(
                            <TableRow>
                               <TableCell colSpan={8} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>No available data</TableCell>
                            </TableRow>
                        ):(
                            replacementData.map((replacement:any, replacementIndex:any)=>(
                                <TableRow key={replacementIndex}>
                                {replacementIndex == 0 &&(
                                        <TableCell rowSpan={replacementData.length} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{replacement.pack_list}</TableCell>
                                )}
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{replacement.quantity?.quantity} {replacement.quantity?.quantity_units_display}</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{replacement.quantity?.quantity} {replacement.quantity?.quantity_units_display}</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{replacement.reason_display}</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{replacement.delivery_display_number}</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{replacement.date}</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{replacement.quantity?.quantity} {replacement.quantity?.quantity_units_display}</TableCell>
                            </TableRow>
                            ))
                        )}
                       
                        
                        
                    </TableBody>
                </Table>
            </>}
        </>
    );
};

export default ReplacementSummary;
