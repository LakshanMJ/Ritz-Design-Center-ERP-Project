import React, { useEffect, useState } from "react"
import { Box, Link, Paper, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography, useTheme } from '@mui/material';
import DefaultLoader from "@/components/DefaultLoader";
import { createdGrnDetailsPageURL } from "@/helpers/constants/front_end/GrnUrls";
import InfoIcon from '@mui/icons-material/Info';

const DebitNote = ({ dataList, materialData }: any) => {
    const theme = useTheme()
    const [isLoading, setIsLoading] = useState(false);
    const [debitNoteData, setDebitNoteData] = useState<any>(dataList);

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
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>Reject Roll#</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>Reject Quantity</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>Unit Price</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>Value</TableCell>
                        </TableRow>

                    </TableHead>
                    <TableBody>
                        {debitNoteData.batches?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} sx={{ textAlign: 'center', border: (theme) => `1px solid ${theme.palette.grey[100]}` }}>
                                    No Available Details.
                                </TableCell>
                            </TableRow>
                        ) : (
                            debitNoteData.batches.map((batch: any, batchIndex: number) =>
                                batch.rolls.map((roll: any, rollIndex: number) => {
                                    const totalRows = debitNoteData.batches.reduce((acc: number, batch: any) => acc + batch.rolls.length, 0);

                                    return (
                                        <TableRow key={`${batchIndex}-${rollIndex}`}>
                                            {batchIndex === 0 && rollIndex === 0 && (
                                                <>
                                                    <TableCell rowSpan={totalRows} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>
                                                        {materialData.delivery_date}
                                                    </TableCell>
                                                    <TableCell rowSpan={totalRows} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>
                                                        <Box sx={{ display: 'flex', flexDirection: 'row' }}>
                                                            {materialData.ritz_code}
                                                            <Tooltip
                                                                arrow
                                                                title={
                                                                    <Box>
                                                                        {materialData.material?.headers?.map((header: any, headerIndex: number) => (
                                                                            <Typography key={headerIndex}>{header.label} : {materialData.material?.attributes?.[header.value]}</Typography>
                                                                        ))}
                                                                    </Box>
                                                                }
                                                            >
                                                                <InfoIcon fontSize="small" sx={{ opacity: '60%' }} />
                                                            </Tooltip>
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell rowSpan={totalRows} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>
                                                        {materialData.color}
                                                    </TableCell>
                                                </>
                                            )}
                                            {batchIndex === 0 && rollIndex === 0 && (
                                                <TableCell rowSpan={totalRows} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>
                                                    <Link sx={{ cursor: 'pointer' }} href={createdGrnDetailsPageURL(14)} target="_blank">
                                                    {debitNoteData.pack_list_name}
                                                    </Link>
                                                </TableCell>
                                            )}
                                            {rollIndex === 0 && (
                                                <TableCell rowSpan={batch.rolls.length} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>
                                                    {batch.batch_name}
                                                </TableCell>
                                            )}
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>
                                                {roll.pack_number}
                                            </TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>
                                                {roll.quantity} {roll.quantity_units}
                                            </TableCell>
                                            {batchIndex === 0 && rollIndex === 0 && (
                                                <>
                                                    <TableCell rowSpan={totalRows} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>{debitNoteData.unit_price}</TableCell>
                                                    <TableCell rowSpan={totalRows} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>{debitNoteData.total_price}</TableCell>
                                                </>
                                            )}
                                        </TableRow>
                                    );
                                })
                            )
                        )}
                    </TableBody>
                </Table>
            </>}
        </>
    );
};

export default DebitNote;
