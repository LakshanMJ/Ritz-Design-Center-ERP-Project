import React, { useEffect, useState } from "react"
import Button from "@mui/material/Button";
import { Table, TableBody, TableCell, TableHead, TableRow, useTheme } from '@mui/material';
import DefaultLoader from "@/components/DefaultLoader";

const ReceivingSummary = ({ dataList }: any) => {
    const theme = useTheme()
    const [isLoading, setIsLoading] = useState(false);
    const [receivingDetails, setReceivingDetails] = useState<any>([]);

    useEffect(() => {
        if (dataList) {
            setReceivingDetails(dataList)
        }
    }, [dataList]);

    return (
        <>
            {isLoading ? <DefaultLoader /> : <>
                <Table >
                    <TableHead>
                        <TableRow sx={{ background: theme.palette.grey[100] }}>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Pack List</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Batch No#</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Total Quantity</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Roll#</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Qunatity</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {receivingDetails.map((packList: any, packListIndex: number) => (
                            packList.batches.map((batch: any, batchIndex: number) => (
                                batch.rolls.map((roll: any, rollIndex: number) => {
                                    const totalRollsInPackList = packList.batches.reduce((acc: number, b: any) => acc + b.rolls.length, 0);
                                    const totalRollsInBatch = batch.rolls.length;
                                    return (
                                        <TableRow key={`${packListIndex}-${batchIndex}-${rollIndex}`}>
                                            {rollIndex === 0 && batchIndex == 0 && (
                                                <TableCell rowSpan={totalRollsInPackList} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>{packList.pack_list_name}</TableCell>
                                            )}
                                            {rollIndex === 0&& (
                                                <>
                                                    <TableCell rowSpan={totalRollsInBatch} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>{batch.batch_name}</TableCell>
                                                    <TableCell rowSpan={totalRollsInBatch} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>{batch.total_quantity?.quantity} {batch.total_quantity?.quantity_units_display}</TableCell>
                                                </>
                                            )}
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>{roll.pack_number}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>{roll.quantity} {roll.quantity_units}</TableCell>
                                        </TableRow>
                                    );
                                })
                            ))
                        ))}
                    </TableBody>
                </Table>
            </>}
        </>
    );
};

export default ReceivingSummary;
