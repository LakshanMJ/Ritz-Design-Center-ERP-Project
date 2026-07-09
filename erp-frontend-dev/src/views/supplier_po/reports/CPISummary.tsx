import React, { useEffect, useState } from "react"
import {Table, TableBody, TableCell, TableHead, TableRow, useTheme } from '@mui/material';
import DefaultLoader from "@/components/DefaultLoader";

const CPISummary = ({ dataList }: any) => {
    const theme = useTheme()
    const [isLoading, setIsLoading] = useState(false);
    const [cpiSummaryData, setCpiSummaryData] = useState<any>({});


    useEffect(() => {
        if (dataList) {
            setCpiSummaryData(dataList)
        }
    }, [dataList]);

    return (
        <>
            {isLoading ? <DefaultLoader /> : <>
                <Table >
                    <TableHead>
                        <TableRow sx={{ background: theme.palette.grey[100] }}>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Pack List</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Batch No#</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Roll No#</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Quantity</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Inspection Result</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>No Of 'Pcs'</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>CPI Cost for Price</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>CPI Cost</TableCell>
                        </TableRow>

                    </TableHead>
                    <TableBody>
                        {cpiSummaryData.batches?.length == 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>No available data.</TableCell>
                            </TableRow>
                        ) : (
                            cpiSummaryData.batches?.map((batch: any, batchIndex: any) => (
                                batch.rolls?.map((roll: any, rollIndex: any) => {
                                    const totalRolls = cpiSummaryData.batches.reduce((sum: any, batch: any) => sum + batch.rolls.length, 0);
                                    return (
                                        <TableRow key={`${batchIndex}-${rollIndex}`}>
                                            {batchIndex === 0 && rollIndex === 0 && (
                                                <TableCell rowSpan={totalRolls} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>
                                                    {cpiSummaryData.pack_list_name}
                                                </TableCell>
                                            )}
                                            {rollIndex === 0 && (
                                                <TableCell rowSpan={batch.rolls.length} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>
                                                    {batch.batch_name}
                                                </TableCell>
                                            )}
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{roll.pack_number}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{roll.quantity} {roll.quantity_units}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>--</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>--</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>--</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>--</TableCell>
                                        </TableRow>
                                    );
                                })
                            ))
                        )}

                    </TableBody>
                </Table>
            </>}
        </>
    );
};

export default CPISummary;
